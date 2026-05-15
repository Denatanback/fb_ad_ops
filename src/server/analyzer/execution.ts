import {
  AlertSeverity,
  AnalyzerAlertKind,
  AnalyzerConfidenceLevel,
  AnalyzerEvaluationMode,
  NotificationDispatchMode,
  Prisma
} from "@prisma/client";
import { db } from "@/server/db/client";
import { TelegramSendError, sendTelegramMessage } from "@/server/notifications/telegram";
import { enqueueAlertEventsForDigest, getDispatchModeForTopic } from "@/server/notifications/digests";
import type {
  TelegramNeedsReviewReasonCode,
  TelegramNotificationDestination,
  TelegramTopicKey
} from "@/server/notifications/telegram-routing";
import { recordAlertEvent, recordNotificationDelivery } from "@/server/services/alerts";
import { resolveEffectiveAnalyzerRules, type EffectiveAnalyzerRule } from "@/server/services/analyzer-rules";

const normalizedRowSelect = {
  id: true,
  importRunId: true,
  sourceRowNumber: true,
  reportDate: true,
  approachName: true,
  campaignName: true,
  adsetName: true,
  adName: true,
  globalGroupKey: true,
  comparisonGroupKey: true,
  hasResults: true,
  results: true,
  spend: true,
  impressions: true,
  clicks: true,
  cpc: true,
  ctr: true,
  cpm: true,
  costPerResult: true,
  intervalResults: true,
  intervalSpend: true,
  intervalImpressions: true,
  intervalClicks: true,
  normalizedPayload: true,
  normalizationError: true
} satisfies Prisma.ImportNormalizedRowSelect;

type ImportNormalizedRowRecord = Prisma.ImportNormalizedRowGetPayload<{
  select: typeof normalizedRowSelect;
}>;

type SubjectType = "campaign" | "adset" | "creative";

type SubjectMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cpc: number | null;
  ctr: number | null;
  cpm: number | null;
  costPerResult: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  cr: number | null;
  rowCount: number;
};

type SubjectAggregate = {
  subjectType: SubjectType;
  subjectKey: string;
  subjectLabel: string;
  primaryRowId: string | null;
  groupKey: string;
  groupLabel: string;
  approachId: string | null;
  approachName: string | null;
  funnelKey: string | null;
  globalGroupKey: string | null;
  metrics: SubjectMetrics;
  evaluationMode: AnalyzerEvaluationMode;
  confidenceLevel: AnalyzerConfidenceLevel;
  maturityReached: boolean;
  maturitySummary: string;
  resultsPresent: boolean;
  score: number;
  rank: number | null;
  summary: string;
  resultPayload: Prisma.InputJsonValue;
};

type ComparisonGroupDraft = {
  groupKey: string;
  groupLabel: string;
  approachId: string | null;
  approachName: string | null;
  funnelKey: string | null;
  globalGroupKey: string | null;
  rows: ImportNormalizedRowRecord[];
  rowCount: number;
  resultRowCount: number;
  evaluationMode: AnalyzerEvaluationMode;
  confidenceLevel: AnalyzerConfidenceLevel;
  maturityReached: boolean;
  maturitySummary: string;
  effectiveRules: Map<string, EffectiveAnalyzerRule>;
  campaignSubjects: SubjectAggregate[];
  adsetSubjects: SubjectAggregate[];
  creativeSubjects: SubjectAggregate[];
};

type AlertDraft = {
  comparisonGroupKey: string | null;
  analyzerResultSubjectKey: string | null;
  kind: AnalyzerAlertKind;
  severity: AlertSeverity;
  reasonCode: string | null;
  evaluationMode: AnalyzerEvaluationMode | null;
  confidenceLevel: AnalyzerConfidenceLevel | null;
  maturityReached: boolean;
  destinationTopicKey: TelegramTopicKey;
  title: string;
  summary: string;
  cooldownKey: string;
  alertPayload: Prisma.InputJsonValue;
};

type PersistedAnalyzerArtifacts = {
  comparisonGroups: {
    id: string;
    groupKey: string;
  }[];
  analyzerResults: {
    id: string;
    subjectKey: string;
  }[];
  alertEvents: Awaited<ReturnType<typeof recordAlertEvent>>[];
};

export type ImportAnalyzerExecutionResult = {
  importRunId: string;
  comparisonGroupsCount: number;
  analyzerResultsCount: number;
  alertEventsCount: number;
  queuedDigestAlertsCount: number;
  queuedDigestsCount: number;
  deliveredCount: number;
  failedDeliveriesCount: number;
  skippedDeliveriesCount: number;
};

type AlertDeliveryResult = {
  queuedDigestAlertsCount: number;
  queuedDigestsCount: number;
  deliveredCount: number;
  failedDeliveriesCount: number;
  skippedDeliveriesCount: number;
};

type AdditionalMetrics = {
  outboundCtr: number | null;
  cplpv: number | null;
  cr: number | null;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugifyKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

function average(values: Array<number | null | undefined>) {
  const normalized = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!normalized.length) {
    return null;
  }

  return roundMetric(normalized.reduce((sum, value) => sum + value, 0) / normalized.length);
}

function maxSeverity(left: AlertSeverity, right: AlertSeverity) {
  const weight = {
    [AlertSeverity.INFO]: 0,
    [AlertSeverity.WARNING]: 1,
    [AlertSeverity.CRITICAL]: 2
  } satisfies Record<AlertSeverity, number>;

  return weight[left] >= weight[right] ? left : right;
}

