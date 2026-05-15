import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { rerunImportAnalyzerAction } from "@/app/(workspace)/imports/[importRunId]/actions";
import { formatDateTime, formatOptionalText } from "@/lib/formatters";
import { requireAuthSession } from "@/server/auth/session";
import { getImportRunDetails } from "@/server/services/import-runs";

type ImportDetailsPageProps = {
  params: {
    importRunId: string;
  };
  searchParams?: {
    status?: string;
    reason?: string;
  };
};

const importRunStatusLabels: Record<string, string> = {
  RECEIVED: "Получен",
  PARSING: "Парсинг",
  NORMALIZING: "Нормализация",
  ANALYZING: "Анализ",
  COMPLETED: "Готово",
  FAILED: "Ошибка"
};

const evaluationModeLabels: Record<string, string> = {
  RESULTS_AWARE: "results-aware",
  PROXY_MODE: "proxy"
};

const confidenceLabels: Record<string, string> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high"
};

const alertKindLabels: Record<string, string> = {
  CONVERSION_ARRIVAL: "Конверсии",
  SPEND_PACING_RISK: "Проблема по расходу",
  WEAK_PERFORMANCE: "Нужна проверка",
  OPPORTUNITY_REVIEW: "Сильный сигнал",
  IMPORT_ERROR_TECH: "Техошибка"
};

const severityLabels: Record<string, string> = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical"
};

const deliveryStatusLabels: Record<string, string> = {
  PENDING: "ожидает",
  SENT: "отправлено",
  FAILED: "ошибка",
  SKIPPED: "пропущено"
};

const digestStatusLabels: Record<string, string> = {
  QUEUED: "РІ РѕС‡РµСЂРµРґРё",
  BUILT: "СЃРѕР±СЂР°РЅ",
  SENT: "РѕС‚РїСЂР°РІР»РµРЅ",
  FAILED: "РѕС€РёР±РєР°",
  DEFERRED: "РѕС‚Р»РѕР¶РµРЅ"
};

function getFlashMessage(status: string | undefined, reason: string | undefined) {
  if (status === "uploaded") {
    return {
      tone: "success" as const,
      message: "CSV-файл загружен, обработка уже запущена."
    };
  }

  if (status === "duplicate") {
    return {
      tone: "error" as const,
      message: reason || "Этот CSV уже был импортирован ранее по совпадающему file hash. Повторный import не запускался."
    };
  }

  if (status === "rerun") {
    return {
      tone: "success" as const,
      message: "Analyzer повторно запущен."
    };
  }

  if (status === "error") {
    return {
      tone: "error" as const,
      message: reason || "Не удалось выполнить действие."
    };
  }

  return null;
}

