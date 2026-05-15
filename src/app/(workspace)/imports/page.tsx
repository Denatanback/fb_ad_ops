import Link from "next/link";
import { ImportRunStatus } from "@prisma/client";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { formatDate, formatDateTime, formatPercentValue } from "@/lib/formatters";
import { requireAuthSession } from "@/server/auth/session";
import { getAnalyzerWorkspaceSnapshot } from "@/server/services/import-runs";

type ImportsPageProps = {
  searchParams?: {
    importRunId?: string;
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

const subjectTypeLabels: Record<string, string> = {
  campaign: "Кампания",
  adset: "Адсет",
  creative: "Креатив"
};

function formatUsd(value: number | null | undefined, fallback = "—") {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

function formatReportingWindow(start: Date | null, end: Date | null) {
  if (!start && !end) return "Период не найден";
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  return formatDate(start ?? end);
}

function getImportStatusTone(status: ImportRunStatus) {
  if (status === ImportRunStatus.COMPLETED) return "pill--ready";
  if (status === ImportRunStatus.FAILED) return "pill--warning";
  return "pill--pending";
}

function getVerdictTone(verdict: string) {
  if (["Есть результат", "Сильный сигнал", "Нормально"].includes(verdict)) return "pill--ready";
  if (["Перерасход", "Слабый сигнал"].includes(verdict)) return "pill--warning";
  return "pill--neutral";
}

function getFlashMessage(status: string | undefined, reason: string | undefined) {
  if (status === "error") return { tone: "error" as const, message: reason || "Не удалось выполнить действие с импортом." };
  if (status === "uploaded") return { tone: "success" as const, message: "CSV принят и отправлен в обработку." };
  return null;
}

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  await requireAuthSession();

  const snapshot = await getAnalyzerWorkspaceSnapshot(searchParams?.importRunId);
  const flashMessage = getFlashMessage(searchParams?.status, searchParams?.reason);
  const selectedRun = snapshot.selectedRun;
  const isCompleted = selectedRun?.processingStatus === ImportRunStatus.COMPLETED;

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Анализатор"
        title="Отчёт по сигналам"
        description="Выберите импорт и просмотрите сигналы, подходы и результаты анализа."
      />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      {/* ── CSV-импорты управляются в Ad Accounts ──────────────────────────── */}
      <div className="empty-inline empty-inline--subtle">
        <p>
          CSV-импорты управляются в разделе{" "}
          <Link href="/ad-accounts?tab=upload">Ad Accounts</Link>.
          Здесь отображается анализ уже загруженных данных.
        </p>
      </div>

      {/* ── Выбор среза ────────────────────────────────────────────────────── */}
      <section className="dashboard-shell-grid">
        <SectionCard
          title="Срез для анализа"
          description="Выберите импорт, чтобы увидеть отчёт ниже."
        >
          <form action="/imports" className="stack" method="get">
            <div className="field">
              <label className="field__label" htmlFor="importRunId-select">
                CSV-файл
              </label>
              <select
                className="auth-input"
                defaultValue={selectedRun?.id ?? ""}
                id="importRunId-select"
                name="importRunId"
              >
                {snapshot.recentRuns.length ? (
                  snapshot.recentRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.sourceFilename} · {formatDateTime(run.receivedAt)}
                    </option>
                  ))
                ) : (
                  <option value="">Импортов пока нет</option>
                )}
              </select>
            </div>
            <div className="hero-actions">
              <button className="button button--primary" type="submit">
                Показать отчёт
              </button>
              {selectedRun ? (
                <Link className="button button--secondary" href={`/imports/${selectedRun.id}`}>
                  Тех. детали
                </Link>
              ) : null}
            </div>
          </form>
        </SectionCard>
      </section>

      {/* ── Отчёт ──────────────────────────────────────────────────────────── */}
      {!selectedRun ? (
        <div className="empty-inline">
          <h3>Импортов пока нет</h3>
          <p>
            Загрузите первый CSV в разделе{" "}
            <Link href="/ad-accounts?tab=upload">Ad Accounts → CSV Upload</Link>,
            затем вернитесь сюда для просмотра отчёта.
          </p>
        </div>
      ) : !isCompleted ? (
        <div className="empty-inline">
          <h3>Анализ ещё не завершён</h3>
          <p>
            Файл <strong>{selectedRun.sourceFilename}</strong> — статус:{" "}
            <span className={`pill ${getImportStatusTone(selectedRun.processingStatus)}`}>
              {importRunStatusLabels[selectedRun.processingStatus]}
            </span>
          </p>
          <div className="hero-actions">
            <Link className="button button--secondary button--compact" href={`/imports/${selectedRun.id}`}>
              Открыть тех. детали
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Сводка */}
          <section className="section-grid">
            <article className="stat-card">
              <span className="stat-label">Файл</span>
              <strong className="stat-value--compact">{selectedRun.sourceFilename}</strong>
              <p className="stat-copy">{formatReportingWindow(selectedRun.reportingWindowStart, selectedRun.reportingWindowEnd)}</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Объектов в анализе</span>
              <strong className="stat-value">{selectedRun.analyzerResultsCount}</strong>
              <p className="stat-copy">Нормализованных строк: {selectedRun.normalizedRowsCount}</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Сильных сигналов</span>
              <strong className="stat-value">{snapshot.strongSubjects.length}</strong>
              <p className="stat-copy">Кандидаты на масштабирование</p>
            </article>
            <article className="stat-card">
              <span className="stat-label">Слабых сигналов</span>
              <strong className="stat-value">{snapshot.weakSubjects.length}</strong>
              <p className="stat-copy">Требуют приоритетной проверки</p>
            </article>
          </section>

          {/* Сигналы — две колонки */}
          <section className="list-layout">
            <SectionCard
              title="Сильные сигналы"
              description="Кандидаты на масштабирование из текущего CSV."
            >
              {snapshot.strongSubjects.length ? (
                <ul className="signal-list">
                  {snapshot.strongSubjects.map((subject) => (
                    <li key={subject.id}>
                      <div className="item-title">
                        <span>{subject.subjectLabel}</span>
                        <span className={`pill ${getVerdictTone(subject.verdict)}`}>{subject.verdict}</span>
                      </div>
                      <span className="item-copy">
                        {subjectTypeLabels[subject.subjectType ?? ""] ?? "Объект"}
                        {subject.approachName ? ` · ${subject.approachName}` : ""}
                      </span>
                      <div className="metric-strip">
                        {subject.metrics.results != null ? (
                          <span className="metric-pill">Результатов: {subject.metrics.results}</span>
                        ) : null}
                        {subject.metrics.costPerResult != null ? (
                          <span className="metric-pill">CPA: {formatUsd(subject.metrics.costPerResult)}</span>
                        ) : null}
                        {subject.metrics.outboundCtr != null ? (
                          <span className="metric-pill">CTR: {formatPercentValue(subject.metrics.outboundCtr)}</span>
                        ) : null}
                        {subject.metrics.cplpv != null ? (
                          <span className="metric-pill">CPLPV: {formatUsd(subject.metrics.cplpv)}</span>
                        ) : null}
                      </div>
                      {subject.reason ? <span className="item-copy">{subject.reason}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-inline empty-inline--subtle">
                  <h3>Явных сильных сигналов пока нет</h3>
                  <p>Появятся после следующего завершённого импорта.</p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Слабые сигналы"
              description="Требуют проверки в первую очередь."
            >
              {snapshot.weakSubjects.length ? (
                <ul className="signal-list">
                  {snapshot.weakSubjects.map((subject) => (
                    <li key={subject.id}>
                      <div className="item-title">
                        <span>{subject.subjectLabel}</span>
                        <span className={`pill ${getVerdictTone(subject.verdict)}`}>{subject.verdict}</span>
                      </div>
                      <span className="item-copy">
                        {subjectTypeLabels[subject.subjectType ?? ""] ?? "Объект"}
                        {subject.approachName ? ` · ${subject.approachName}` : ""}
                      </span>
                      <div className="metric-strip">
                        {subject.metrics.spend != null ? (
                          <span className="metric-pill">Расход: {formatUsd(subject.metrics.spend)}</span>
                        ) : null}
                        {subject.metrics.results != null ? (
                          <span className="metric-pill">Результатов: {subject.metrics.results}</span>
                        ) : null}
                        {subject.metrics.outboundCtr != null ? (
                          <span className="metric-pill">CTR: {formatPercentValue(subject.metrics.outboundCtr)}</span>
                        ) : null}
                        {subject.metrics.cplpv != null ? (
                          <span className="metric-pill">CPLPV: {formatUsd(subject.metrics.cplpv)}</span>
                        ) : null}
                      </div>
                      {subject.reason ? <span className="item-copy">{subject.reason}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-inline empty-inline--subtle">
                  <h3>Слабых сигналов не найдено</h3>
                  <p>Нет объектов, которые попали в зону риска по текущему импорту.</p>
                </div>
              )}
            </SectionCard>
          </section>

          {/* Результаты по подходам */}
          {snapshot.approachSummaries.length > 0 ? (
            <SectionCard
              title="Результаты по подходам"
              description="Лучшие метрики каждого подхода внутри текущего CSV."
            >
              <ul className="signal-list">
                {snapshot.approachSummaries.map((approach) => (
                  <li key={approach.approachName}>
                    <div className="item-title">
                      <span>{approach.approachName}</span>
                      <span className="item-copy">{approach.subjectCount} объектов</span>
                    </div>
                    <div className="metric-strip">
                      {approach.bestOutboundCtr ? (
                        <span className="metric-pill">
                          Лучший CTR: {formatPercentValue(approach.bestOutboundCtr.value)} — {approach.bestOutboundCtr.subjectLabel}
                        </span>
                      ) : null}
                      {approach.bestCplpv ? (
                        <span className="metric-pill">
                          Лучший CPLPV: {formatUsd(approach.bestCplpv.value)} — {approach.bestCplpv.subjectLabel}
                        </span>
                      ) : null}
                      {approach.bestCostPerResult ? (
                        <span className="metric-pill">
                          Лучший CPA: {formatUsd(approach.bestCostPerResult.value)} — {approach.bestCostPerResult.subjectLabel}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </>
      )}

      {/* ── История импортов ────────────────────────────────────────────────── */}
      <SectionCard
        title="История импортов"
        description="Все загруженные CSV с быстрым входом в детали."
      >
        {snapshot.recentRuns.length ? (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Файл</th>
                  <th>Кабинет</th>
                  <th>Статус</th>
                  <th>Период</th>
                  <th>Строк</th>
                  <th>Получен</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {snapshot.recentRuns.map((importRun) => (
                  <tr key={importRun.id}>
                    <td>
                      <strong>{importRun.sourceFilename}</strong>
                    </td>
                    <td>
                      {importRun.adAccount ? (
                        <div className="table-primary">
                          <span>{importRun.adAccount.tag}</span>
                          <span className="table-subcopy">{importRun.adAccount.accountId}</span>
                        </div>
                      ) : (
                        <span className="table-empty">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`pill ${getImportStatusTone(importRun.processingStatus)}`}>
                        {importRunStatusLabels[importRun.processingStatus]}
                      </span>
                    </td>
                    <td>{formatReportingWindow(importRun.reportingWindowStart, importRun.reportingWindowEnd)}</td>
                    <td>
                      <div className="table-primary">
                        <strong>{importRun.rawRowsCount}</strong>
                        <span className="table-subcopy">Норм.: {importRun.normalizedRowsCount}</span>
                      </div>
                    </td>
                    <td>{formatDateTime(importRun.receivedAt)}</td>
                    <td className="table-actions">
                      <div className="workspace-toolbar__group workspace-toolbar__group--links">
                        <Link
                          className="button button--secondary button--compact"
                          href={`/imports?importRunId=${importRun.id}`}
                        >
                          Отчёт
                        </Link>
                        <Link
                          className="button button--secondary button--compact"
                          href={`/imports/${importRun.id}`}
                        >
                          Детали
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Импортов пока нет</h3>
            <p>
              Загрузите первый CSV в разделе{" "}
              <Link href="/ad-accounts?tab=upload">Ad Accounts</Link> —
              здесь появится история.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
