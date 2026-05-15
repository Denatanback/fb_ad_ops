import Link from "next/link";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { formatDate, formatPercentValue } from "@/lib/formatters";
import type {
  HistoricalApproachAggregate,
  HistoricalCampaignAggregate,
  HistoricalDashboardAggregates
} from "@/server/services/historical-aggregates";

type DashboardPreset = "all" | "7d" | "14d" | "30d" | "custom";
type SortDirection = "asc" | "desc";
type ApproachSortKey =
  | "approachName"
  | "totalSpend"
  | "totalResults"
  | "costPerResult"
  | "outboundCtr"
  | "cplpv"
  | "campaignCount"
  | "signalCountAllTime";
type CampaignSortKey =
  | "campaignName"
  | "approachName"
  | "totalSpend"
  | "totalResults"
  | "costPerResult"
  | "outboundCtr"
  | "cplpv"
  | "signalCountAllTime";

type OverviewDashboardProps = {
  aggregates: HistoricalDashboardAggregates;
  approachOptions: Array<{
    id: string;
    name: string;
  }>;
  filters: {
    preset: DashboardPreset;
    dateFrom: string;
    dateTo: string;
    approachId: string;
    approachSort: string;
    approachDir: string;
    campaignSort: string;
    campaignDir: string;
  };
};

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const presetDefinitions: Array<{
  value: Exclude<DashboardPreset, "custom">;
  label: string;
}> = [
  { value: "all", label: "Все время" },
  { value: "7d", label: "7 дней" },
  { value: "14d", label: "14 дней" },
  { value: "30d", label: "30 дней" }
];

