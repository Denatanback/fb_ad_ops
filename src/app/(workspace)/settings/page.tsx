import Link from "next/link";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { requireAuthSession } from "@/server/auth/session";
import { getImportUploadsConfiguration } from "@/server/imports/storage";
import { ResetDataButton } from "./reset-button";

export default async function SettingsPage() {
  const session = await requireAuthSession();
  const uploadsConfiguration = getImportUploadsConfiguration();
  const isAdmin = session.user.role === "admin";

  const adminLinks = [
    { href: "/admin/users", label: "Пользователи", hint: "Роли и доступ для команды" },
    { href: "/admin/notifications", label: "Телеграм", hint: "Digest queue и маршрутизация" },
    { href: "/admin/analyzer-rules", label: "Правила анализатора", hint: "Пороги и guardrails" },
    { href: "/admin/target-costs", label: "Целевой CPA", hint: "Источник правды для метрик" },
    { href: "/admin/google-drive", label: "Google Drive", hint: "Хранилище originals" },
  ];

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Настройки"
        title="Системные параметры"
        description="Профиль, конфигурация сервиса и точки входа в admin-разделы."
      />

      <SettingsSectionNav activeHref="/settings" isAdmin={isAdmin} />

      {/* Profile strip */}
      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Аккаунт</span>
          <strong className="summary-stat__value">{session.user.email}</strong>
          <span className="summary-stat__hint">{isAdmin ? "Администратор" : "Участник команды"}</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Upload API</span>
          <strong className="summary-stat__value mono">/api/imports/upload</strong>
          <span className="summary-stat__hint">Точка входа для внешнего CSV uploader</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Storage</span>
          <strong className="summary-stat__value mono">{uploadsConfiguration.uploadsRoot}</strong>
          <span className="summary-stat__hint">Локальная папка для import storage</span>
        </article>
      </section>

      <div className="settings-layout">
        {/* Left column */}
        <div className="settings-layout__main">
          <SectionCard title="Профиль" description="Текущее состояние аккаунта и workspace.">
            <dl className="settings-dl">
              <div className="settings-dl__row">
                <dt>Email</dt>
                <dd>{session.user.email}</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Роль</dt>
                <dd>{isAdmin ? "Администратор" : "Участник команды"}</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Язык</dt>
                <dd>Русский — системные коды не переводятся</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Workspace</dt>
                <dd>Единый внутренний контур, single-tenant</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="CSV Uploader" description="Внешний скрипт загружает Meta CSV в тот же pipeline, что и ручной импорт.">
            <dl className="settings-dl">
              <div className="settings-dl__row">
                <dt>Route</dt>
                <dd className="mono">POST /api/imports/upload</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Авторизация</dt>
                <dd className="mono">INTERNAL_IMPORT_API_KEY</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Pipeline</dt>
                <dd>Upload → ImportRun → parsing → normalization → analyzer → alerts</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Storage root</dt>
                <dd className="mono">{uploadsConfiguration.uploadsRoot}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="settings-layout__side">
          {isAdmin ? (
            <SectionCard title="Admin-разделы">
              <nav className="settings-links">
                {adminLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="settings-link">
                    <span className="settings-link__label">{link.label}</span>
                    <span className="settings-link__hint">{link.hint}</span>
                  </Link>
                ))}
              </nav>
            </SectionCard>
          ) : null}

          <SectionCard title="Гид" description="Краткая памятка по сущностям, статусам и workflow.">
            <div style={{ paddingTop: 4 }}>
              <Link className="button button--secondary button--compact" href="/guide">
                Открыть гид
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Danger zone — admin only */}
      {isAdmin && (
        <SectionCard title="Danger Zone" description="Необратимые операции с накопленной историей импортов.">
          <div className="danger-zone-row">
            <div className="danger-zone-row__text">
              <strong>Очистка статистики и CSV</strong>
              <p>
                Удаляет все CSV-файлы и всю накопленную статистику: метрики, снэпшоты, дельты и логи оповещений.
                Настройки, пользователи и библиотека креативов остаются нетронутыми.
              </p>
            </div>
            <ResetDataButton />
          </div>
        </SectionCard>
      )}
    </div>
  );
}
