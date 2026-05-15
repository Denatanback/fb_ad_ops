import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import {
  sendTelegramDigestsNowAction,
  sendTelegramTestAction,
  updateTelegramDigestIntervalAction,
  updateTelegramActiveTopicsAction
} from "@/app/(workspace)/admin/notifications/actions";
import { requireRole } from "@/server/auth/session";
import { listRecentTelegramDigests } from "@/server/notifications/digests";
import { getTelegramNotifierStatus } from "@/server/notifications/telegram";
import {
  getTelegramTopicDefinition,
  telegramNeedsReviewReasonDefinitions,
  telegramTopicDefinitions,
  type TelegramNeedsReviewReasonCode
} from "@/server/notifications/telegram-routing";
import {
  getAllowedTelegramDigestIntervals,
  getTelegramDigestScheduleSettings,
  getTelegramActiveTopics
} from "@/server/services/system-settings";

type NotificationsAdminPageProps = {
  searchParams?: {
    status?: string;
    reason?: string;
    reasonCode?: string;
    destination?: string;
    interval?: string;
    sent?: string;
    built?: string;
    queued?: string;
  };
};

function getFlashMessage(searchParams: NotificationsAdminPageProps["searchParams"]) {
  const status = searchParams?.status;
  const reason = searchParams?.reason;
  const destination = telegramTopicDefinitions.find((t) => t.key === searchParams?.destination);
  const destinationLabel = destination ? ` в тему «${destination.label}»` : "";
  const reasonDef = telegramNeedsReviewReasonDefinitions.find((r) => r.code === searchParams?.reasonCode);
  const reasonLabel = searchParams?.destination === "needs_review" && reasonDef ? ` Код: ${reasonDef.label}.` : "";

  if (status === "sent") return { tone: "success" as const, message: `Тест отправлен${destinationLabel}.${reasonLabel}` };
  if (status === "skipped") return {
    tone: "error" as const,
    message: reason === "disabled"
      ? "Отправка отключена. Включите TELEGRAM_ALERTS_ENABLED=true."
      : reason === "missing_topic"
        ? `Не настроен topic ID${destinationLabel}.`
        : "Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID."
  };
  if (status === "interval_updated") return { tone: "success" as const, message: `Интервал обновлён: ${searchParams?.interval ?? "30"} мин.` };
  if (status === "cycle_sent") return { tone: "success" as const, message: `Cycle запущен. Собрано: ${searchParams?.built ?? "0"}, отправлено: ${searchParams?.sent ?? "0"}, в очереди: ${searchParams?.queued ?? "0"}.` };
  if (status === "topics_updated") return { tone: "success" as const, message: "Активные темы сохранены." };
  if (status === "error") return {
    tone: "error" as const,
    message: reason === "invalid_destination"
      ? "Выберите корректную тему. Для «Нужно проверить» обязателен код причины."
      : reason || "Не удалось выполнить действие."
  };
  return null;
}

const digestStatusLabels: Record<string, string> = {
  SENT: "Отправлен",
  QUEUED: "В очереди",
  BUILT: "Собран",
  FAILED: "Ошибка",
  DEFERRED: "Отложен"
};