function mapSeverity(value: EffectiveAnalyzerRule["severity"]) {
  switch (value) {
    case "critical":
      return AlertSeverity.CRITICAL;
    case "info":
      return AlertSeverity.INFO;
    default:
      return AlertSeverity.WARNING;
  }
}

function readAdditionalMetrics(payload: Prisma.JsonValue): AdditionalMetrics {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      outboundCtr: null,
      cplpv: null,
      cr: null
    };
  }

  const additionalMetrics = (payload as Record<string, unknown>).additionalMetrics;

  if (!additionalMetrics || typeof additionalMetrics !== "object" || Array.isArray(additionalMetrics)) {
    return {
      outboundCtr: null,
      cplpv: null,
      cr: null
    };
  }

  return {
    outboundCtr: toNumber((additionalMetrics as Record<string, unknown>).outboundCtr),
    cplpv: toNumber((additionalMetrics as Record<string, unknown>).cplpv),
    cr: toNumber((additionalMetrics as Record<string, unknown>).cr)
  };
}

function formatInteger(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `$${formatDecimal(value, 2)}`;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return `${formatDecimal(value, 2)}%`;
}

function describeConfidence(value: AnalyzerConfidenceLevel) {
  switch (value) {
    case AnalyzerConfidenceLevel.HIGH:
      return "high";
    case AnalyzerConfidenceLevel.MEDIUM:
      return "medium";
    default:
      return "low";
  }
}

function describeMode(value: AnalyzerEvaluationMode) {
  return value === AnalyzerEvaluationMode.RESULTS_AWARE ? "result-aware" : "proxy";
}

function readTotalsLabel(metrics: SubjectMetrics) {
  return `spend ${formatCurrency(metrics.spend)}, clicks ${formatInteger(metrics.clicks)}, impressions ${formatInteger(metrics.impressions)}, results ${formatInteger(metrics.results)}`;
}

function determineEvaluationMode(metrics: Pick<SubjectMetrics, "results">) {
  return metrics.results > 0 ? AnalyzerEvaluationMode.RESULTS_AWARE : AnalyzerEvaluationMode.PROXY_MODE;
}

function determineMaturity(metrics: SubjectMetrics) {
  const reached =
    metrics.results > 0 || metrics.spend >= 25 || metrics.clicks >= 25 || metrics.impressions >= 2500;
  const reasons = [
    metrics.results > 0 ? `есть результаты (${metrics.results})` : null,
    metrics.spend >= 25 ? `spend ${formatCurrency(metrics.spend)}` : null,
    metrics.clicks >= 25 ? `clicks ${formatInteger(metrics.clicks)}` : null,
    metrics.impressions >= 2500 ? `impressions ${formatInteger(metrics.impressions)}` : null
  ].filter(Boolean);

  return {
    reached,
    summary: reached
      ? `Maturity достигнут: ${reasons.join(", ")}.`
      : `Maturity ещё низкий: ${readTotalsLabel(metrics)}.`
  };
}

function determineConfidence(metrics: SubjectMetrics) {
  if (metrics.results >= 3 || metrics.spend >= 100 || metrics.clicks >= 100 || metrics.impressions >= 10000) {
    return AnalyzerConfidenceLevel.HIGH;
  }

  if (metrics.results >= 1 || metrics.spend >= 40 || metrics.clicks >= 40 || metrics.impressions >= 4000) {
    return AnalyzerConfidenceLevel.MEDIUM;
  }

  return AnalyzerConfidenceLevel.LOW;
}

function computeScore(metrics: SubjectMetrics, evaluationMode: AnalyzerEvaluationMode) {
  if (evaluationMode === AnalyzerEvaluationMode.RESULTS_AWARE) {
    const score =
      metrics.results * 100 -
      (metrics.costPerResult ?? Math.max(metrics.spend, 0)) * 8 +
      (metrics.outboundCtr ?? 0) * 2 +
      (metrics.cr ?? 0);

    return roundMetric(score);
  }

  const score =
    (metrics.outboundCtr ?? 0) * 10 +
    (metrics.ctr ?? 0) * 2 -
    (metrics.cplpv ?? 0) * 5 -
    (metrics.cpc ?? 0) * 2;

  return roundMetric(score);
}

function buildMetricsSummary(metrics: SubjectMetrics) {
  return {
    spend: roundMetric(metrics.spend),
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    results: metrics.results,
    cpc: metrics.cpc,
    ctr: metrics.ctr,
    cpm: metrics.cpm,
    costPerResult: metrics.costPerResult,
    outboundCtr: metrics.outboundCtr,
    cplpv: metrics.cplpv,
    cr: metrics.cr,
    rowCount: metrics.rowCount
  } satisfies Prisma.InputJsonValue;
}

function buildSubjectSummary(subjectType: SubjectType, metrics: SubjectMetrics, evaluationMode: AnalyzerEvaluationMode) {
  const subjectLabel = subjectType === "campaign" ? "Campaign" : subjectType === "adset" ? "Ad set" : "Creative/ad";

  if (evaluationMode === AnalyzerEvaluationMode.RESULTS_AWARE) {
    return `${subjectLabel}: ${formatInteger(metrics.results)} results, CPA ${formatCurrency(metrics.costPerResult)}, spend ${formatCurrency(metrics.spend)}.`;
  }

  return `${subjectLabel}: spend ${formatCurrency(metrics.spend)}, outbound CTR ${formatPercent(metrics.outboundCtr)}, CPLPV ${formatCurrency(metrics.cplpv)}.`;
}

