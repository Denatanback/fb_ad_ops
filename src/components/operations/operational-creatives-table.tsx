import Link from "next/link";
import { BudgetModeBadge } from "@/components/workspace/budget-mode-badge";
import { LabelChip } from "@/components/workspace/label-chip";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDateTime, formatDecimalValue, formatOptionalText, formatPercentValue } from "@/lib/formatters";
import type { OperationalCreativeRow, OperationalViewKey } from "@/server/services/operations";

function renderMetricsSummary(row: OperationalCreativeRow) {
  if (!row.latestMetrics) {
    return <span className="table-muted">Свежий срез метрик ещё не зафиксирован.</span>;
  }

  return (
    <div className="cell-stack">
      <div className="metric-strip">
        <span className="metric-pill">Results {row.latestMetrics.results ?? 0}</span>
        <span className="metric-pill">Outbound CTR {formatPercentValue(row.latestMetrics.outboundCtr)}</span>
        <span className="metric-pill">CPLPV {formatDecimalValue(row.latestMetrics.cplpv)}</span>
        <span className="metric-pill">Clicks {row.latestMetrics.clicks ?? 0}</span>
      </div>
      <span className="table-subcopy">
        Срез {formatDateTime(row.latestMetrics.capturedAt)} · Cost / result {formatDecimalValue(row.latestMetrics.costPerResult)}
      </span>
    </div>
  );
}

function renderLaunchContext(row: OperationalCreativeRow) {
  if (!row.latestLaunch) {
    return <span className="table-muted">Запусков пока нет.</span>;
  }

  return (
    <div className="cell-stack">
      <div className="table-primary">
        <strong>{row.latestLaunch.setupName}</strong>
        <span className="table-subcopy">
          {formatOptionalText(row.latestLaunch.lander?.name, "Без лендера")} · {formatDateTime(row.latestLaunch.launchedAt ?? row.latestLaunch.createdAt)}
        </span>
      </div>
      <div className="tag-row">
        <StatusBadge status={row.latestLaunch.lifecycleStatus} />
        <BudgetModeBadge mode={row.latestLaunch.budgetMode} />
      </div>
      {row.previousLaunch ? (
        <span className="table-subcopy">
          Предыдущий запуск: {row.previousLaunch.setupName} · {formatDateTime(row.previousLaunch.launchedAt ?? row.previousLaunch.createdAt)}
        </span>
      ) : null}
    </div>
  );
}

function renderAttention(row: OperationalCreativeRow, view: OperationalViewKey) {
  if (!row.attentionNeeded) {
    return (
      <div className="cell-stack">
        <span className="pill pill--ready">{view === "queue" ? "готово к работе" : "без сигнала"}</span>
        <span className="table-subcopy">
          {view === "queue" ? "Можно планировать следующий шаг." : "По базовым operational-признакам срочного действия не требуется."}
        </span>
      </div>
    );
  }

  return (
    <div className="cell-stack">
      <span className="pill pill--warning">требует внимания</span>
      <ul className="attention-list">
        {row.attentionReasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

export function OperationalCreativesTable({
  rows,
  view
}: {
  rows: OperationalCreativeRow[];
  view: OperationalViewKey;
}) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Креатив</th>
            <th>Approach</th>
            <th>Метки</th>
            <th>Запуски</th>
            <th>Последний контекст</th>
            <th>Метрики</th>
            <th>Сигналы</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="table-primary">
                  <strong>{row.name}</strong>
                  <span className="table-subcopy">{formatOptionalText(row.type, "Тип не указан")}</span>
                  {row.notes ? <span className="table-subcopy">{row.notes}</span> : null}
                </div>
              </td>
              <td>{row.approach.name}</td>
              <td>
                <div className="tag-row">
                  {row.labels.length ? (
                    row.labels.map((label) => <LabelChip key={label.id} label={label.key} />)
                  ) : (
                    <span className="table-muted">Без меток</span>
                  )}
                </div>
              </td>
              <td>
                <div className="cell-stack">
                  <strong>{row.launchCount}</strong>
                  <span className="table-subcopy">
                    {row.latestLaunch ? `Последний запуск ${formatDateTime(row.latestLaunch.launchedAt ?? row.latestLaunch.createdAt)}` : "Истории запусков нет"}
                  </span>
                </div>
              </td>
              <td>{renderLaunchContext(row)}</td>
              <td>{renderMetricsSummary(row)}</td>
              <td>{renderAttention(row, view)}</td>
              <td className="table-actions">
                <div className="cell-stack">
                  <Link className="button button--secondary button--compact" href={`/creatives/${row.id}`}>
                    Детали
                  </Link>
                  <Link className="button button--secondary button--compact" href={`/creatives/${row.id}/launches/new`}>
                    Новый запуск
                  </Link>
                  {row.latestLaunch ? (
                    <Link className="section-card__link" href={`/launches/${row.latestLaunch.id}`}>
                      Последний запуск
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