export default async function NotificationsAdminPage({ searchParams }: NotificationsAdminPageProps) {
  await requireRole("admin");

  const [notifierStatus, recentDigests, scheduleSettings, activeTopicsSetting] = await Promise.all([
    Promise.resolve(getTelegramNotifierStatus()),
    listRecentTelegramDigests(12),
    getTelegramDigestScheduleSettings(),
    getTelegramActiveTopics()
  ]);

  const activeTopicsArray = activeTopicsSetting ?? telegramTopicDefinitions.map((t) => t.key);
  const flashMessage = getFlashMessage(searchParams);
  const selectedDestination = telegramTopicDefinitions.find((t) => t.key === searchParams?.destination)?.key ?? "bot_test";
  const selectedReasonCode = (telegramNeedsReviewReasonDefinitions.find((r) => r.code === searchParams?.reasonCode)?.code as TelegramNeedsReviewReasonCode | undefined) ?? "mixed_signal";
  const configuredTopicCount = notifierStatus.topics.filter((t) => t.configured).length;

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Телеграм"
        title="Digest и маршрутизация"
        description="Интервал, ручной запуск digest cycle и готовность тем."
      />

      <SettingsSectionNav activeHref="/admin/notifications" isAdmin />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Отправка</span>
          <strong className="summary-stat__value">{notifierStatus.enabled ? "Включена" : "Выключена"}</strong>
          <span className="summary-stat__hint">TELEGRAM_ALERTS_ENABLED</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Конфигурация</span>
          <strong className="summary-stat__value">{notifierStatus.baseConfigured ? "Готова" : "Неполная"}</strong>
          <span className="summary-stat__hint">{notifierStatus.chatId ? `Chat: ${notifierStatus.chatId}` : "Нужен bot token и chat ID"}</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Интервал</span>
          <strong className="summary-stat__value">{scheduleSettings.digestIntervalMinutes} мин</strong>
          <span className="summary-stat__hint">
            {scheduleSettings.nextEligibleAt
              ? `Следующий: ${scheduleSettings.nextEligibleAt.toLocaleString("ru-RU")}`
              : "Можно запустить сразу"}
          </span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Темы</span>
          <strong className="summary-stat__value">{configuredTopicCount} / {notifierStatus.topics.length}</strong>
          <span className="summary-stat__hint">Настроены topic ID</span>
        </article>
      </section>

      {/* Controls row */}
      <div className="settings-layout">
        <div className="settings-layout__main">
          <SectionCard title="Управление digest">
            <div className="tg-controls">
              <form action={updateTelegramDigestIntervalAction} className="tg-controls__form">
                <label className="field__label" htmlFor="tg-interval">Интервал (мин)</label>
                <select
                  id="tg-interval"
                  name="digestIntervalMinutes"
                  className="auth-input tg-controls__select"
                  defaultValue={String(scheduleSettings.digestIntervalMinutes)}
                >
                  {getAllowedTelegramDigestIntervals().map((v) => (
                    <option key={v} value={v}>{v} мин</option>
                  ))}
                </select>
                <button className="button button--primary button--compact" type="submit">Сохранить</button>
              </form>

              <form action={sendTelegramDigestsNowAction} className="tg-controls__manual">
                <button className="button button--secondary button--compact" type="submit">
                  Запустить cycle сейчас
                </button>
              </form>
            </div>

            <dl className="settings-dl" style={{ marginTop: 16 }}>
              <div className="settings-dl__row">
                <dt>Последний cycle</dt>
                <dd>{scheduleSettings.lastCycleAt ? scheduleSettings.lastCycleAt.toLocaleString("ru-RU") : "Не запускался"}</dd>
              </div>
              <div className="settings-dl__row">
                <dt>Следующий auto-send</dt>
                <dd>{scheduleSettings.nextEligibleAt ? scheduleSettings.nextEligibleAt.toLocaleString("ru-RU") : "Сразу после первого cycle"}</dd>
              </div>
            </dl>
          </SectionCard>
        </div>

        <div className="settings-layout__side">
          <SectionCard title="Тестовая отправка" description="Один служебный сигнал в выбранную тему.">
            <form action={sendTelegramTestAction} className="compact-form">
              <div className="field">
                <label className="field__label" htmlFor="tg-dest">Тема</label>
                <select id="tg-dest" name="destination" className="auth-input" defaultValue={selectedDestination}>
                  {telegramTopicDefinitions.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="tg-reason">Код причины</label>
                <select id="tg-reason" name="needsReviewReasonCode" className="auth-input" defaultValue={selectedReasonCode}>
                  {telegramNeedsReviewReasonDefinitions.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
                <span className="field__hint">Только для темы «Нужно проверить».</span>
              </div>
              <div className="compact-form__actions">
                <button className="button button--primary button--compact" type="submit">Отправить тест</button>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>

      {/* Topics: status + activation together */}
      <SectionCard title="Темы" description="Готовность каждой темы и управление активными каналами доставки.">
        <form action={updateTelegramActiveTopicsAction} className="stack">
          <div className="tg-topics-grid">
            {notifierStatus.topics.map((topic) => (
              <label
                key={topic.key}
                className={`tg-topic-card ${!topic.configured ? "tg-topic-card--disabled" : ""}`}
              >
                <div className="tg-topic-card__head">
                  <input
                    type="checkbox"
                    name="activeTopics"
                    value={topic.key}
                    defaultChecked={activeTopicsArray.includes(topic.key)}
                    disabled={!topic.configured}
                    className="rule-row__checkbox"
                  />
                  <strong className="tg-topic-card__name">{topic.label}</strong>
                  <span className={`pill ${topic.configured ? "pill--ready" : "pill--pending"} tg-topic-card__pill`}>
                    {topic.configured ? "Готово" : "Нет ID"}
                  </span>
                </div>
                <p className="tg-topic-card__desc">{getTelegramTopicDefinition(topic.key).description}</p>
                <code className="tg-topic-card__env">{topic.envVar}</code>
              </label>
            ))}
          </div>
          <div className="compact-form__actions">
            <button className="button button--primary button--compact" type="submit">Сохранить активные темы</button>
          </div>
        </form>
      </SectionCard>

      {/* Digest history */}
      <SectionCard title="Последние digest windows" description="Endpoint: POST /api/notifications/digests/cycle · CRON_SECRET">
        {recentDigests.length ? (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Тема</th>
                  <th>Окно</th>
                  <th>Статус</th>
                  <th>Alerts</th>
                  <th>Runs</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {recentDigests.map((d) => (
                  <tr key={d.id}>
                    <td className="mono">{d.destinationTopicKey}</td>
                    <td className="table-muted" style={{ fontSize: "0.82rem" }}>
                      {d.windowStart.toLocaleString("ru-RU")} → {d.windowEnd.toLocaleString("ru-RU")}
                    </td>
                    <td>
                      <span className={`pill ${d.status === "SENT" ? "pill--ready" : d.status === "FAILED" ? "pill--stopped" : "pill--neutral"}`}>
                        {digestStatusLabels[d.status] ?? d.status}
                      </span>
                    </td>
                    <td>{d.alertCount}</td>
                    <td>{d.importRunCount}</td>
                    <td className="table-muted">{d.errorMessage ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Digest windows пока нет</h3>
            <p>Появятся после queueable alerts и первого digest cycle.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