function aggregateMetrics(rows: ImportNormalizedRowRecord[]): SubjectMetrics {
  const additionalMetrics = rows.map((row) => readAdditionalMetrics(row.normalizedPayload));
  const spend = rows.reduce((sum, row) => sum + ((toNumber(row.intervalSpend) ?? toNumber(row.spend)) ?? 0), 0);
  const impressions = rows.reduce((sum, row) => sum + ((row.intervalImpressions ?? row.impressions) ?? 0), 0);
  const clicks = rows.reduce((sum, row) => sum + ((row.intervalClicks ?? row.clicks) ?? 0), 0);
  const results = rows.reduce((sum, row) => sum + ((row.intervalResults ?? row.results) ?? 0), 0);
  const cpc = clicks > 0 ? roundMetric(spend / clicks) : average(rows.map((row) => toNumber(row.cpc)));
  const ctr = impressions > 0 ? roundMetric((clicks / impressions) * 100) : average(rows.map((row) => toNumber(row.ctr)));
  const cpm = impressions > 0 ? roundMetric((spend / impressions) * 1000) : average(rows.map((row) => toNumber(row.cpm)));
  const costPerResult =
    results > 0 ? roundMetric(spend / results) : average(rows.map((row) => toNumber(row.costPerResult)));
  const outboundCtr = average(additionalMetrics.map((metrics) => metrics.outboundCtr));
  const cplpv = average(additionalMetrics.map((metrics) => metrics.cplpv));
  const cr =
    clicks > 0 && results > 0 ? roundMetric((results / clicks) * 100) : average(additionalMetrics.map((metrics) => metrics.cr));

  return {
    spend: roundMetric(spend),
    impressions,
    clicks,
    results,
    cpc,
    ctr,
    cpm,
    costPerResult,
    outboundCtr,
    cplpv,
    cr,
    rowCount: rows.length
  };
}

function buildSubjectAggregate(input: {
  subjectType: SubjectType;
  subjectLabel: string;
  rows: ImportNormalizedRowRecord[];
  group: Pick<ComparisonGroupDraft, "groupKey" | "groupLabel" | "approachId" | "approachName" | "funnelKey" | "globalGroupKey">;
}) {
  const metrics = aggregateMetrics(input.rows);
  const evaluationMode = determineEvaluationMode(metrics);
  const maturity = determineMaturity(metrics);
  const confidenceLevel = determineConfidence(metrics);
  const score = computeScore(metrics, evaluationMode);

  return {
    subjectType: input.subjectType,
    subjectKey: `${input.subjectType}:${slugifyKey(input.subjectLabel) || input.rows[0]?.id || "subject"}`,
    subjectLabel: input.subjectLabel,
    primaryRowId: input.rows[0]?.id ?? null,
    groupKey: input.group.groupKey,
    groupLabel: input.group.groupLabel,
    approachId: input.group.approachId,
    approachName: input.group.approachName,
    funnelKey: input.group.funnelKey,
    globalGroupKey: input.group.globalGroupKey,
    metrics,
    evaluationMode,
    confidenceLevel,
    maturityReached: maturity.reached,
    maturitySummary: maturity.summary,
    resultsPresent: metrics.results > 0,
    score,
    rank: null,
    summary: buildSubjectSummary(input.subjectType, metrics, evaluationMode),
    resultPayload: {
      subjectType: input.subjectType,
      groupKey: input.group.groupKey,
      groupLabel: input.group.groupLabel,
      approachName: input.group.approachName,
      funnelKey: input.group.funnelKey,
      globalGroupKey: input.group.globalGroupKey,
      metrics: buildMetricsSummary(metrics),
      evaluationMode: describeMode(evaluationMode),
      confidence: describeConfidence(confidenceLevel),
      maturityReached: maturity.reached,
      maturitySummary: maturity.summary,
      score,
      assumptions: {
        grouping: "Rows are grouped by approach plus global/comparison naming key from the imported campaign structure.",
        budgetMode: "CSV imports do not currently expose budget mode, so analyzer grouping does not split ABO/CBO yet."
      }
    } satisfies Prisma.InputJsonValue
  } satisfies SubjectAggregate;
}

function assignCampaignRanks(subjects: SubjectAggregate[]) {
  const sorted = [...subjects].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.metrics.results !== left.metrics.results) {
      return right.metrics.results - left.metrics.results;
    }

    return left.subjectLabel.localeCompare(right.subjectLabel);
  });

  const rankByKey = new Map(sorted.map((subject, index) => [subject.subjectKey, index + 1]));

  return subjects.map((subject) => ({
    ...subject,
    rank: rankByKey.get(subject.subjectKey) ?? null,
    resultPayload: {
      ...(subject.resultPayload as Record<string, unknown>),
      rank: rankByKey.get(subject.subjectKey) ?? null
    } satisfies Prisma.InputJsonValue
  }));
}

function buildBaseGroupKey(row: ImportNormalizedRowRecord) {
  const approachKey = normalizeText(row.approachName)?.toLowerCase() ?? "unmapped-approach";
  const funnelKey =
    normalizeText(row.globalGroupKey) ??
    normalizeText(row.comparisonGroupKey) ??
    slugifyKey(normalizeText(row.campaignName) ?? row.id);

  return {
    funnelKey,
    groupKey: `${approachKey}::${funnelKey}`,
    groupLabel: `${normalizeText(row.approachName) ?? "Без привязки к approach"} / ${normalizeText(row.globalGroupKey) ?? normalizeText(row.comparisonGroupKey) ?? normalizeText(row.campaignName) ?? "Без группы"}`
  };
}

