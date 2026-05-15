import { ImportLevel, ImportRunStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

export type DashboardFilters = {
  from?: Date;
  to?: Date;
  adAccountId?: string;
  ownerId?: string;
  cabinetIds?: string[];
  cabinetMode?: "include" | "exclude";
};

type BudgetValue = number | "mixed" | null;

type HierarchyMetricFields = {
  delivery: string | null;
  spend: number;
  results: number;
  costPerResult: number | null;
  cpa: number | null;
  cpm: number | null;
  reach: number;
  impressions: number;
  clicksAll: number;
  clicks: number;
  cpcAll: number | null;
  cpc: number | null;
  ctrAll: number | null;
  ctr: number | null;
  frequency: number | null;
  linkClicks: number;
  linkCtr: number | null;
  linkCpc: number | null;
  outboundClicks: number;
  outboundCtr: number | null;
  costPerOutboundClick: number | null;
  landingPageViews: number;
  costPerLandingPageView: number | null;
  cplpv: number | null;
  lpv: number | null;
  budget: BudgetValue;
  intervalSpend: number;
  intervalResults: number;
};

export type HierarchyAdRow = HierarchyMetricFields & {
  adId: string | null;
  adName: string;
};

export type HierarchyAdSetRow = HierarchyMetricFields & {
  adSetId: string | null;
  adSetName: string;
  campaignId: string | null;
  ads: HierarchyAdRow[];
};

export type HierarchyCampaignRow = HierarchyMetricFields & {
  campaignId: string | null;
  campaignName: string;
  approachName: string | null;
  adSets: HierarchyAdSetRow[];
};

export type CampaignHierarchySnapshot = {
  importRunId: string | null;
  reportDate: Date | null;
  campaigns: HierarchyCampaignRow[];
};

type ExtractedAdditionalMetrics = {
  delivery: string | null;
  campaignDelivery: string | null;
  adSetDelivery: string | null;
  adDelivery: string | null;
  reach: number | null;
  clicksAll: number | null;
  linkClicks: number | null;
  outboundClicks: number | null;
  landingPageViews: number | null;
  frequency: number | null;
  budget: number | null;
};

type EntityRecord = {
  entityKey: string;
  importLevel: ImportLevel;
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  campaignName: string | null;
  adsetName: string | null;
  adName: string | null;
  approachName: string | null;
  totalSpend: number;
  totalResults: number;
  totalReach: number;
  totalImpressions: number;
  totalClicksAll: number;
  totalLinkClicks: number;
  totalOutboundClicks: number;
  totalLandingPageViews: number;
  intervalSpend: number;
  intervalResults: number;
  deliveryValues: Set<string>;
  budgetValues: Set<number>;
  latestFrequency: number | null;
};

function toNum(value: unknown): number {
  if (value == null) return 0;
  const numericValue =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function toNumOrNull(value: unknown): number | null {
  if (value == null) return null;
  const numericValue =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function buildEntityKey(
  importLevel: ImportLevel,
  campaignId: string | null,
  adSetId: string | null,
  adId: string | null,
  campaignName: string | null,
  adsetName: string | null,
  adName: string | null
): string {
  return campaignId
    ? `${importLevel}|${campaignId}|${adSetId ?? ""}|${adId ?? ""}`
    : `${importLevel}|${campaignName ?? ""}|${adsetName ?? ""}|${adName ?? ""}`;
}

function extractAdditionalMetrics(payload: unknown): ExtractedAdditionalMetrics {
  const p = readRecord(payload);
  const additional = readRecord(p?.additionalMetrics);

  return {
    delivery: typeof additional?.delivery === "string" ? additional.delivery : null,
    campaignDelivery: typeof additional?.campaignDelivery === "string" ? additional.campaignDelivery : null,
    adSetDelivery: typeof additional?.adSetDelivery === "string" ? additional.adSetDelivery : null,
    adDelivery: typeof additional?.adDelivery === "string" ? additional.adDelivery : null,
    reach: toNumOrNull(additional?.reach),
    clicksAll: toNumOrNull(additional?.clicksAll),
    linkClicks: toNumOrNull(additional?.linkClicks),
    outboundClicks: toNumOrNull(additional?.outboundClicks),
    landingPageViews: toNumOrNull(additional?.landingPageViews),
    frequency: toNumOrNull(additional?.frequency),
    budget: toNumOrNull(additional?.budget),
  };
}

function deliveryForLevel(importLevel: ImportLevel, metrics: ExtractedAdditionalMetrics): string | null {
  if (importLevel === ImportLevel.CAMPAIGN) return metrics.campaignDelivery ?? metrics.delivery;
  if (importLevel === ImportLevel.AD_SET) return metrics.adSetDelivery ?? metrics.delivery;
  return metrics.adDelivery ?? metrics.delivery;
}

function addContextValue(values: Set<string>, value: string | null) {
  const normalized = value?.trim();
  if (normalized) values.add(normalized);
}

function addBudgetValue(values: Set<number>, value: number | null) {
  if (value !== null && Number.isFinite(value)) values.add(value);
}

function resolveTextContext(values: Iterable<string>): string | null {
  const unique = [...new Set([...values].filter(Boolean))];
  if (unique.length === 0) return null;
  return unique.length === 1 ? unique[0] : "mixed";
}

function resolveBudgetContext(values: Iterable<number>): BudgetValue {
  const unique = [...new Set([...values].filter(Number.isFinite))];
  if (unique.length === 0) return null;
  return unique.length === 1 ? unique[0] : "mixed";
}

function buildMetricFields(input: {
  spend: number;
  results: number;
  reach: number;
  impressions: number;
  clicksAll: number;
  linkClicks: number;
  outboundClicks: number;
  landingPageViews: number;
  delivery: string | null;
  budget: BudgetValue;
  intervalSpend: number;
  intervalResults: number;
  fallbackFrequency?: number | null;
}): HierarchyMetricFields {
  const costPerResult = safeDivide(input.spend, input.results);
  const cpmBase = safeDivide(input.spend, input.impressions);
  const cpm = cpmBase === null ? null : cpmBase * 1000;
  const cpcAll = safeDivide(input.spend, input.clicksAll);
  const ctrAllBase = safeDivide(input.clicksAll, input.impressions);
  const ctrAll = ctrAllBase === null ? null : ctrAllBase * 100;
  const linkCpc = safeDivide(input.spend, input.linkClicks);
  const linkCtrBase = safeDivide(input.linkClicks, input.impressions);
  const linkCtr = linkCtrBase === null ? null : linkCtrBase * 100;
  const costPerOutboundClick = safeDivide(input.spend, input.outboundClicks);
  const outboundCtrBase = safeDivide(input.outboundClicks, input.impressions);
  const outboundCtr = outboundCtrBase === null ? null : outboundCtrBase * 100;
  const costPerLandingPageView = safeDivide(input.spend, input.landingPageViews);
  const frequencyFromTotals = safeDivide(input.impressions, input.reach);
  const frequency = frequencyFromTotals ?? input.fallbackFrequency ?? null;

  return {
    delivery: input.delivery,
    spend: input.spend,
    results: input.results,
    costPerResult,
    cpa: costPerResult,
    cpm,
    reach: input.reach,
    impressions: input.impressions,
    clicksAll: input.clicksAll,
    clicks: input.clicksAll,
    cpcAll,
    cpc: cpcAll,
    ctrAll,
    ctr: linkCtr,
    frequency,
    linkClicks: input.linkClicks,
    linkCtr,
    linkCpc,
    outboundClicks: input.outboundClicks,
    outboundCtr,
    costPerOutboundClick,
    landingPageViews: input.landingPageViews,
    costPerLandingPageView,
    cplpv: costPerLandingPageView,
    lpv: input.landingPageViews || null,
    budget: input.budget,
    intervalSpend: input.intervalSpend,
    intervalResults: input.intervalResults,
  };
}

function buildMetricFieldsFromEntity(entity: EntityRecord): HierarchyMetricFields {
  return buildMetricFields({
    spend: entity.totalSpend,
    results: entity.totalResults,
    reach: entity.totalReach,
    impressions: entity.totalImpressions,
    clicksAll: entity.totalClicksAll,
    linkClicks: entity.totalLinkClicks,
    outboundClicks: entity.totalOutboundClicks,
    landingPageViews: entity.totalLandingPageViews,
    delivery: resolveTextContext(entity.deliveryValues),
    budget: resolveBudgetContext(entity.budgetValues),
    intervalSpend: entity.intervalSpend,
    intervalResults: entity.intervalResults,
    fallbackFrequency: entity.latestFrequency,
  });
}

function buildAdRow(entity: EntityRecord): HierarchyAdRow {
  return {
    adId: entity.adId,
    adName: entity.adName ?? "",
    ...buildMetricFieldsFromEntity(entity),
  };
}

function buildAdSetRow(entity: EntityRecord, ads: HierarchyAdRow[]): HierarchyAdSetRow {
  return {
    adSetId: entity.adSetId,
    adSetName: entity.adsetName ?? "",
    campaignId: entity.campaignId,
    ...buildMetricFieldsFromEntity(entity),
    ads,
  };
}

function buildCampaignRow(entity: EntityRecord, adSets: HierarchyAdSetRow[]): HierarchyCampaignRow {
  return {
    campaignId: entity.campaignId,
    campaignName: entity.campaignName ?? "",
    approachName: entity.approachName,
    ...buildMetricFieldsFromEntity(entity),
    adSets,
  };
}

function aggregateBudgetFromRows(rows: { budget: BudgetValue }[]): BudgetValue {
  const budgets = rows.map((row) => row.budget);
  if (budgets.some((budget) => budget === "mixed")) return "mixed";
  return resolveBudgetContext(budgets.filter((budget): budget is number => typeof budget === "number"));
}

function aggregateIntoAdSet(adSetName: string, campaignId: string | null, ads: HierarchyAdRow[]): HierarchyAdSetRow {
  const reach = ads.reduce((sum, row) => sum + row.reach, 0);
  const impressions = ads.reduce((sum, row) => sum + row.impressions, 0);

  return {
    adSetId: null,
    adSetName,
    campaignId,
    ...buildMetricFields({
      spend: ads.reduce((sum, row) => sum + row.spend, 0),
      results: ads.reduce((sum, row) => sum + row.results, 0),
      reach,
      impressions,
      clicksAll: ads.reduce((sum, row) => sum + row.clicksAll, 0),
      linkClicks: ads.reduce((sum, row) => sum + row.linkClicks, 0),
      outboundClicks: ads.reduce((sum, row) => sum + row.outboundClicks, 0),
      landingPageViews: ads.reduce((sum, row) => sum + row.landingPageViews, 0),
      delivery: resolveTextContext(ads.map((row) => row.delivery).filter((value): value is string => Boolean(value))),
      budget: aggregateBudgetFromRows(ads),
      intervalSpend: ads.reduce((sum, row) => sum + row.intervalSpend, 0),
      intervalResults: ads.reduce((sum, row) => sum + row.intervalResults, 0),
      fallbackFrequency: null,
    }),
    ads,
  };
}

function aggregateIntoCampaign(
  campaignName: string,
  approachName: string | null,
  adSets: HierarchyAdSetRow[]
): HierarchyCampaignRow {
  const reach = adSets.reduce((sum, row) => sum + row.reach, 0);
  const impressions = adSets.reduce((sum, row) => sum + row.impressions, 0);

  return {
    campaignId: null,
    campaignName,
    approachName,
    ...buildMetricFields({
      spend: adSets.reduce((sum, row) => sum + row.spend, 0),
      results: adSets.reduce((sum, row) => sum + row.results, 0),
      reach,
      impressions,
      clicksAll: adSets.reduce((sum, row) => sum + row.clicksAll, 0),
      linkClicks: adSets.reduce((sum, row) => sum + row.linkClicks, 0),
      outboundClicks: adSets.reduce((sum, row) => sum + row.outboundClicks, 0),
      landingPageViews: adSets.reduce((sum, row) => sum + row.landingPageViews, 0),
      delivery: resolveTextContext(adSets.map((row) => row.delivery).filter((value): value is string => Boolean(value))),
      budget: aggregateBudgetFromRows(adSets),
      intervalSpend: adSets.reduce((sum, row) => sum + row.intervalSpend, 0),
      intervalResults: adSets.reduce((sum, row) => sum + row.intervalResults, 0),
      fallbackFrequency: null,
    }),
    adSets,
  };
}

export async function getCampaignHierarchySnapshot(
  filters: DashboardFilters = {}
): Promise<CampaignHierarchySnapshot> {
  const { from, to, ownerId } = filters;
  const cabinetMode = filters.cabinetMode === "exclude" ? "exclude" : "include";
  const requestedCabinetIds = [
    ...(filters.cabinetIds ?? []),
    ...(filters.adAccountId ? [filters.adAccountId] : []),
  ]
    .map((id) => id.trim())
    .filter(Boolean);

  const needsCabinetScope = Boolean(ownerId || requestedCabinetIds.length);
  let scopedCabinetIds: string[] | null = null;

  if (needsCabinetScope) {
    const activeCabinets = await db.adAccount.findMany({
      where: {
        isActive: true,
        ...(ownerId ? { ownerId } : {}),
      },
      select: { id: true },
    });
    const baseAllowedIds = activeCabinets.map((cabinet) => cabinet.id);
    const baseAllowedSet = new Set(baseAllowedIds);
    const selectedIds = [...new Set(requestedCabinetIds)].filter((id) => baseAllowedSet.has(id));

    if (selectedIds.length && cabinetMode === "include") {
      scopedCabinetIds = baseAllowedIds.filter((id) => selectedIds.includes(id));
    } else if (selectedIds.length && cabinetMode === "exclude") {
      const excluded = new Set(selectedIds);
      scopedCabinetIds = baseAllowedIds.filter((id) => !excluded.has(id));
    } else if (ownerId) {
      scopedCabinetIds = baseAllowedIds;
    } else {
      scopedCabinetIds = null;
    }
  }

  const importRunFilter: Prisma.ImportRunWhereInput = {
    isActive: true,
    processingStatus: ImportRunStatus.COMPLETED,
    ...(scopedCabinetIds ? { adAccountId: { in: scopedCabinetIds } } : {}),
  };

  const where: Prisma.ImportNormalizedRowWhereInput = {
    isActive: true,
    ...(scopedCabinetIds ? { adAccountId: { in: scopedCabinetIds } } : {}),
    importRun: importRunFilter,
    ...((from || to)
      ? {
          reportDate: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const rows = await db.importNormalizedRow.findMany({
    where,
    select: {
      importLevel: true,
      campaignId: true,
      adSetId: true,
      adId: true,
      campaignName: true,
      adsetName: true,
      adName: true,
      approachName: true,
      reportDate: true,
      spend: true,
      results: true,
      impressions: true,
      clicks: true,
      intervalSpend: true,
      intervalResults: true,
      normalizedPayload: true,
    },
    orderBy: { reportDate: "asc" },
  });

  if (rows.length === 0) {
    return { importRunId: null, reportDate: null, campaigns: [] };
  }

  const entityMap = new Map<string, EntityRecord>();
  let latestReportDate: Date | null = null;

  for (const row of rows) {
    const key = buildEntityKey(
      row.importLevel,
      row.campaignId,
      row.adSetId,
      row.adId,
      row.campaignName,
      row.adsetName,
      row.adName
    );
    const additionalMetrics = extractAdditionalMetrics(row.normalizedPayload);
    const rowSpend = toNum(row.spend);
    const rowResults = row.results ?? 0;
    const rowImpressions = row.impressions ?? 0;
    const rowClicksAll = row.clicks ?? Math.round(additionalMetrics.clicksAll ?? 0);
    const rowReach = Math.round(additionalMetrics.reach ?? 0);
    const rowLinkClicks = Math.round(additionalMetrics.linkClicks ?? 0);
    const rowOutboundClicks = Math.round(additionalMetrics.outboundClicks ?? 0);
    const rowLandingPageViews = Math.round(additionalMetrics.landingPageViews ?? 0);

    if (row.reportDate && (!latestReportDate || row.reportDate > latestReportDate)) {
      latestReportDate = row.reportDate;
    }

    const existing = entityMap.get(key);
    if (!existing) {
      const deliveryValues = new Set<string>();
      const budgetValues = new Set<number>();
      addContextValue(deliveryValues, deliveryForLevel(row.importLevel, additionalMetrics));
      addBudgetValue(budgetValues, additionalMetrics.budget);

      entityMap.set(key, {
        entityKey: key,
        importLevel: row.importLevel,
        campaignId: row.campaignId,
        adSetId: row.adSetId,
        adId: row.adId,
        campaignName: row.campaignName,
        adsetName: row.adsetName,
        adName: row.adName,
        approachName: row.approachName,
        totalSpend: rowSpend,
        totalResults: rowResults,
        totalReach: rowReach,
        totalImpressions: rowImpressions,
        totalClicksAll: rowClicksAll,
        totalLinkClicks: rowLinkClicks,
        totalOutboundClicks: rowOutboundClicks,
        totalLandingPageViews: rowLandingPageViews,
        intervalSpend: toNum(row.intervalSpend),
        intervalResults: row.intervalResults ?? 0,
        deliveryValues,
        budgetValues,
        latestFrequency: additionalMetrics.frequency,
      });
    } else {
      existing.totalSpend += rowSpend;
      existing.totalResults += rowResults;
      existing.totalReach += rowReach;
      existing.totalImpressions += rowImpressions;
      existing.totalClicksAll += rowClicksAll;
      existing.totalLinkClicks += rowLinkClicks;
      existing.totalOutboundClicks += rowOutboundClicks;
      existing.totalLandingPageViews += rowLandingPageViews;
      existing.intervalSpend += toNum(row.intervalSpend);
      existing.intervalResults += row.intervalResults ?? 0;
      addContextValue(existing.deliveryValues, deliveryForLevel(row.importLevel, additionalMetrics));
      addBudgetValue(existing.budgetValues, additionalMetrics.budget);
      existing.latestFrequency = additionalMetrics.frequency ?? existing.latestFrequency;
    }
  }

  const entityRecords = [...entityMap.values()];
  const campaignEntities = entityRecords.filter((row) => row.importLevel === ImportLevel.CAMPAIGN);
  const adSetEntities = entityRecords.filter((row) => row.importLevel === ImportLevel.AD_SET);
  const adEntities = entityRecords.filter((row) => row.importLevel === ImportLevel.AD);

  const adsByAdSetId = new Map<string, HierarchyAdRow[]>();
  const adsByAdSetName = new Map<string, HierarchyAdRow[]>();

  for (const ad of adEntities) {
    const adRow = buildAdRow(ad);
    if (ad.adSetId) {
      const list = adsByAdSetId.get(ad.adSetId) ?? [];
      list.push(adRow);
      adsByAdSetId.set(ad.adSetId, list);
    } else {
      const key = ad.adsetName ?? "";
      const list = adsByAdSetName.get(key) ?? [];
      list.push(adRow);
      adsByAdSetName.set(key, list);
    }
  }

  const adSetsByCampaignId = new Map<string, HierarchyAdSetRow[]>();
  const adSetsByCampaignName = new Map<string, HierarchyAdSetRow[]>();

  if (adSetEntities.length > 0) {
    for (const adSet of adSetEntities) {
      const ads =
        (adSet.adSetId ? adsByAdSetId.get(adSet.adSetId) : adsByAdSetName.get(adSet.adsetName ?? "")) ?? [];
      const row = buildAdSetRow(adSet, ads);

      if (adSet.campaignId) {
        const list = adSetsByCampaignId.get(adSet.campaignId) ?? [];
        list.push(row);
        adSetsByCampaignId.set(adSet.campaignId, list);
      } else {
        const campaignName = adSet.campaignName ?? "";
        const list = adSetsByCampaignName.get(campaignName) ?? [];
        list.push(row);
        adSetsByCampaignName.set(campaignName, list);
      }
    }
  } else {
    for (const [adSetId, ads] of adsByAdSetId) {
      const firstAd = adEntities.find((row) => row.adSetId === adSetId);
      const row = aggregateIntoAdSet(firstAd?.adsetName ?? adSetId, firstAd?.campaignId ?? null, ads);

      const campaignId = firstAd?.campaignId;
      if (campaignId) {
        const list = adSetsByCampaignId.get(campaignId) ?? [];
        list.push(row);
        adSetsByCampaignId.set(campaignId, list);
      } else {
        const campaignName = firstAd?.campaignName ?? "";
        const list = adSetsByCampaignName.get(campaignName) ?? [];
        list.push(row);
        adSetsByCampaignName.set(campaignName, list);
      }
    }

    for (const [adSetName, ads] of adsByAdSetName) {
      const firstAd = adEntities.find((row) => (row.adsetName ?? "") === adSetName);
      const row = aggregateIntoAdSet(adSetName, firstAd?.campaignId ?? null, ads);
      const campaignName = firstAd?.campaignName ?? "";
      const list = adSetsByCampaignName.get(campaignName) ?? [];
      list.push(row);
      adSetsByCampaignName.set(campaignName, list);
    }
  }

  const campaigns: HierarchyCampaignRow[] = [];

  if (campaignEntities.length > 0) {
    for (const campaign of campaignEntities) {
      const adSets =
        (campaign.campaignId
          ? adSetsByCampaignId.get(campaign.campaignId)
          : adSetsByCampaignName.get(campaign.campaignName ?? "")) ?? [];
      campaigns.push(buildCampaignRow(campaign, adSets));
    }
  } else {
    for (const [campaignId, adSets] of adSetsByCampaignId) {
      const firstAdSet =
        adSetEntities.find((row) => row.campaignId === campaignId) ??
        adEntities.find((row) => row.campaignId === campaignId);
      campaigns.push(
        aggregateIntoCampaign(
          firstAdSet?.campaignName ?? campaignId,
          firstAdSet?.approachName ?? null,
          adSets
        )
      );
    }

    for (const [campaignName, adSets] of adSetsByCampaignName) {
      const firstAdSet = adEntities.find((row) => (row.campaignName ?? "") === campaignName);
      campaigns.push(aggregateIntoCampaign(campaignName, firstAdSet?.approachName ?? null, adSets));
    }
  }

  campaigns.sort((left, right) => right.spend - left.spend);

  return {
    importRunId: null,
    reportDate: latestReportDate,
    campaigns,
  };
}
