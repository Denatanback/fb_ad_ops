import Link from "next/link";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { formatDateTime, formatOptionalText } from "@/lib/formatters";
import { requireRole } from "@/server/auth/session";
import { getGoogleDriveAdminStatus } from "@/server/integrations/google-drive/service";

type GoogleDriveAdminPageProps = {
  searchParams?: {
    status?: string;
    reason?: string;
  };
};

function translateGoogleDriveReason(reason: string | undefined) {
  if (!reason) {
    return "Не удалось завершить настройку Google Drive.";
  }

  if (reason.startsWith("Google OAuth error:")) {
    return `Ошибка Google OAuth: ${reason.replace("Google OAuth error:", "").trim()}`;
  }

  const translations: Record<string, string> = {
    "Google OAuth is not configured.": "Google OAuth не настроен.",
    "AUTH_SECRET is required for Google Drive OAuth state handling.": "Для Google OAuth нужен `AUTH_SECRET`.",
    "Google token exchange failed.": "Не удалось обменять authorization code на токен Google.",
    "Google user info request failed.": "Не удалось получить данные Google-аккаунта.",
    "Google Drive is not connected.": "Google Drive еще не подключен.",
    "Google Drive refresh token is missing. Reconnect the integration.":
      "Не найден refresh token Google Drive. Переподключите интеграцию.",
    "Google Drive upload failed.": "Не удалось загрузить файл в Google Drive.",
    "Недействительный Google OAuth state.": "Недействительный Google OAuth state."
  };

  return translations[reason] ?? reason;
}

function getFlashMessage(status: string | undefined, reason: string | undefined) {
  if (status === "connected") {
    return {
      tone: "success" as const,
      message: "Google Drive подключен. Серверная загрузка готова к использованию."
    };
  }

  if (status === "error") {
    return {
      tone: "error" as const,
      message: translateGoogleDriveReason(reason)
    };
  }

  return null;
}

export default async function GoogleDriveAdminPage({ searchParams }: GoogleDriveAdminPageProps) {
  await requireRole("admin");

  const status = await getGoogleDriveAdminStatus();
  const flashMessage = getFlashMessage(searchParams?.status, searchParams?.reason);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Настройки"
        title="Google Drive"
        description="OAuth-подключение и статус хранилища для workflow с упором на превью и внешние ссылки."
      />

      <SettingsSectionNav activeHref="/admin/google-drive" isAdmin />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">OAuth</span>
          <strong className="summary-stat__value">{status.config.oauthConfigured ? "Готов" : "Не настроен"}</strong>
          <span className="summary-stat__hint">Нужны `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` и корректный redirect URI</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Аккаунт</span>
          <strong className="summary-stat__value">{status.connected ? "Подключен" : "Нет"}</strong>
          <span className="summary-stat__hint">
            {status.integration?.googleAccountEmail
              ? status.integration.googleAccountEmail
              : "Подключите один админский Google-аккаунт для загрузок"}
          </span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Папка</span>
          <strong className="summary-stat__value">{status.config.folderConfigured ? "Задана" : "Не задана"}</strong>
          <span className="summary-stat__hint">
            {status.config.folderId ? `Folder ID: ${status.config.folderId}` : "Можно задать `GOOGLE_DRIVE_FOLDER_ID` для My Drive"}
          </span>
        </article>
      </section>

      <section className="list-layout">
        <SectionCard title="Статус подключения" description="Текущее состояние OAuth и связанного аккаунта.">
          <div className="stack">
            <div className="details-grid">
              <div>
                <dt>Состояние</dt>
                <dd>{status.connected ? "Подключено" : "Подключение еще не выполнено"}</dd>
              </div>
              <div>
                <dt>Google-аккаунт</dt>
                <dd>{formatOptionalText(status.integration?.googleAccountEmail, "Еще не подключен")}</dd>
              </div>
              <div>
                <dt>Имя аккаунта</dt>
                <dd>{formatOptionalText(status.integration?.googleAccountName, "Не получено")}</dd>
              </div>
              <div>
                <dt>Подключено</dt>
                <dd>{formatDateTime(status.integration?.connectedAt)}</dd>
              </div>
              <div>
                <dt>Целевая папка</dt>
                <dd>
                  {status.integration?.driveFolderName
                    ? `${status.integration.driveFolderName} (${status.integration.driveFolderId})`
                    : formatOptionalText(status.config.folderId, "Folder ID не задан")}
                </dd>
              </div>
              <div>
                <dt>Последняя проверка</dt>
                <dd>{formatDateTime(status.integration?.lastValidatedAt)}</dd>
              </div>
            </div>

            {status.integration?.lastErrorMessage ? (
              <div className="flash-message flash-message--error">{translateGoogleDriveReason(status.integration.lastErrorMessage)}</div>
            ) : null}

            <div className="hero-actions">
              <Link
                className={`button ${status.config.oauthConfigured ? "button--primary" : "button--secondary"}`}
                href={status.config.oauthConfigured ? "/api/integrations/google-drive/connect" : "/admin/google-drive"}
              >
                {status.connected ? "Переподключить Google Drive" : "Подключить Google Drive"}
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Политика хранения" description="Оригиналы храним во внешнем хранилище, в app — только ссылки и метаданные.">
          <ul className="signal-list">
            <li>
              <div className="item-title">
                <span>Оригиналы в Drive</span>
              </div>
              <span className="item-copy">Полные исходники не должны становиться стандартным хранилищем app server.</span>
            </li>
            <li>
              <div className="item-title">
                <span>В creative сохраняются ссылки</span>
              </div>
              <span className="item-copy">Сохраняются `source_url`, `drive_file_id`, `web_view_link` и preview/thumbnail-ссылки.</span>
            </li>
            <li>
              <div className="item-title">
                <span>Загрузка идет через сервер</span>
              </div>
              <span className="item-copy">Серверный upload service отвечает за безопасную загрузку в выбранную папку My Drive.</span>
            </li>
          </ul>
        </SectionCard>
      </section>

      <SectionCard title="Что проверить в Google Cloud" description="Короткий чеклист для рабочего подключения.">
        <ul className="signal-list">
          <li>
            <div className="item-title">
              <span>OAuth client</span>
            </div>
            <span className="item-copy">Создайте клиент типа `Web application` и внесите credentials в env.</span>
          </li>
          <li>
            <div className="item-title">
              <span>Redirect URI</span>
            </div>
            <span className="item-copy">
              Разрешенный адрес: <span className="mono">{status.config.redirectUri || "APP_BASE_URL + /api/integrations/google-drive/callback"}</span>
            </span>
          </li>
          <li>
            <div className="item-title">
              <span>Папка в My Drive</span>
            </div>
            <span className="item-copy">При необходимости задайте `GOOGLE_DRIVE_FOLDER_ID` для целевой папки загрузок.</span>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