function buildSubjectBuckets(rows: ImportNormalizedRowRecord[], subjectType: SubjectType) {
  const buckets = new Map<string, ImportNormalizedRowRecord[]>();

  for (const row of rows) {
    const label =
      subjectType === "campaign"
        ? normalizeText(row.campaignName)
        : subjectType === "adset"
          ? normalizeText(row.adsetName)
          : normalizeText(row.adName);

    if (!label) {
      continue;
    }

    const bucketKey = `${subjectType}:${label.toLowerCase()}`;
    const existing = buckets.get(bucketKey);

    if (existing) {
      existing.push(row);
    } else {
      buckets.set(bucketKey, [row]);
    }
  }

  return buckets;
}

async function buildComparisonGroups(rows: ImportNormalizedRowRecord[]) {
  const uniqueApproachNames = [
    ...new Set(
      rows
        .map((row) => normalizeText(row.approachName))
        .filter((value): value is string => Boolean(value))
    )
  ];
  const approaches = uniqueApproachNames.length
    ? await db.approach.findMany({
        where: {
          name: {
            in: uniqueApproachNames
          }
        },
        select: {
          id: true,
          name: true
        }
      })
    : [];
  const approachIdByName = new Map(approaches.map((approach) => [approach.name, approach.id]));
  const groups = new Map<string, ComparisonGroupDraft>();

  for (const row of rows) {
    const baseGroup = buildBaseGroupKey(row);
    const approachName = normalizeText(row.approachName);
    const existing = groups.get(baseGroup.groupKey);

    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(baseGroup.groupKey, {
      groupKey: baseGroup.groupKey,
      groupLabel: baseGroup.groupLabel,
      approachId: approachName ? approachIdByName.get(approachName) ?? null : null,
      approachName,
      funnelKey: baseGroup.funnelKey,
      globalGroupKey: normalizeText(row.globalGroupKey) ?? normalizeText(row.comparisonGroupKey) ?? null,
      rows: [row],
      rowCount: 0,
      resultRowCount: 0,
      evaluationMode: AnalyzerEvaluationMode.PROXY_MODE,
      confidenceLevel: AnalyzerConfidenceLevel.LOW,
      maturityReached: false,
      maturitySummary: "",
      effectiveRules: new Map(),
      campaignSubjects: [],
      adsetSubjects: [],
      creativeSubjects: []
    });
  }

  const resolvedGroups: ComparisonGroupDraft[] = [];

  for (const group of groups.values()) {
    const groupMetrics = aggregateMetrics(group.rows);
    const maturity = determineMaturity(groupMetrics);
    const confidenceLevel = determineConfidence(groupMetrics);
    const evaluationMode = determineEvaluationMode(groupMetrics);
    const effectiveRules = await resolveEffectiveAnalyzerRules({
      approachId: group.approachId,
      funnelKey: group.funnelKey
    });
    const ruleMap = new Map(effectiveRules.map((rule) => [rule.ruleKey, rule]));
    const sharedGroup = {
      groupKey: group.groupKey,
      groupLabel: group.groupLabel,
      approachId: group.approachId,
      approachName: group.approachName,
      funnelKey: group.funnelKey,
      globalGroupKey: group.globalGroupKey
    } satisfies Pick<
      ComparisonGroupDraft,
      "groupKey" | "groupLabel" | "approachId" | "approachName" | "funnelKey" | "globalGroupKey"
    >;
    const campaignSubjects = assignCampaignRanks(
      [...buildSubjectBuckets(group.rows, "campaign").values()].map((subjectRows) =>
        buildSubjectAggregate({
          subjectType: "campaign",
          subjectLabel: normalizeText(subjectRows[0]?.campaignName) ?? "Campaign",
          rows: subjectRows,
          group: sharedGroup
        })
      )
    );
    const adsetSubjects = [...buildSubjectBuckets(group.rows, "adset").values()].map((subjectRows) =>
      buildSubjectAggregate({
        subjectType: "adset",
        subjectLabel: normalizeText(subjectRows[0]?.adsetName) ?? "Ad set",
        rows: subjectRows,
        group: sharedGroup
      })
    );
    const creativeSubjects = [...buildSubjectBuckets(group.rows, "creative").values()].map((subjectRows) =>
      buildSubjectAggregate({
        subjectType: "creative",
        subjectLabel: normalizeText(subjectRows[0]?.adName) ?? "Creative",
        rows: subjectRows,
        group: sharedGroup
      })
    );

    resolvedGroups.push({
      ...group,
      rowCount: group.rows.length,
      resultRowCount: group.rows.filter((row) => row.hasResults || (row.results ?? 0) > 0).length,
      evaluationMode,
      confidenceLevel,
      maturityReached: maturity.reached,
      maturitySummary: maturity.summary,
      effectiveRules: ruleMap,
      campaignSubjects,
      adsetSubjects,
      creativeSubjects
    });
  }

  return resolvedGroups.sort((left, right) => left.groupLabel.localeCompare(right.groupLabel));
}

function getRule(group: ComparisonGroupDraft, ruleKey: string) {
  const rule = group.effectiveRules.get(ruleKey);
  return rule?.enabled ? rule : null;
}

function metricViolatesRule(value: number | null, rule: EffectiveAnalyzerRule | null) {
  if (!rule || value === null) {
    return false;
  }

  const minValue = toNumber(rule.minValue);
  const maxValue = toNumber(rule.maxValue);

  if (minValue !== null && value < minValue) {
    return true;
  }

  if (maxValue !== null && value > maxValue) {
    return true;
  }

  return false;
}

