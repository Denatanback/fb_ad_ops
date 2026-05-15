import { ImportRunStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { getTargetCostConfigLookup, type TargetCostConfigView } from "@/server/services/target-costs";

const historicalRowSelect = {
  importRunId: true,
  reportDate: true,
  approachName: true,
  campaignName: true,
  globalGroupKey: true,
  comparisonGroupKey: true,
  spend: true,
  results: true,
  costPerResult: true,
  clicks: true,
  impressions: true,
  intervalResults: true,
  intervalSpend: true,
  intervalImpressions: true,
  intervalClicks: true,
  normalizedPayload: true
} satisfies Prisma.ImportNormalizedRowSelect;

type HistoricalRowRecord = Prisma.ImportNormalizedRowGetPayload<{
  select: typeof historicalRowSelect;
}>;

type AggregateMetricAccumulator = {
  spend: number;
  results: number;
  clicks: number;
  impressions: number;
  rowCount: number;
  importRunIds: Set<string>;
  outboundCtrValues: number[];
  cplpvValues: number[];
  reportDateMin: Date | null;
  reportDateMax: Date | null;
};

type AggregateStatus = "below_target" | "on_target" | "above_target" | "no_target" | "insufficient_results";
type BudgetModeContext = "adset" | "campaign" | "mixed" | "unknown";

export type HistoricalAggregateRangeInput = {
  dateFrom?: Date | string | null;
  dateTo?: Date | string | null;
  approachId?: string | null;
};

export type HistoricalApproachAggregate = {
  approachId: string | null;
  approachName: string;
  totalSpend: number;
  totalResults: number;
  costPerResult: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  campaignCount: number;
  rowCount: number;
  importRunCount: number;
  reportDateMin: Date | null;
  reportDateMax: Date | null;
  targetCostUsd: string | null;
  targetCostScope: string | null;
  targetCostStatus: AggregateStatus;
  signalCountAllTime: number | null;
};

export type HistoricalCampaignAggregate = {
  approachId: string | null;
  approachName: string;
  campaignName: string;
  funnelKey: string | null;
  totalSpend: number;
  totalResults: number;
  costPerResult: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  budgetModeContext: BudgetModeContext;
  rowCount: number;
  importRunCount: number;
  reportDateMin: Date | null;
  reportDateMax: Date | null;
  targetCostUsd: string | null;
  targetCostScope: string | null;
  targetCostStatus: AggregateStatus;
  signalCountAllTime: number | null;
};

export type HistoricalDashboardAggregates = {
  appliedRange: {
    dateFrom: Date | null;
    dateTo: Date | null;
  };
  summary: {
    totalSpend: number;
    totalResults: number;
    approachCount: number;
    campaignCount: number;
    rowCount: number;
    importRunCount: number;
    reportDateMin: Date | null;
    reportDateMax: Date | null;
  };
  approaches: HistoricalApproachAggregate[];
  campaigns: HistoricalCampaignAggregate[];
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === "object" && value && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function roundMetric(value: number) {
  return Number(value.toFixed(4));
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function normalizeDateInput(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readAdditionalMetrics(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      outboundCtr: null,
      cplpv: null
    };
  }

  const additionalMetrics = (payload as Record<string, unknown>).additionalMetrics;

  if (!additionalMetrics || typeof additionalMetrics !== "object" || Array.isArray(additionalMetrics)) {
    return {
      outboundCtr: null,
      cplpv: null
    };
  }

  return {
    outboundCtr: toNumber((additionalMetrics as Record<string, unknown>).outboundCtr),
    cplpv: toNumber((additionalMetrics as Record<string, unknown>).cplpv)
  };
}

function readAdsetBudgetType(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const source = (payload as Record<string, unknown>).source;

  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const sourceContext = (source as Record<string, unknown>).sourceContext;

  if (!sourceContext || typeof sourceContext !== "object" || Array.isArray(sourceContext)) {
    return null;
  }

  const budgetType = (sourceContext as Record<string, unknown>).adsetBudgetType;
  return typeof budgetType === "string" ? normalizeText(budgetType) : null;
}

function deriveBudgetModeContext(value: string | null): Exclude<BudgetModeContext, "mixed"> {
  const normalized = value?.toLowerCase() ?? "";

  if (normalized.includes("campaign")) {
    return "campaign";
  }

  if (normalized.includes("ad set") || normalized.includes("adset")) {
    return "adset";
  }

  return "unknown";
}

function createMetricAccumulator(): AggregateMetricAccumulator {
  return {
    spend: 0,
    results: 0,
    clicks: 0,
    impressions: 0,
    rowCount: 0,
    importRunIds: new Set<string>(),
    outboundCtrValues: [],
    cplpvValues: [],
    reportDateMin: null,
    reportDateMax: null
  };
}

function pushAccumulatorRow(accumulator: AggregateMetricAccumulator, row: HistoricalRowRecord) {
  const additionalMetrics = readAdditionalMetrics(row.normalizedPayload);

  accumulator.spend += (toNumber(row.intervalSpend) ?? toNumber(row.spend)) ?? 0;
  accumulator.results += (row.intervalResults ?? row.results) ?? 0;
  accumulator.clicks += (row.intervalClicks ?? row.clicks) ?? 0;
  accumulator.impressions += (row.intervalImpressions ?? row.impressions) ?? 0;
  accumulator.rowCount += 1;
  accumulator.importRunIds.add(row.importRunId);

  if (typeof additionalMetrics.outboundCtr === "number") {
    accumulator.outboundCtrValues.push(additionalMetrics.outboundCtr);
  }

  if (typeof additionalMetrics.cplpv === "number") {
    accumulator.cplpvValues.push(additionalMetrics.cplpv);
  }

  if (row.reportDate && (!accumulator.reportDateMin || row.reportDate < accumulator.reportDateMin)) {
    accumulator.reportDateMin = row.reportDate;
  }

  if (row.reportDate && (!accumulator.reportDateMax || row.reportDate > accumulator.reportDateMax)) {
    accumulator.reportDateMax = row.reportDate;
  }
}

function computeCostPerResult(spend: number, results: number) {
  if (results <= 0) {
    return null;
  }

  return roundMetric(spend / results);
}

function resolveTargetCostStatus(costPerResult: number | null, targetCost: TargetCostConfigView | null): AggregateStatus {
  if (!targetCost) {
    return "no_target";
  }

  if (costPerResult === null) {
    return "insufficient_results";
  }

  const target = toNumber(targetCost.targetCostUsd);

  if (target === null) {
    return "no_target";
  }

  if (costPerResult > target) {
    return "above_target";
  }

  if (costPerResult <= target * 0.85) {
    return "below_target";
  }

  return "on_target";
}

function buildHistoricalWhere(input: HistoricalAggregateRangeInput): Prisma.ImportNormalizedRowWhereInput {
  const dateFrom = normalizeDateInput(input.dateFrom);
  const dateTo = normalizeDateInput(input.dateTo);

  return {
    isActive: true,
    importRun: {
      processingStatus: ImportRunStatus.COMPLETED,
      isActive: true,
    },
    ...(dateFrom || dateTo
      ? {
          reportDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {})
          }
        }
      : {})
  };
}