function formatByteSize(value: number | null) {
  if (!value) {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function readSummaryNumber(details: unknown, key: string) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }

  const value = (details as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function readRecentIssues(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  const issues = (details as Record<string, unknown>).recentIssues;

  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.flatMap((issue) => {
    if (!issue || typeof issue !== "object" || Array.isArray(issue)) {
      return [];
    }

    const rowNumber = (issue as Record<string, unknown>).rowNumber;
    const message = (issue as Record<string, unknown>).message;

    if (typeof rowNumber !== "number" || typeof message !== "string") {
      return [];
    }

    return [{ rowNumber, message }];
  });
}

function readAnalyzerSummary(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }

  const analyzer = (details as Record<string, unknown>).analyzer;

  if (!analyzer || typeof analyzer !== "object" || Array.isArray(analyzer)) {
    return null;
  }

  return analyzer as Record<string, unknown>;
}

function readNormalizationWarnings(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const naming = (payload as Record<string, unknown>).naming;

  if (!naming || typeof naming !== "object" || Array.isArray(naming)) {
    return [];
  }

  const warnings = (naming as Record<string, unknown>).warnings;

  if (!Array.isArray(warnings)) {
    return [];
  }

  return warnings.filter((warning): warning is string => typeof warning === "string");
}

function formatHistoricalDateRange(start: Date | null, end: Date | null) {
  if (!start && !end) {
    return "Исторических дат пока нет.";
  }

  if (start && end) {
    return `${formatDateTime(start)} -> ${formatDateTime(end)}`;
  }

  return formatDateTime(start ?? end);
}

export default async function ImportRunDetailsPage({ params, searchParams }: ImportDetailsPageProps) {
  const session = await requireAuthSession();
  const importRun = await getImportRunDetails(params.importRunId);

  if (!importRun) {
    notFound();
  }

  const flashMessage = getFlashMessage(searchParams?.status, searchParams?.reason);
  const totalRows = readSummaryNumber(importRun.errorDetails, "totalRows") ?? importRun.rawRowsCount;
  const parsedRows = readSummaryNumber(importRun.errorDetails, "parsedRows") ?? importRun.normalizedRowsCount;
  const failedRows =
    readSummaryNumber(importRun.errorDetails, "failedRows") ??
    Math.max(importRun.rawRowsCount - importRun.normalizedRowsCount, 0);
  const warningRows = readSummaryNumber(importRun.errorDetails, "warningRows") ?? 0;
  const recentIssues = readRecentIssues(importRun.errorDetails);
  const analyzerSummary = readAnalyzerSummary(importRun.errorDetails);
  const rerunAction = rerunImportAnalyzerAction.bind(null, importRun.id);
  const isAdmin = session.user.role === "admin";
  const topicSummary = importRun.diagnostics.deliveryRouteCounts.map((deliveryRoute) => {
    const matchingAlerts = importRun.diagnostics.alertRouteCounts.find((alertRoute) => alertRoute.topicKey === deliveryRoute.topicKey);

    return {
      alerts: matchingAlerts?.count ?? 0,
      ...deliveryRoute
    };
  });

  for (const alertRoute of importRun.diagnostics.alertRouteCounts) {
    if (!topicSummary.some((summary) => summary.topicKey === alertRoute.topicKey)) {
      topicSummary.push({
        topicKey: alertRoute.topicKey,
        alerts: alertRoute.count,
        total: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        pending: 0
      });
    }
  }

  topicSummary.sort((left, right) => (left.topicKey ?? "").localeCompare(right.topicKey ?? ""));

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Import Run"
        title={importRun.sourceFilename}
        description="Детали загрузки: parsing и normalization summary, первый проход analyzer, alert routing и статусы Telegram delivery."
      />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      <div className="hero-actions">
        <Link className="button button--secondary" href="/imports">
          Назад к импортам
        </Link>
        {isAdmin ? (
          <form action={rerunAction}>
            <button className="button button--primary" type="submit">
              Перезапустить analyzer
            </button>
          </form>
        ) : null}
      </div>

      <section className="stats-inline">
        <article className="stat-card">
          <span className="stat-label">Статус</span>
          <strong className="stat-value stat-value--compact">
            {importRunStatusLabels[importRun.processingStatus] ?? importRun.processingStatus}
          </strong>
          <p className="stat-copy">{importRun.errorSummary ?? "Импорт завершён без дополнительного summary-сообщения."}</p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Строки</span>
          <strong className="stat-value stat-value--compact">{totalRows}</strong>
          <p className="stat-copy">
            Нормализовано: {parsedRows} · Ошибки: {failedRows} · Warning rows: {warningRows}
          </p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Analyzer</span>
          <strong className="stat-value stat-value--compact">{importRun._count.analyzerResults}</strong>
          <p className="stat-copy">
            Группы: {importRun._count.comparisonGroups} · Alerts: {importRun._count.alertEvents}
          </p>
        </article>
        <article className="stat-card">
          <span className="stat-label">Telegram</span>
          <strong className="stat-value stat-value--compact">{importRun.diagnostics.alertsWithSuccessfulDeliveryCount}</strong>
          <p className="stat-copy">
            Отправлено: {importRun.diagnostics.deliveryStatusCounts.SENT} · Ошибки: {importRun.diagnostics.deliveryStatusCounts.FAILED} ·
            Пропущено: {importRun.diagnostics.deliveryStatusCounts.SKIPPED}
          </p>
        </article>
      </section>

      <section className="list-layout">
        <SectionCard title="Метаданные файла" description="Минимальная отладочная информация по загруженному CSV.">
          <dl className="details-grid">
            <div>
              <dt>Имя файла</dt>
              <dd>{importRun.sourceFilename}</dd>
            </div>
            <div>
              <dt>Storage key</dt>
              <dd className="mono">{formatOptionalText(importRun.sourceStorageKey)}</dd>
            </div>
            <div>
              <dt>Размер</dt>
              <dd>{formatByteSize(importRun.sourceByteSize)}</dd>
            </div>
            <div>
              <dt>Хэш файла</dt>
              <dd className="mono">{formatOptionalText(importRun.sourceFileHash)}</dd>
            </div>
            <div>
              <dt>Format key</dt>
              <dd className="mono">{formatOptionalText(importRun.sourceFormatKey)}</dd>
            </div>
            <div>
              <dt>Reporting window</dt>
              <dd>
                {importRun.reportingWindowStart || importRun.reportingWindowEnd
                  ? `${formatDateTime(importRun.reportingWindowStart)} -> ${formatDateTime(importRun.reportingWindowEnd)}`
                  : "-"}
              </dd>
            </div>
            <div>
              <dt>Получен</dt>
              <dd>{formatDateTime(importRun.receivedAt)}</dd>
            </div>
            <div>
              <dt>Старт обработки</dt>
              <dd>{formatDateTime(importRun.processingStartedAt)}</dd>
            </div>
            <div>
              <dt>Старт analyzer</dt>
              <dd>{formatDateTime(importRun.analyzerStartedAt)}</dd>
            </div>
            <div>
              <dt>Завершение</dt>
              <dd>{formatDateTime(importRun.processingFinishedAt)}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Сводка parsing/normalization"
          description="Raw rows и normalized rows сохраняются отдельно, чтобы import можно было разбирать и переигрывать."
        >
          {recentIssues.length ? (
            <ul className="signal-list">
              {recentIssues.map((issue) => (
                <li key={`${issue.rowNumber}-${issue.message}`}>
                  <div className="item-title">
                    <span>Строка {issue.rowNumber}</span>
                  </div>
                  <span className="item-copy">{issue.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-inline">
              <h3>Критических issues не найдено</h3>
              <p>Если часть строк будет распознана неоднозначно, они появятся здесь вместе с parsing или normalization summary.</p>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="list-layout">
        <SectionCard
          title="Operational diagnostics"
          description="Короткий разбор того, что реально произошло с analyzer, alert events и Telegram delivery после этого import run."
        >
          <div className="stats-inline">
            <article className="stat-card">
              <span className="stat-label">Сущности в analyzer</span>
              <strong className="stat-value stat-value--compact">{importRun._count.analyzerResults}</strong>
              <p className="stat-copy">Столько analyzer results было сохранено по нормализованным строкам.</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Alert events</span>
              <strong className="stat-value stat-value--compact">{importRun._count.alertEvents}</strong>
              <p className="stat-copy">Созданные сигналоподобные события для этого import run.</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Deliveries created</span>
              <strong className="stat-value stat-value--compact">{importRun._count.notificationDeliveries}</strong>
              <p className="stat-copy">Сохранённые transport attempts по текущему run.</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Без успешной отправки</span>
              <strong className="stat-value stat-value--compact">{importRun.diagnostics.alertsWithoutSuccessfulDeliveryCount}</strong>
              <p className="stat-copy">
                Alert events без delivery со статусом <span className="mono">SENT</span>.
              </p>
            </article>
          </div>

          <ul className="signal-list">
            <li>
              <div className="item-title">
                <span>Analyzer stage</span>
              </div>
              <span className="item-copy">{String(analyzerSummary?.stage ?? "not_reported")}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Alerts без delivery record</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.alertsWithoutDeliveryCount}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Alerts с успешной отправкой</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.alertsWithSuccessfulDeliveryCount}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Delivery status counters</span>
              </div>
              <span className="item-copy">
                sent={importRun.diagnostics.deliveryStatusCounts.SENT} · failed={importRun.diagnostics.deliveryStatusCounts.FAILED} ·
                skipped={importRun.diagnostics.deliveryStatusCounts.SKIPPED} · pending={importRun.diagnostics.deliveryStatusCounts.PENDING}
              </span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Historical base"
          description="Минимальная база для следующего history-aware шага. Текущий analyzer всё ещё считается run-by-run, но импортированные строки уже живут накопительно."
        >
          <ul className="signal-list">
            <li>
              <div className="item-title">
                <span>Completed import runs</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.historicalFoundation.completedRunsCount}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Completed runs до текущего</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.historicalFoundation.previousCompletedRunsCount}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Normalized rows across completed runs</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.historicalFoundation.normalizedRowsAcrossCompletedRuns}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Normalized rows до текущего run</span>
              </div>
              <span className="item-copy">{importRun.diagnostics.historicalFoundation.normalizedRowsBeforeCurrentRun}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Диапазон reportDate</span>
              </div>
              <span className="item-copy">
                {formatHistoricalDateRange(
                  importRun.diagnostics.historicalFoundation.earliestReportDate,
                  importRun.diagnostics.historicalFoundation.latestReportDate
                )}
              </span>
            </li>
          </ul>
        </SectionCard>
      </section>

      <section className="list-layout">
        <SectionCard title="Route breakdown" description="Сколько alert events и delivery attempts попало в каждый topic route.">
          {topicSummary.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Alerts</th>
                    <th>Deliveries</th>
                    <th>Sent</th>
                    <th>Failed</th>
                    <th>Skipped</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {topicSummary.map((summary) => (
                    <tr key={summary.topicKey ?? "no-topic"}>
                      <td className="mono">{summary.topicKey ?? "-"}</td>
                      <td>{summary.alerts}</td>
                      <td>{summary.total}</td>
                      <td>{summary.sent}</td>
                      <td>{summary.failed}</td>
                      <td>{summary.skipped}</td>
                      <td>{summary.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Route breakdown пока пустой</h3>
              <p>Появится, когда для этого import run будут созданы alerts и delivery records.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Skip / fail reasons"
          description="Лучший честный diagnostics pass по уже сохранённым delivery error messages, без нового suppression engine."
        >
          {importRun.diagnostics.deliveryIssueCounts.length ? (
            <ul className="signal-list">
              {importRun.diagnostics.deliveryIssueCounts.map((issue) => (
                <li key={`${issue.deliveryStatus}-${issue.errorMessage}`}>
                  <div className="item-title">
                    <span>{deliveryStatusLabels[issue.deliveryStatus] ?? issue.deliveryStatus}</span>
                    <span className="pill pill--warning">{issue.count}</span>
                  </div>
                  <span className="item-copy">{issue.errorMessage}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-inline">
              <h3>Явных skip/fail reasons пока нет</h3>
              <p>Если delivery records будут сохранены с ошибкой или skip reason, они появятся здесь.</p>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="list-layout">
        <SectionCard
          title="Analyzer summary"
          description="Первый проход уже строит comparison groups, сохраняет результаты и пишет alert/delivery tracking."
        >
          <ul className="signal-list">
            <li>
              <div className="item-title">
                <span>Стадия</span>
              </div>
              <span className="item-copy">{String(analyzerSummary?.stage ?? "not_reported")}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Группы сравнения</span>
              </div>
              <span className="item-copy">{String(analyzerSummary?.comparisonGroupsCount ?? importRun._count.comparisonGroups)}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Analyzer results</span>
              </div>
              <span className="item-copy">{String(analyzerSummary?.analyzerResultsCount ?? importRun._count.analyzerResults)}</span>
            </li>
            <li>
              <div className="item-title">
                <span>Alert events</span>
              </div>
              <span className="item-copy">{String(analyzerSummary?.alertEventsCount ?? importRun._count.alertEvents)}</span>
            </li>
          </ul>
        </SectionCard>

        <SectionCard title="Reason codes" description="Какие route/reason codes реально появились в alert events этого run.">
          {importRun.diagnostics.alertReasonCounts.length ? (
            <ul className="signal-list">
              {importRun.diagnostics.alertReasonCounts.map((reason) => (
                <li key={reason.topicKey ?? "no-reason"}>
                  <div className="item-title">
                    <span className="mono">{reason.topicKey ?? "-"}</span>
                  </div>
                  <span className="item-copy">{reason.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-inline">
              <h3>Reason codes пока не зафиксированы</h3>
              <p>Когда analyzer создаст alerts с reason codes, они появятся здесь.</p>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="list-layout">
        <SectionCard title="Comparison groups" description="Группы аналогичных кампаний по approach и naming/global group.">
          {importRun.comparisonGroups.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Группа</th>
                    <th>Rows</th>
                    <th>Rows с results</th>
                    <th>Mode</th>
                    <th>Confidence</th>
                    <th>Maturity</th>
                  </tr>
                </thead>
                <tbody>
                  {importRun.comparisonGroups.map((group) => (
                    <tr key={group.id}>
                      <td>
                        <div className="table-primary">
                          <strong>{group.groupLabel}</strong>
                          <span className="table-subcopy mono">{group.groupKey}</span>
                        </div>
                      </td>
                      <td>{group.rowCount}</td>
                      <td>{group.resultRowCount}</td>
                      <td>{evaluationModeLabels[group.evaluationMode] ?? group.evaluationMode}</td>
                      <td>{group.confidenceLevel ? confidenceLabels[group.confidenceLevel] ?? group.confidenceLevel : "-"}</td>
                      <td>{group.maturityReached ? "да" : "нет"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Comparison groups пока нет</h3>
              <p>Analyzer groups появятся после успешного прохода по нормализованным строкам.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Analyzer results"
          description="Компактный preview по campaign, ad set и creative subject-уровням, рассчитанным для этого import run."
        >
          {importRun.analyzerResults.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Группа</th>
                    <th>Rank</th>
                    <th>Score</th>
                    <th>Mode</th>
                    <th>Confidence</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {importRun.analyzerResults.map((result) => (
                    <tr key={result.id}>
                      <td>{result.subjectLabel}</td>
                      <td>{result.comparisonGroup.groupLabel}</td>
                      <td>{result.rank ?? "-"}</td>
                      <td>{result.score?.toString() ?? "-"}</td>
                      <td>{evaluationModeLabels[result.evaluationMode] ?? result.evaluationMode}</td>
                      <td>{confidenceLabels[result.confidenceLevel] ?? result.confidenceLevel}</td>
                      <td>{result.summary ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Analyzer results пока нет</h3>
              <p>Когда analyzer завершится успешно, здесь появятся сохранённые subject-результаты с mode, confidence и ranking summary.</p>
            </div>
          )}
        </SectionCard>
      </section>

      <section className="list-layout">
        <SectionCard title="Alert events" description="Сохранённые сигналы analyzer с route, reason code и delivery outcome.">
          {importRun.alertEvents.length ? (
            <ul className="signal-list">
              {importRun.alertEvents.map((alertEvent) => {
                const latestDelivery = alertEvent.notificationDeliveries[0];

                return (
                  <li key={alertEvent.id}>
                    <div className="item-title">
                      <span>{alertEvent.title}</span>
                      <span className="pill pill--ready">{alertKindLabels[alertEvent.kind] ?? alertEvent.kind}</span>
                    </div>
                    <span className="item-copy">
                      {alertEvent.summary} Severity: {severityLabels[alertEvent.severity] ?? alertEvent.severity}. Topic:{" "}
                      <span className="mono">{alertEvent.destinationTopicKey ?? "-"}</span>. Reason:{" "}
                      <span className="mono">{alertEvent.reasonCode ?? "-"}</span>.
                    </span>
                    <span className="item-copy">
                      Delivery:{" "}
                      {latestDelivery
                        ? `${deliveryStatusLabels[latestDelivery.deliveryStatus] ?? latestDelivery.deliveryStatus}${
                            latestDelivery.errorMessage ? ` · ${latestDelivery.errorMessage}` : ""
                          }`
                        : "delivery record пока не создан"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-inline">
              <h3>Alert events пока нет</h3>
              <p>Когда analyzer найдёт conversion, needs_review или strong_signals кейсы, они будут сохранены здесь.</p>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Telegram delivery tracking"
          description="Каждая попытка отправки живёт отдельно от самого alert, поэтому transport layer можно проверить без потери истории."
        >
          {importRun.notificationDeliveries.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Статус</th>
                    <th>Topic</th>
                    <th>Thread</th>
                    <th>Provider ID</th>
                    <th>Ошибка</th>
                    <th>Создано</th>
                  </tr>
                </thead>
                <tbody>
                  {importRun.notificationDeliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{deliveryStatusLabels[delivery.deliveryStatus] ?? delivery.deliveryStatus}</td>
                      <td className="mono">{delivery.destinationTopicKey ?? "-"}</td>
                      <td>{delivery.telegramThreadId ?? "-"}</td>
                      <td>{delivery.providerMessageId ?? "-"}</td>
                      <td>{delivery.errorMessage ?? "-"}</td>
                      <td>{formatDateTime(delivery.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Telegram deliveries пока нет</h3>
              <p>Даже skipped и failed попытки будут попадать в tracking, когда analyzer создаст сигналы.</p>
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard title="Raw row errors" description="Строки, которые не дошли до normalized layer из-за parse или normalization проблем.">
        {importRun.rawRows.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Строка</th>
                  <th>Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {importRun.rawRows.map((rawRow) => (
                  <tr key={rawRow.id}>
                    <td>{rawRow.rowNumber}</td>
                    <td>{rawRow.parseError}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Ошибок raw parsing нет</h3>
            <p>Все строки как минимум прошли базовый разбор и были сохранены для дальнейшей работы pipeline.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Normalized rows preview"
        description="Первые нормализованные строки для быстрой проверки naming extraction и analyzer-ready полей."
      >
        {importRun.normalizedRows.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Строка</th>
                  <th>Дата</th>
                  <th>Campaign</th>
                  <th>Ad set</th>
                  <th>Ad</th>
                  <th>Group key</th>
                  <th>Warnings</th>
                </tr>
              </thead>
              <tbody>
                {importRun.normalizedRows.map((row) => {
                  const warnings = readNormalizationWarnings(row.normalizedPayload);

                  return (
                    <tr key={row.id}>
                      <td>{row.sourceRowNumber ?? "-"}</td>
                      <td>{formatDateTime(row.reportDate)}</td>
                      <td>{row.campaignName ?? "-"}</td>
                      <td>{row.adsetName ?? "-"}</td>
                      <td>{row.adName ?? "-"}</td>
                      <td className="mono">{row.comparisonGroupKey ?? row.globalGroupKey ?? "-"}</td>
                      <td>{warnings.length ? warnings.join(" ") : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Нормализованных строк пока нет</h3>
            <p>Если импорт завершился ошибкой до normalizing stage, preview появится после корректной CSV-структуры.</p>
          </div>
        )}
      </SectionCard>

      <section className="list-layout">
        <SectionCard
          title="Digest queue diagnostics"
          description="РџСЂРѕР·СЂР°С‡РЅРѕСЃС‚СЊ РїРѕ digest-based Telegram РґРѕСЃС‚Р°РІРєРµ РґР»СЏ СЌС‚РѕРіРѕ import run."
        >
          <div className="stats-inline">
            <article className="stat-card">
              <span className="stat-label">Digest-linked alerts</span>
              <strong className="stat-value stat-value--compact">{importRun.diagnostics.alertsRoutedToDigestsCount}</strong>
              <p className="stat-copy">Alert events, РєРѕС‚РѕСЂС‹Рµ РґР»СЏ normal topics СѓС€Р»Рё РІ queued digest path.</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Digest sent coverage</span>
              <strong className="stat-value stat-value--compact">{importRun.diagnostics.alertsDeliveredViaDigestCount}</strong>
              <p className="stat-copy">Alert events СЌС‚РѕРіРѕ run, already covered РѕС‚РїСЂР°РІР»РµРЅРЅС‹Рј digest.</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Digest windows</span>
              <strong className="stat-value stat-value--compact">{importRun.diagnostics.recentDigests.length}</strong>
              <p className="stat-copy">
                queued={importRun.diagnostics.digestStatusCounts.QUEUED} В· built={importRun.diagnostics.digestStatusCounts.BUILT} В·
                sent={importRun.diagnostics.digestStatusCounts.SENT}
              </p>
            </article>
          </div>

          {importRun.diagnostics.recentDigests.length ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Window</th>
                    <th>РЎС‚Р°С‚СѓСЃ</th>
                    <th>Alerts</th>
                    <th>Runs</th>
                    <th>Thread</th>
                    <th>РћС€РёР±РєР°</th>
                  </tr>
                </thead>
                <tbody>
                  {importRun.diagnostics.recentDigests.map((digest) => (
                    <tr key={digest.id}>
                      <td className="mono">{digest.topicKey}</td>
                      <td>
                        {formatDateTime(digest.windowStart)} {"->"} {formatDateTime(digest.windowEnd)}
                      </td>
                      <td>{digestStatusLabels[digest.status] ?? digest.status}</td>
                      <td>
                        {digest.importAlertCount} / {digest.alertCount}
                      </td>
                      <td>{digest.importRunCount}</td>
                      <td>{digest.telegramThreadId ?? "-"}</td>
                      <td>{formatOptionalText(digest.errorMessage)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-inline">
              <h3>Digest windows РїРѕРєР° РЅРµС‚</h3>
              <p>Р”Р»СЏ СЌС‚РѕРіРѕ import run РµС‰С‘ РЅРµС‚ digest-based alerts РёР»Рё 30-РјРёРЅСѓС‚РЅРѕРµ РѕРєРЅРѕ РµС‰С‘ РЅРµ РѕР±СЂР°Р±РѕС‚Р°РЅРѕ.</p>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