function buildPositiveAlert(subject: SubjectAggregate): AlertDraft | null {
  if (!subject.resultsPresent || subject.confidenceLevel === AnalyzerConfidenceLevel.LOW) {
    return null;
  }

  return {
    comparisonGroupKey: subject.groupKey,
    analyzerResultSubjectKey: subject.subjectKey,
    kind: AnalyzerAlertKind.CONVERSION_ARRIVAL,
    severity: AlertSeverity.INFO,
    reasonCode: null,
    evaluationMode: subject.evaluationMode,
    confidenceLevel: subject.confidenceLevel,
    maturityReached: subject.maturityReached,
    destinationTopicKey: "conversions",
    title: `Есть результаты: ${subject.subjectLabel}`,
    summary: `${subject.groupLabel}. Результатов: ${formatInteger(subject.metrics.results)}, CPA: ${formatCurrency(subject.metrics.costPerResult)}, расход: ${formatCurrency(subject.metrics.spend)}.`,
    cooldownKey: `${subject.subjectKey}:conversion_arrival`,
    alertPayload: {
      subjectType: subject.subjectType,
      rank: subject.rank,
      metrics: buildMetricsSummary(subject.metrics)
    } satisfies Prisma.InputJsonValue
  };
}

function buildCampaignReviewAlert(subject: SubjectAggregate, group: ComparisonGroupDraft): AlertDraft | null {
  const outboundCtrRule = getRule(group, "outbound_ctr");
  const cplpvRule = getRule(group, "cplpv");
  const violatedRules = [
    metricViolatesRule(subject.metrics.outboundCtr, outboundCtrRule) ? outboundCtrRule : null,
    metricViolatesRule(subject.metrics.cplpv, cplpvRule) ? cplpvRule : null
  ].filter(Boolean) as EffectiveAnalyzerRule[];

  const resultAwarePeers = group.campaignSubjects.filter(
    (candidate) => candidate.resultsPresent && candidate.metrics.costPerResult !== null
  );
  const bestPeer = [...resultAwarePeers].sort((left, right) => {
    const leftCost = left.metrics.costPerResult ?? Number.POSITIVE_INFINITY;
    const rightCost = right.metrics.costPerResult ?? Number.POSITIVE_INFINITY;
    return leftCost - rightCost;
  })[0];
  const hasResultWeakness =
    subject.resultsPresent &&
    subject.maturityReached &&
    Boolean(bestPeer) &&
    bestPeer.subjectKey !== subject.subjectKey &&
    subject.metrics.costPerResult !== null &&
    (bestPeer.metrics.costPerResult ?? Number.POSITIVE_INFINITY) > 0 &&
    subject.metrics.costPerResult >
      (bestPeer.metrics.costPerResult ?? Number.POSITIVE_INFINITY) * 1.35;

  if (hasResultWeakness) {
    return {
      comparisonGroupKey: subject.groupKey,
      analyzerResultSubjectKey: subject.subjectKey,
      kind: AnalyzerAlertKind.WEAK_PERFORMANCE,
      severity: AlertSeverity.WARNING,
      reasonCode: "result_weakness",
      evaluationMode: subject.evaluationMode,
      confidenceLevel: subject.confidenceLevel,
      maturityReached: subject.maturityReached,
      destinationTopicKey: "needs_review",
      title: `Нужна проверка: ${subject.subjectLabel}`,
      summary: `CPA ${formatCurrency(subject.metrics.costPerResult)} — слабее лучшего (${formatCurrency(bestPeer?.metrics.costPerResult)}) в группе ${subject.groupLabel}.`,
      cooldownKey: `${subject.subjectKey}:result_weakness`,
      alertPayload: {
        subjectType: subject.subjectType,
        bestPeer: bestPeer
          ? {
              subjectLabel: bestPeer.subjectLabel,
              costPerResult: bestPeer.metrics.costPerResult,
              rank: bestPeer.rank
            }
          : null,
        metrics: buildMetricsSummary(subject.metrics)
      } satisfies Prisma.InputJsonValue
    };
  }

  if (!subject.maturityReached || !violatedRules.length) {
    return null;
  }

  const severity = violatedRules.reduce<AlertSeverity>(
    (current, rule) => maxSeverity(current, mapSeverity(rule.severity)),
    AlertSeverity.WARNING
  );
  const reasonCode = violatedRules.length >= 2 ? "weak_metrics" : "mixed_signal";
  const metricsSummary = violatedRules
    .map((rule) => {
      if (rule.ruleKey === "outbound_ctr") {
        return `Outbound CTR ${formatPercent(subject.metrics.outboundCtr)} при min ${formatPercent(toNumber(rule.minValue))}`;
      }

      if (rule.ruleKey === "cplpv") {
        return `CPLPV ${formatCurrency(subject.metrics.cplpv)} при max ${formatCurrency(toNumber(rule.maxValue))}`;
      }

      return rule.ruleLabel;
    })
    .join("; ");

  return {
    comparisonGroupKey: subject.groupKey,
    analyzerResultSubjectKey: subject.subjectKey,
    kind: AnalyzerAlertKind.WEAK_PERFORMANCE,
    severity,
    reasonCode,
    evaluationMode: subject.evaluationMode,
    confidenceLevel: subject.confidenceLevel,
    maturityReached: subject.maturityReached,
    destinationTopicKey: "needs_review",
    title: `Нужна проверка: ${subject.subjectLabel}`,
    summary: `${metricsSummary}. Группа ${subject.groupLabel}.`,
    cooldownKey: `${subject.subjectKey}:${reasonCode}`,
    alertPayload: {
      subjectType: subject.subjectType,
      violatedRules: violatedRules.map((rule) => rule.ruleKey),
      metrics: buildMetricsSummary(subject.metrics)
    } satisfies Prisma.InputJsonValue
  };
}