async function buildSignalCountMaps() {
  const alertEvents = await db.alertEvent.findMany({
    where: {
      importRun: {
        processingStatus: ImportRunStatus.COMPLETED,
        isActive: true,
      }
    },
    select: {
      comparisonGroup: {
        select: {
          approachId: true
        }
      },
      analyzerResult: {
        select: {
          subjectLabel: true,
          resultPayload: true
        }
      }
    }
  });

  const approachSignalCounts = new Map<string, number>();
  const campaignSignalCounts = new Map<string, number>();

  for (const alertEvent of alertEvents) {
    const approachId = alertEvent.comparisonGroup?.approachId ?? null;

    if (approachId) {
      approachSignalCounts.set(approachId, (approachSignalCounts.get(approachId) ?? 0) + 1);
    }

    const campaignName = normalizeText(alertEvent.analyzerResult?.subjectLabel);
    const resultPayload = alertEvent.analyzerResult?.resultPayload;
    const subjectType =
      resultPayload && typeof resultPayload === "object" && !Array.isArray(resultPayload)
        ? (resultPayload as Record<string, unknown>).subjectType
        : null;

    if (approachId && campaignName && subjectType === "campaign") {
      const key = `${approachId}::${campaignName.toLowerCase()}`;
      campaignSignalCounts.set(key, (campaignSignalCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    approachSignalCounts,
    campaignSignalCounts
  };
}

export async function getHistoricalDashboardAggregates(
  input: HistoricalAggregateRangeInput = {}
): Promise<HistoricalDashboardAggregates> {
  const appliedRange = {
    dateFrom: normalizeDateInput(input.dateFrom),
    dateTo: normalizeDateInput(input.dateTo)
  };

  const rows = await db.importNormalizedRow.findMany({
    where: buildHistoricalWhere(input),
    orderBy: [{ reportDate: "asc" }, { campaignName: "asc" }],
    select: historicalRowSelect
  });

  const approachNames = [...new Set(rows.map((row) => normalizeText(row.approachName)).filter((value): value is string => Boolean(value)))];
  const approaches = approachNames.length
    ? await db.approach.findMany({
        where: {
          name: {
            in: approachNames
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];
  const approachIdByName = new Map(approaches.map((approach) => [approach.name, approach.id]));
  const targetCostLookup = await getTargetCostConfigLookup();
  const signalCountMaps = await buildSignalCountMaps();

  const approachMap = new Map<
    string,
    {
      approachId: string | null;
      approachName: string;
      metrics: AggregateMetricAccumulator;
      campaignKeys: Set<string>;
    }
  >();

  const campaignMap = new Map<
    string,
    {
      approachId: string | null;
      approachName: string;
      campaignName: string;
      funnelKeys: Set<string>;
      metrics: AggregateMetricAccumulator;
      budgetModes: Set<Exclude<BudgetModeContext, "mixed">>;
    }
  >();

  for (const row of rows) {
    const approachName = normalizeText(row.approachName) ?? "Без подхода";
    const approachId = approachIdByName.get(approachName) ?? null;

    if (input.approachId && approachId !== input.approachId) {
      continue;
    }

    const campaignName = normalizeText(row.campaignName) ?? "Без кампании";
    const approachKey = `${approachId ?? "unmapped"}::${approachName.toLowerCase()}`;
    const campaignKey = `${approachId ?? "unmapped"}::${campaignName.toLowerCase()}`;
    const funnelKey = normalizeText(row.globalGroupKey) ?? normalizeText(row.comparisonGroupKey);
    const budgetMode = deriveBudgetModeContext(readAdsetBudgetType(row.normalizedPayload));

    if (!approachMap.has(approachKey)) {
      approachMap.set(approachKey, {
        approachId,
        approachName,
        metrics: createMetricAccumulator(),
        campaignKeys: new Set<string>()
      });
    }

    if (!campaignMap.has(campaignKey)) {
      campaignMap.set(campaignKey, {
        approachId,
        approachName,
        campaignName,
        funnelKeys: new Set<string>(),
        metrics: createMetricAccumulator(),
        budgetModes: new Set<Exclude<BudgetModeContext, "mixed">>()
      });
    }

    const approachEntry = approachMap.get(approachKey)!;
    const campaignEntry = campaignMap.get(campaignKey)!;

    pushAccumulatorRow(approachEntry.metrics, row);
    pushAccumulatorRow(campaignEntry.metrics, row);
    approachEntry.campaignKeys.add(campaignKey);
    campaignEntry.budgetModes.add(budgetMode);

    if (funnelKey) {
      campaignEntry.funnelKeys.add(funnelKey);
    }
  }

  const approachesOutput = [...approachMap.values()]
    .map((entry) => {
      const totalSpend = roundMetric(entry.metrics.spend);
      const totalResults = entry.metrics.results;
      const costPerResult = computeCostPerResult(totalSpend, totalResults);
      const targetCost = targetCostLookup.resolve({
        approachId: entry.approachId
      });

      return {
        approachId: entry.approachId,
        approachName: entry.approachName,
        totalSpend,
        totalResults,
        costPerResult,
        outboundCtr: average(entry.metrics.outboundCtrValues),
        cplpv: average(entry.metrics.cplpvValues),
        campaignCount: entry.campaignKeys.size,
        rowCount: entry.metrics.rowCount,
        importRunCount: entry.metrics.importRunIds.size,
        reportDateMin: entry.metrics.reportDateMin,
        reportDateMax: entry.metrics.reportDateMax,
        targetCostUsd: targetCost?.targetCostUsd ?? null,
        targetCostScope: targetCost?.scope ?? null,
        targetCostStatus: resolveTargetCostStatus(costPerResult, targetCost),
        signalCountAllTime: entry.approachId ? signalCountMaps.approachSignalCounts.get(entry.approachId) ?? 0 : null
      } satisfies HistoricalApproachAggregate;
    })
    .sort((left, right) => right.totalSpend - left.totalSpend || left.approachName.localeCompare(right.approachName));

  const campaignsOutput = [...campaignMap.values()]
    .map((entry) => {
      const totalSpend = roundMetric(entry.metrics.spend);
      const totalResults = entry.metrics.results;
      const costPerResult = computeCostPerResult(totalSpend, totalResults);
      const singleFunnelKey = entry.funnelKeys.size === 1 ? [...entry.funnelKeys][0] ?? null : null;
      const targetCost = targetCostLookup.resolve({
        approachId: entry.approachId,
        funnelKey: singleFunnelKey
      });
      const budgetModeContext: BudgetModeContext =
        entry.budgetModes.size === 1 ? [...entry.budgetModes][0] ?? "unknown" : entry.budgetModes.size > 1 ? "mixed" : "unknown";
      const campaignSignalKey = entry.approachId ? `${entry.approachId}::${entry.campaignName.toLowerCase()}` : null;

      return {
        approachId: entry.approachId,
        approachName: entry.approachName,
        campaignName: entry.campaignName,
        funnelKey: singleFunnelKey,
        totalSpend,
        totalResults,
        costPerResult,
        outboundCtr: average(entry.metrics.outboundCtrValues),
        cplpv: average(entry.metrics.cplpvValues),
        budgetModeContext,
        rowCount: entry.metrics.rowCount,
        importRunCount: entry.metrics.importRunIds.size,
        reportDateMin: entry.metrics.reportDateMin,
        reportDateMax: entry.metrics.reportDateMax,
        targetCostUsd: targetCost?.targetCostUsd ?? null,
        targetCostScope: targetCost?.scope ?? null,
        targetCostStatus: resolveTargetCostStatus(costPerResult, targetCost),
        signalCountAllTime: campaignSignalKey ? signalCountMaps.campaignSignalCounts.get(campaignSignalKey) ?? 0 : null
      } satisfies HistoricalCampaignAggregate;
    })
    .sort((left, right) => right.totalSpend - left.totalSpend || left.campaignName.localeCompare(right.campaignName));

  const summaryImportRuns = new Set(rows.map((row) => row.importRunId));
  const reportDates = rows.map((row) => row.reportDate).filter((value): value is Date => Boolean(value));

  return {
    appliedRange,
    summary: {
      totalSpend: roundMetric(rows.reduce((sum, row) => sum + (toNumber(row.spend) ?? 0), 0)),
      totalResults: rows.reduce((sum, row) => sum + (row.results ?? 0), 0),
      approachCount: approachesOutput.length,
      campaignCount: campaignsOutput.length,
      rowCount: rows.length,
      importRunCount: summaryImportRuns.size,
      reportDateMin: reportDates[0] ?? null,
      reportDateMax: reportDates[reportDates.length - 1] ?? null
    },
    approaches: approachesOutput,
    campaigns: campaignsOutput
  };
}

export async function listHistoricalApproachAggregates(input: HistoricalAggregateRangeInput = {}) {
  const aggregates = await getHistoricalDashboardAggregates(input);
  return aggregates.approaches;
}

export async function listHistoricalCampaignAggregates(input: HistoricalAggregateRangeInput = {}) {
  const aggregates = await getHistoricalDashboardAggregates(input);
  return aggregates.campaigns;
}