function formatCurrency(value: number | string | null | undefined, fallback = "—") {
  if (value === null || value === undefined) {
    return fallback;
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return currencyFormatter.format(numericValue);
}

function formatTargetStatus(
  value: HistoricalApproachAggregate["targetCostStatus"] | HistoricalCampaignAggregate["targetCostStatus"]
) {
  switch (value) {
    case "below_target":
      return { label: "Лучше цели", tone: "good" } as const;
    case "on_target":
      return { label: "В норме", tone: "neutral" } as const;
    case "above_target":
      return { label: "Выше цели", tone: "warning" } as const;
    case "no_target":
      return { label: "Без цели", tone: "muted" } as const;
    case "insufficient_results":
      return { label: "Недостаточно данных", tone: "muted" } as const;
    default:
      return { label: value, tone: "muted" } as const;
  }
}

function formatBudgetMode(value: HistoricalCampaignAggregate["budgetModeContext"]) {
  switch (value) {
    case "adset":
      return "ABO";
    case "campaign":
      return "CBO";
    case "mixed":
      return "Смешано";
    default:
      return "Не определено";
  }
}

function formatRangeLabel(dateFrom: Date | null, dateTo: Date | null) {
  if (dateFrom && dateTo) {
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  }

  if (dateFrom) {
    return `С ${formatDate(dateFrom)}`;
  }

  if (dateTo) {
    return `До ${formatDate(dateTo)}`;
  }

  return "Все время";
}

function buildPresetHref(preset: Exclude<DashboardPreset, "custom">, filters: OverviewDashboardProps["filters"]) {
  const params = new URLSearchParams();

  if (preset !== "all") {
    params.set("preset", preset);
  }

  if (filters.approachId) {
    params.set("approachId", filters.approachId);
  }

  if (filters.approachSort !== "totalSpend" || filters.approachDir !== "desc") {
    params.set("approachSort", filters.approachSort);
    params.set("approachDir", filters.approachDir);
  }

  if (filters.campaignSort !== "totalSpend" || filters.campaignDir !== "desc") {
    params.set("campaignSort", filters.campaignSort);
    params.set("campaignDir", filters.campaignDir);
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function getWeightedAverage(rows: Array<{ rowCount: number; value: number | null }>) {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const row of rows) {
    if (row.value === null || row.rowCount <= 0) {
      continue;
    }

    totalWeight += row.rowCount;
    weightedSum += row.value * row.rowCount;
  }

  return totalWeight ? weightedSum / totalWeight : null;
}

function compareNullableNumber(left: number | null, right: number | null, direction: SortDirection) {
  const leftValue = left ?? (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
  const rightValue = right ?? (direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);

  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function normalizeApproachSort(value: string): ApproachSortKey {
  if (
    value === "approachName" ||
    value === "totalSpend" ||
    value === "totalResults" ||
    value === "costPerResult" ||
    value === "outboundCtr" ||
    value === "cplpv" ||
    value === "campaignCount" ||
    value === "signalCountAllTime"
  ) {
    return value;
  }

  return "totalSpend";
}

function normalizeCampaignSort(value: string): CampaignSortKey {
  if (
    value === "campaignName" ||
    value === "approachName" ||
    value === "totalSpend" ||
    value === "totalResults" ||
    value === "costPerResult" ||
    value === "outboundCtr" ||
    value === "cplpv" ||
    value === "signalCountAllTime"
  ) {
    return value;
  }

  return "totalSpend";
}

function normalizeSortDirection(value: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

function sortApproaches(rows: HistoricalApproachAggregate[], sortKey: ApproachSortKey, direction: SortDirection) {
  return [...rows].sort((left, right) => {
    switch (sortKey) {
      case "approachName":
        return direction === "asc"
          ? left.approachName.localeCompare(right.approachName, "ru")
          : right.approachName.localeCompare(left.approachName, "ru");
      case "totalResults":
        return direction === "asc" ? left.totalResults - right.totalResults : right.totalResults - left.totalResults;
      case "costPerResult":
        return compareNullableNumber(left.costPerResult, right.costPerResult, direction);
      case "outboundCtr":
        return compareNullableNumber(left.outboundCtr, right.outboundCtr, direction);
      case "cplpv":
        return compareNullableNumber(left.cplpv, right.cplpv, direction);
      case "campaignCount":
        return direction === "asc" ? left.campaignCount - right.campaignCount : right.campaignCount - left.campaignCount;
      case "signalCountAllTime":
        return compareNullableNumber(left.signalCountAllTime, right.signalCountAllTime, direction);
      case "totalSpend":
      default:
        return direction === "asc" ? left.totalSpend - right.totalSpend : right.totalSpend - left.totalSpend;
    }
  });
}

function sortCampaigns(rows: HistoricalCampaignAggregate[], sortKey: CampaignSortKey, direction: SortDirection) {
  return [...rows].sort((left, right) => {
    switch (sortKey) {
      case "campaignName":
        return direction === "asc"
          ? left.campaignName.localeCompare(right.campaignName, "ru")
          : right.campaignName.localeCompare(left.campaignName, "ru");
      case "approachName":
        return direction === "asc"
          ? left.approachName.localeCompare(right.approachName, "ru")
          : right.approachName.localeCompare(left.approachName, "ru");
      case "totalResults":
        return direction === "asc" ? left.totalResults - right.totalResults : right.totalResults - left.totalResults;
      case "costPerResult":
        return compareNullableNumber(left.costPerResult, right.costPerResult, direction);
      case "outboundCtr":
        return compareNullableNumber(left.outboundCtr, right.outboundCtr, direction);
      case "cplpv":
        return compareNullableNumber(left.cplpv, right.cplpv, direction);
      case "signalCountAllTime":
        return compareNullableNumber(left.signalCountAllTime, right.signalCountAllTime, direction);
      case "totalSpend":
      default:
        return direction === "asc" ? left.totalSpend - right.totalSpend : right.totalSpend - left.totalSpend;
    }
  });
}

function buildSortHref(
  table: "approach" | "campaign",
  key: ApproachSortKey | CampaignSortKey,
  filters: OverviewDashboardProps["filters"]
) {
  const params = new URLSearchParams();

  if (filters.preset !== "all") {
    params.set("preset", filters.preset);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  if (filters.approachId) {
    params.set("approachId", filters.approachId);
  }

  const currentKey = table === "approach" ? normalizeApproachSort(filters.approachSort) : normalizeCampaignSort(filters.campaignSort);
  const currentDir = table === "approach" ? normalizeSortDirection(filters.approachDir) : normalizeSortDirection(filters.campaignDir);
  const nextDir = currentKey === key && currentDir === "desc" ? "asc" : "desc";

  if (table === "approach") {
    params.set("approachSort", String(key));
    params.set("approachDir", nextDir);
    params.set("campaignSort", filters.campaignSort);
    params.set("campaignDir", filters.campaignDir);
  } else {
    params.set("approachSort", filters.approachSort);
    params.set("approachDir", filters.approachDir);
    params.set("campaignSort", String(key));
    params.set("campaignDir", nextDir);
  }

  return `/?${params.toString()}`;
}

function renderSortLabel(active: boolean, direction: SortDirection, label: string) {
  if (!active) {
    return label;
  }

  return `${label} ${direction === "desc" ? "↓" : "↑"}`;
}

export function OverviewDashboard({ aggregates, approachOptions, filters }: OverviewDashboardProps) {
  const hasData = aggregates.summary.rowCount > 0;
  const summaryCostPerResult =
    aggregates.summary.totalResults > 0 ? aggregates.summary.totalSpend / aggregates.summary.totalResults : null;
  const summaryOutboundCtr = getWeightedAverage(
    aggregates.campaigns.map((campaign) => ({
      rowCount: campaign.rowCount,
      value: campaign.outboundCtr
    }))
  );
  const summaryCplpv = getWeightedAverage(
    aggregates.campaigns.map((campaign) => ({
      rowCount: campaign.rowCount,
      value: campaign.cplpv
    }))
  );
  const appliedRangeLabel = formatRangeLabel(aggregates.appliedRange.dateFrom, aggregates.appliedRange.dateTo);
  const selectedApproach = approachOptions.find((approach) => approach.id === filters.approachId) ?? null;
  const approachSort = normalizeApproachSort(filters.approachSort);
  const approachDir = normalizeSortDirection(filters.approachDir);
  const campaignSort = normalizeCampaignSort(filters.campaignSort);
  const campaignDir = normalizeSortDirection(filters.campaignDir);
  const sortedApproaches = sortApproaches(aggregates.approaches, approachSort, approachDir);
  const sortedCampaigns = sortCampaigns(aggregates.campaigns, campaignSort, campaignDir);

  return (
    <div className="content-frame">
      <PageHeader eyebrow="Обзор" title="Дашборд" description="Подходы, кампании и целевая стоимость в одном срезе." />

      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group" role="tablist" aria-label="Период">
            {presetDefinitions.map((preset) => {
              const isActive =
                filters.preset === preset.value ||
                (filters.preset === "custom" && preset.value === "all" && !filters.dateFrom && !filters.dateTo);

              return (
                <Link
                  className={`toolbar-chip ${isActive ? "toolbar-chip--active" : ""}`}
                  href={buildPresetHref(preset.value, filters)}
                  key={preset.value}
                >
                  {preset.label}
                </Link>
              );
            })}
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href="/queue">
              Очередь
            </Link>
            <Link className="toolbar-link" href="/active">
              Активные
            </Link>
            <Link className="toolbar-link" href="/scaling">
              Скейлинг
            </Link>
            <Link className="toolbar-link" href="/imports">
              Анализатор
            </Link>
          </div>
        </div>

        <form action="/" className="inline-filter-form">
          <input name="preset" type="hidden" value="custom" />
          <input name="approachSort" type="hidden" value={filters.approachSort} />
          <input name="approachDir" type="hidden" value={filters.approachDir} />
          <input name="campaignSort" type="hidden" value={filters.campaignSort} />
          <input name="campaignDir" type="hidden" value={filters.campaignDir} />

          <label className="field field--compact">
            <span className="field__label">Подход</span>
            <select className="auth-input" defaultValue={filters.approachId} name="approachId">
              <option value="">Все подходы</option>
              {approachOptions.map((approach) => (
                <option key={approach.id} value={approach.id}>
                  {approach.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--compact">
            <span className="field__label">От</span>
            <input className="auth-input" defaultValue={filters.dateFrom} name="dateFrom" type="date" />
          </label>

          <label className="field field--compact">
            <span className="field__label">До</span>
            <input className="auth-input" defaultValue={filters.dateTo} name="dateTo" type="date" />
          </label>

          <div className="compact-filter-form__actions">
            <button className="button button--primary button--compact" type="submit">
              Применить
            </button>
            <Link className="button button--secondary button--compact" href="/">
              Сбросить
            </Link>
          </div>
        </form>

        <div className="workspace-toolbar__meta">
          <span className="pill pill--neutral">Срез: {appliedRangeLabel}</span>
          <span className="pill pill--neutral">
            Подход: {selectedApproach ? selectedApproach.name : "Все"}
          </span>
        </div>
      </section>

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Расход</span>
          <strong className="summary-stat__value">{formatCurrency(aggregates.summary.totalSpend)}</strong>
          <span className="summary-stat__hint">{aggregates.summary.importRunCount} импортов</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Результаты</span>
          <strong className="summary-stat__value">{aggregates.summary.totalResults}</strong>
          <span className="summary-stat__hint">{aggregates.summary.rowCount} строк</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Цена результата</span>
          <strong className="summary-stat__value">{formatCurrency(summaryCostPerResult)}</strong>
          <span className="summary-stat__hint">Общий CPA</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Outbound CTR</span>
          <strong className="summary-stat__value">{formatPercentValue(summaryOutboundCtr)}</strong>
          <span className="summary-stat__hint">Средний по кампаниям</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">CPLPV</span>
          <strong className="summary-stat__value">{formatCurrency(summaryCplpv)}</strong>
          <span className="summary-stat__hint">Средняя стоимость LPV</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Кампании</span>
          <strong className="summary-stat__value">{aggregates.summary.campaignCount}</strong>
          <span className="summary-stat__hint">{aggregates.summary.approachCount} подходов</span>
        </article>
      </section>

      {hasData ? (
        <>
          <SectionCard title="Подходы" description="Главный слой обзора.">
            <div className="table-shell">
              <table className="data-table data-table--dense">
                <thead>
                  <tr>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "approachName", filters)}>
                        {renderSortLabel(approachSort === "approachName", approachDir, "Подход")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "totalSpend", filters)}>
                        {renderSortLabel(approachSort === "totalSpend", approachDir, "Расход")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "totalResults", filters)}>
                        {renderSortLabel(approachSort === "totalResults", approachDir, "Результаты")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "costPerResult", filters)}>
                        {renderSortLabel(approachSort === "costPerResult", approachDir, "Цена результата")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "outboundCtr", filters)}>
                        {renderSortLabel(approachSort === "outboundCtr", approachDir, "Outbound CTR")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "cplpv", filters)}>
                        {renderSortLabel(approachSort === "cplpv", approachDir, "CPLPV")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "campaignCount", filters)}>
                        {renderSortLabel(approachSort === "campaignCount", approachDir, "Кампании")}
                      </Link>
                    </th>
                    <th>Цель</th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("approach", "signalCountAllTime", filters)}>
                        {renderSortLabel(approachSort === "signalCountAllTime", approachDir, "Сигналы")}
                      </Link>
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {sortedApproaches.map((approach) => {
                    const targetStatus = formatTargetStatus(approach.targetCostStatus);

                    return (
                      <tr key={`${approach.approachId ?? "unmapped"}-${approach.approachName}`}>
                        <td>
                          <div className="table-primary">
                            <strong>{approach.approachName}</strong>
                            <span className="table-subcopy">{formatRangeLabel(approach.reportDateMin, approach.reportDateMax)}</span>
                          </div>
                        </td>
                        <td>{formatCurrency(approach.totalSpend)}</td>
                        <td>{approach.totalResults}</td>
                        <td>{formatCurrency(approach.costPerResult)}</td>
                        <td>{formatPercentValue(approach.outboundCtr)}</td>
                        <td>{formatCurrency(approach.cplpv)}</td>
                        <td>{approach.campaignCount}</td>
                        <td>
                          <div className="cell-stack">
                            <strong>{formatCurrency(approach.targetCostUsd)}</strong>
                            <span className={`target-status target-status--${targetStatus.tone}`}>{targetStatus.label}</span>
                          </div>
                        </td>
                        <td>{approach.signalCountAllTime ?? "—"}</td>
                        <td className="table-actions">
                          <Link
                            className="button button--secondary button--compact"
                            href={approach.approachId ? `/creatives?approachId=${approach.approachId}` : "/approaches"}
                          >
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Кампании" description="Drill-down по выбранному срезу.">
            <div className="table-shell">
              <table className="data-table data-table--dense">
                <thead>
                  <tr>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "campaignName", filters)}>
                        {renderSortLabel(campaignSort === "campaignName", campaignDir, "Кампания")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "approachName", filters)}>
                        {renderSortLabel(campaignSort === "approachName", campaignDir, "Подход")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "totalSpend", filters)}>
                        {renderSortLabel(campaignSort === "totalSpend", campaignDir, "Расход")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "totalResults", filters)}>
                        {renderSortLabel(campaignSort === "totalResults", campaignDir, "Результаты")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "costPerResult", filters)}>
                        {renderSortLabel(campaignSort === "costPerResult", campaignDir, "CPA")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "outboundCtr", filters)}>
                        {renderSortLabel(campaignSort === "outboundCtr", campaignDir, "Outbound CTR")}
                      </Link>
                    </th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "cplpv", filters)}>
                        {renderSortLabel(campaignSort === "cplpv", campaignDir, "CPLPV")}
                      </Link>
                    </th>
                    <th>Budget</th>
                    <th>Цель</th>
                    <th>
                      <Link className="table-sort-link" href={buildSortHref("campaign", "signalCountAllTime", filters)}>
                        {renderSortLabel(campaignSort === "signalCountAllTime", campaignDir, "Сигналы")}
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((campaign) => {
                    const targetStatus = formatTargetStatus(campaign.targetCostStatus);

                    return (
                      <tr key={`${campaign.approachId ?? "unmapped"}-${campaign.campaignName}`}>
                        <td>
                          <div className="table-primary">
                            <strong>{campaign.campaignName}</strong>
                            <span className="table-subcopy">{campaign.funnelKey ?? "Без funnel key"}</span>
                          </div>
                        </td>
                        <td>{campaign.approachName}</td>
                        <td>{formatCurrency(campaign.totalSpend)}</td>
                        <td>{campaign.totalResults}</td>
                        <td>{formatCurrency(campaign.costPerResult)}</td>
                        <td>{formatPercentValue(campaign.outboundCtr)}</td>
                        <td>{formatCurrency(campaign.cplpv)}</td>
                        <td>{formatBudgetMode(campaign.budgetModeContext)}</td>
                        <td>
                          <div className="cell-stack">
                            <strong>{formatCurrency(campaign.targetCostUsd)}</strong>
                            <span className={`target-status target-status--${targetStatus.tone}`}>{targetStatus.label}</span>
                          </div>
                        </td>
                        <td>{campaign.signalCountAllTime ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : (
        <div className="empty-inline">
          <h3>Данных пока нет</h3>
          <p>Загрузите CSV в анализатор, чтобы увидеть подходы и кампании в обзоре.</p>
        </div>
      )}
    </div>
  );
}