function buildSpendNoResultsAlert(
  subject: SubjectAggregate,
  group: ComparisonGroupDraft,
  ruleKey: "spend_no_results_creative" | "spend_no_results_adset"
) {
  const rule = getRule(group, ruleKey);

  if (!rule) {
    return null;
  }

  const threshold = toNumber(rule.spendThreshold);
  const maxResults = rule.maxResults ?? 0;

  if (threshold === null) {
    return null;
  }

  if (subject.metrics.spend < threshold || subject.metrics.results > maxResults) {
    return null;
  }

  const reasonCode = (rule.reasonCode ?? "spend_anomaly") as TelegramNeedsReviewReasonCode;

  return {
    comparisonGroupKey: subject.groupKey,
    analyzerResultSubjectKey: subject.subjectKey,
    kind: AnalyzerAlertKind.SPEND_PACING_RISK,
    severity: mapSeverity(rule.severity),
    reasonCode,
    evaluationMode: subject.evaluationMode,
    confidenceLevel: subject.confidenceLevel,
    maturityReached: subject.maturityReached,
    destinationTopicKey: rule.destinationTopicKey,
    title: `Нужна проверка: ${subject.subjectLabel}`,
    summary: `Расход ${formatCurrency(subject.metrics.spend)} при ${formatInteger(subject.metrics.results)} результатах. Порог: ${formatCurrency(threshold)} (уровень ${subject.subjectType}).`,
    cooldownKey: `${subject.subjectKey}:${reasonCode}`,
    alertPayload: {
      subjectType: subject.subjectType,
      threshold,
      maxResults,
      metrics: buildMetricsSummary(subject.metrics)
    } satisfies Prisma.InputJsonValue
  } satisfies AlertDraft;
}

function buildAlertDrafts(groups: ComparisonGroupDraft[]) {
  const alerts: AlertDraft[] = [];

  for (const group of groups) {
    for (const subject of group.campaignSubjects) {
      const reviewAlert = buildCampaignReviewAlert(subject, group);

      if (reviewAlert) {
        alerts.push(reviewAlert);
        continue;
      }

      const positiveAlert = buildPositiveAlert(subject);

      if (positiveAlert) {
        alerts.push(positiveAlert);
      }
    }

    for (const subject of group.adsetSubjects) {
      const alert = buildSpendNoResultsAlert(subject, group, "spend_no_results_adset");

      if (alert) {
        alerts.push(alert);
      }
    }

    for (const subject of group.creativeSubjects) {
      const alert = buildSpendNoResultsAlert(subject, group, "spend_no_results_creative");

      if (alert) {
        alerts.push(alert);
      }
    }
  }

  const dedupedAlerts = new Map<string, AlertDraft>();

  for (const alert of alerts) {
    const dedupeKey = `${alert.cooldownKey}:${alert.kind}`;
    const existing = dedupedAlerts.get(dedupeKey);

    if (!existing) {
      dedupedAlerts.set(dedupeKey, alert);
      continue;
    }

    if (maxSeverity(existing.severity, alert.severity) === alert.severity) {
      dedupedAlerts.set(dedupeKey, alert);
    }
  }

  return [...dedupedAlerts.values()];
}

async function clearPreviousAnalyzerArtifacts(transaction: Prisma.TransactionClient, importRunId: string) {
  await transaction.notificationDelivery.deleteMany({
    where: {
      importRunId
    }
  });

  await transaction.alertEvent.deleteMany({
    where: {
      importRunId
    }
  });

  await transaction.analyzerResult.deleteMany({
    where: {
      importRunId
    }
  });

  await transaction.analyzerComparisonGroup.deleteMany({
    where: {
      importRunId
    }
  });
}

async function persistAnalyzerArtifacts(importRunId: string, groups: ComparisonGroupDraft[], alerts: AlertDraft[]) {
  return db.$transaction(async (transaction) => {
    await clearPreviousAnalyzerArtifacts(transaction, importRunId);

    const comparisonGroups = [];

    for (const group of groups) {
      const created = await transaction.analyzerComparisonGroup.create({
        data: {
          importRunId,
          approachId: group.approachId,
          groupKey: group.groupKey,
          groupLabel: group.groupLabel,
          globalGroupKey: group.globalGroupKey,
          rowCount: group.rowCount,
          resultRowCount: group.resultRowCount,
          evaluationMode: group.evaluationMode,
          confidenceLevel: group.confidenceLevel,
          maturityReached: group.maturityReached,
          maturitySummary: group.maturitySummary
        },
        select: {
          id: true,
          groupKey: true
        }
      });

      comparisonGroups.push(created);
    }

    const comparisonGroupIdByKey = new Map(comparisonGroups.map((group) => [group.groupKey, group.id]));
    const analyzerResults = [];

    for (const subject of groups.flatMap((group) => [...group.campaignSubjects, ...group.adsetSubjects, ...group.creativeSubjects])) {
      const comparisonGroupId = comparisonGroupIdByKey.get(subject.groupKey);

      if (!comparisonGroupId) {
        continue;
      }

      const created = await transaction.analyzerResult.create({
        data: {
          importRunId,
          comparisonGroupId,
          normalizedRowId: subject.primaryRowId,
          subjectKey: subject.subjectKey,
          subjectLabel: subject.subjectLabel,
          rank: subject.rank,
          score: subject.score,
          evaluationMode: subject.evaluationMode,
          confidenceLevel: subject.confidenceLevel,
          maturityReached: subject.maturityReached,
          resultsPresent: subject.resultsPresent,
          summary: subject.summary,
          resultPayload: subject.resultPayload
        },
        select: {
          id: true,
          subjectKey: true
        }
      });

      analyzerResults.push(created);
    }

    const analyzerResultIdBySubjectKey = new Map(analyzerResults.map((result) => [result.subjectKey, result.id]));
    const alertEvents = [];

    for (const alert of alerts) {
      const created = await transaction.alertEvent.create({
        data: {
          importRunId,
          comparisonGroupId: alert.comparisonGroupKey ? comparisonGroupIdByKey.get(alert.comparisonGroupKey) ?? null : null,
          analyzerResultId: alert.analyzerResultSubjectKey
            ? analyzerResultIdBySubjectKey.get(alert.analyzerResultSubjectKey) ?? null
            : null,
          kind: alert.kind,
          severity: alert.severity,
          reasonCode: alert.reasonCode,
          dispatchMode: getDispatchModeForTopic(alert.destinationTopicKey),
          evaluationMode: alert.evaluationMode,
          confidenceLevel: alert.confidenceLevel,
          maturityReached: alert.maturityReached,
          cooldownKey: alert.cooldownKey,
          destinationTopicKey: alert.destinationTopicKey,
          title: alert.title,
          summary: alert.summary,
          alertPayload: alert.alertPayload
        },
        select: {
          id: true,
          importRunId: true,
          comparisonGroupId: true,
          analyzerResultId: true,
          kind: true,
          severity: true,
          reasonCode: true,
          dispatchMode: true,
          evaluationMode: true,
          confidenceLevel: true,
          maturityReached: true,
          notificationDigestId: true,
          destinationTopicKey: true,
          title: true,
          summary: true,
          createdAt: true
        }
      });

      alertEvents.push(created);
    }

    return {
      comparisonGroups,
      analyzerResults,
      alertEvents
    } satisfies PersistedAnalyzerArtifacts;
  });
}

function shouldNotifyAlert(alert: PersistedAnalyzerArtifacts["alertEvents"][number]) {
  if (alert.kind === AnalyzerAlertKind.IMPORT_ERROR_TECH) {
    return true;
  }

  if (alert.kind === AnalyzerAlertKind.OPPORTUNITY_REVIEW) {
    return alert.confidenceLevel === AnalyzerConfidenceLevel.HIGH;
  }

  if (alert.kind === AnalyzerAlertKind.CONVERSION_ARRIVAL) {
    return alert.confidenceLevel !== AnalyzerConfidenceLevel.LOW;
  }

  if (alert.reasonCode === "mixed_signal") {
    return alert.confidenceLevel !== AnalyzerConfidenceLevel.LOW;
  }

  return true;
}

function buildTelegramDestination(alert: PersistedAnalyzerArtifacts["alertEvents"][number]): TelegramNotificationDestination | null {
  if (!alert.destinationTopicKey) {
    return null;
  }

  if (alert.destinationTopicKey === "needs_review") {
    return {
      topic: "needs_review",
      reasonCode: (alert.reasonCode as TelegramNeedsReviewReasonCode | null) ?? "mixed_signal"
    };
  }

  return {
    topic: alert.destinationTopicKey as Exclude<TelegramTopicKey, "needs_review">
  };
}

function buildTelegramAlertMessage(input: {
  importRunFilename: string;
  alert: PersistedAnalyzerArtifacts["alertEvents"][number];
}) {
  const reasonLine = input.alert.reasonCode ? `Причина: ${input.alert.reasonCode}` : null;
  const confidenceLine = input.alert.confidenceLevel ? `Confidence: ${describeConfidence(input.alert.confidenceLevel)}` : null;
  const modeLine = input.alert.evaluationMode ? `Mode: ${describeMode(input.alert.evaluationMode)}` : null;

  return [
    "FB Ads Ops",
    "",
    input.alert.title,
    input.alert.summary,
    reasonLine,
    confidenceLine,
    modeLine,
    `Import: ${input.importRunFilename}`,
    `Создано: ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(input.alert.createdAt)}`
  ]
    .filter(Boolean)
    .join("\n");
}

async function deliverAlertNotifications(input: {
  importRunId: string;
  importRunFilename: string;
  alertEvents: PersistedAnalyzerArtifacts["alertEvents"];
}): Promise<AlertDeliveryResult> {
  const alertsForDigestQueue: Array<{
    id: string;
    importRunId: string;
    destinationTopicKey: string | null;
    createdAt: Date;
    notificationDigestId: string | null;
  }> = [];
  let deliveredCount = 0;
  let failedDeliveriesCount = 0;
  let skippedDeliveriesCount = 0;

  for (const alert of input.alertEvents) {
    const destination = buildTelegramDestination(alert);
    const dispatchMode = getDispatchModeForTopic(alert.destinationTopicKey);

    if (!destination || !shouldNotifyAlert(alert)) {
      skippedDeliveriesCount += 1;

      await recordNotificationDelivery({
        importRunId: input.importRunId,
        alertEventId: alert.id,
        deliveryStatus: "SKIPPED",
        destinationTopicKey: alert.destinationTopicKey as TelegramTopicKey | null,
        attemptedAt: new Date(),
        errorMessage: destination ? "Delivery policy skipped this alert." : "Alert destination is missing."
      });

      continue;
    }

    if (dispatchMode === NotificationDispatchMode.DIGEST_30M) {
      alertsForDigestQueue.push({
        id: alert.id,
        importRunId: alert.importRunId,
        destinationTopicKey: alert.destinationTopicKey,
        createdAt: alert.createdAt,
        notificationDigestId: alert.notificationDigestId
      });

      continue;
    }

    try {
      const result = await sendTelegramMessage({
        text: buildTelegramAlertMessage({
          importRunFilename: input.importRunFilename,
          alert
        }),
        destination
      });

      if (result.skipped) {
        skippedDeliveriesCount += 1;

        await recordNotificationDelivery({
          importRunId: input.importRunId,
          alertEventId: alert.id,
          deliveryStatus: "SKIPPED",
          destinationTopicKey: alert.destinationTopicKey as TelegramTopicKey | null,
          attemptedAt: new Date(),
          errorMessage: result.reason
        });

        continue;
      }

      deliveredCount += 1;

      await recordNotificationDelivery({
        importRunId: input.importRunId,
        alertEventId: alert.id,
        deliveryStatus: "SENT",
        destinationTopicKey: result.topic,
        telegramChatId: result.chatId,
        telegramThreadId: result.threadId,
        attemptedAt: new Date(),
        deliveredAt: new Date(),
        providerMessageId: result.messageId ? String(result.messageId) : null
      });
    } catch (error) {
      failedDeliveriesCount += 1;

      await recordNotificationDelivery({
        importRunId: input.importRunId,
        alertEventId: alert.id,
        deliveryStatus: "FAILED",
        destinationTopicKey: alert.destinationTopicKey as TelegramTopicKey | null,
        attemptedAt: new Date(),
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Telegram delivery failed.",
        providerPayload:
          error instanceof TelegramSendError && error.retryAfterSeconds
            ? ({
                retryAfterSeconds: error.retryAfterSeconds,
                statusCode: error.statusCode
              } satisfies Prisma.InputJsonValue)
            : undefined
      });
    }
  }

  const digestQueue = await enqueueAlertEventsForDigest(alertsForDigestQueue);

  return {
    queuedDigestAlertsCount: digestQueue.queuedAlertsCount,
    queuedDigestsCount: digestQueue.digestCount,
    deliveredCount,
    failedDeliveriesCount,
    skippedDeliveriesCount
  };
}

export async function notifyImportAnalyzerFailure(input: {
  importRunId: string;
  importRunFilename: string;
  message: string;
}) {
  try {
    const alertEvent = await recordAlertEvent({
      importRunId: input.importRunId,
      kind: AnalyzerAlertKind.IMPORT_ERROR_TECH,
      severity: AlertSeverity.CRITICAL,
      destinationTopicKey: "import_errors_tech",
      title: "Ошибка analyzer pipeline",
      summary: input.message,
      alertPayload: {
        stage: "analyzer_execution",
        message: input.message
      } satisfies Prisma.InputJsonValue
    });

    try {
      const result = await sendTelegramMessage({
        text: buildTelegramAlertMessage({
          importRunFilename: input.importRunFilename,
          alert: alertEvent
        }),
        destination: {
          topic: "import_errors_tech"
        }
      });

      if (result.skipped) {
        await recordNotificationDelivery({
          importRunId: input.importRunId,
          alertEventId: alertEvent.id,
          deliveryStatus: "SKIPPED",
          destinationTopicKey: "import_errors_tech",
          attemptedAt: new Date(),
          errorMessage: result.reason
        });

        return;
      }

      await recordNotificationDelivery({
        importRunId: input.importRunId,
        alertEventId: alertEvent.id,
        deliveryStatus: "SENT",
        destinationTopicKey: result.topic,
        telegramChatId: result.chatId,
        telegramThreadId: result.threadId,
        attemptedAt: new Date(),
        deliveredAt: new Date(),
        providerMessageId: result.messageId ? String(result.messageId) : null
      });
    } catch (error) {
      await recordNotificationDelivery({
        importRunId: input.importRunId,
        alertEventId: alertEvent.id,
        deliveryStatus: "FAILED",
        destinationTopicKey: "import_errors_tech",
        attemptedAt: new Date(),
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Telegram delivery failed."
      });
    }
  } catch {
    return;
  }
}

export async function runImportAnalyzer(importRunId: string): Promise<ImportAnalyzerExecutionResult> {
  const importRun = await db.importRun.findUnique({
    where: {
      id: importRunId
    },
    select: {
      id: true,
      sourceFilename: true,
      normalizedRows: {
        orderBy: {
          sourceRowNumber: "asc"
        },
        select: normalizedRowSelect
      }
    }
  });

  if (!importRun) {
    throw new Error("Import run not found.");
  }

  if (!importRun.normalizedRows.length) {
    throw new Error("Analyzer requires normalized rows.");
  }

  const groups = await buildComparisonGroups(importRun.normalizedRows);
  const alerts = buildAlertDrafts(groups);
  const persistedArtifacts = await persistAnalyzerArtifacts(importRunId, groups, alerts);
  const delivery = await deliverAlertNotifications({
    importRunId,
    importRunFilename: importRun.sourceFilename,
    alertEvents: persistedArtifacts.alertEvents
  });

  return {
    importRunId,
    comparisonGroupsCount: persistedArtifacts.comparisonGroups.length,
    analyzerResultsCount: persistedArtifacts.analyzerResults.length,
    alertEventsCount: persistedArtifacts.alertEvents.length,
    queuedDigestAlertsCount: delivery.queuedDigestAlertsCount,
    queuedDigestsCount: delivery.queuedDigestsCount,
    deliveredCount: delivery.deliveredCount,
    failedDeliveriesCount: delivery.failedDeliveriesCount,
    skippedDeliveriesCount: delivery.skippedDeliveriesCount
  };
}
