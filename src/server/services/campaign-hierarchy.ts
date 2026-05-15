import { ImportLevel, ImportRunStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";

// ── Filter type ───────────────────────────────────────────────────────────────

export type DashboardFilters = {
  from?: Date;
  to?: Date;
  adAccountId?: string;
  ownerId?: string;
};

// ── Public row types ──────────────────────────────────────────────────────────

export type HierarchyAdRow = {
  adId: string | null;
  adName: string;
  delivery: string | null;
  spend: number;
  results: number;
  cpa: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  lpv: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  intervalSpend: number;
  intervalResults: number;
};

export type HierarchyAdSetRow = {
  adSetId: string | null;
  adSetName: string;
  campaignId: string | null;
  delivery: string | null;
  spend: number;
  results: number;
  cpa: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  lpv: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  intervalSpend: number;
  intervalResults: number;
  ads: HierarchyAdRow[];
};

export type HierarchyCampaignRow = {
  campaignId: string | null;
  campaignName: string;
  approachName: string | null;
  delivery: string | null;
  spend: number;
  results: number;
  cpa: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
  lpv: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cpm: number | null;
  cpc: number | null;
  intervalSpend: number;
  intervalResults: number;
  adSets: HierarchyAdSetRow[];
};

export type CampaignHierarchySnapshot = {
  importRunId: string | null;
  reportDate: Date | null;
  campaigns: HierarchyCampaignRow[];
};

// ── Internal aggregate record ─────────────────────────────────────────────────

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
  totalImpressions: number;
  totalClicks: number;
  dailySpend: number;
  dailyResults: number;
  normalizedPayload: unknown;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n =
    typeof v === "object" && v !== null && "toNumber" in v
      ? (v as { toNumber(): number }).toNumber()
      : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n =
    typeof v === "object" && v !== null && "toNumber" in v
      ? (v as { toNumber(): number }).toNumber()
      : Number(v);
  return Number.isFinite(n) ? n : null;
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

function extractAdditionalMetrics(payload: unknown): {
  outboundCtr: number | null;
  cplpv: number | null;
  delivery: string | null;
} {
  const p = payload as Record<string, unknown> | null;
  const additional = p?.additionalMetrics as Record<string, unknown> | null;
  return {
    outboundCtr: toNumOrNull(additional?.outboundCtr),
    cplpv: toNumOrNull(additional?.cplpv),
    delivery: typeof additional?.delivery === "string" ? additional.delivery : null
  };
}

// ── Row builders ──────────────────────────────────────────────────────────────

function buildAdRow(entity: EntityRecord): HierarchyAdRow {
  const { outboundCtr, cplpv, delivery } = extractAdditionalMetrics(entity.normalizedPayload);
  const payload = entity.normalizedPayload as Record<string, unknown> | null;
  const source = payload?.source as Record<string, unknown> | null;
  const ctx = source?.sourceContext as Record<string, unknown> | null;
  const adDelivery = typeof ctx?.adDelivery === "string" ? ctx.adDelivery : delivery;

  const spend = entity.totalSpend;
  const results = entity.totalResults;
  const impressions = entity.totalImpressions;
  const clicks = entity.totalClicks;

  return {
    adId: entity.adId,
    adName: entity.adName ?? "",
    delivery: adDelivery,
    spend,
    results,
    cpa: results > 0 ? spend / results : null,
    outboundCtr,
    cplpv,
    lpv: cplpv && cplpv > 0 ? Math.round(spend / cplpv) : null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    intervalSpend: entity.dailySpend,
    intervalResults: entity.dailyResults
  };
}

function buildAdSetRow(entity: EntityRecord, ads: HierarchyAdRow[]): HierarchyAdSetRow {
  const { outboundCtr, cplpv, delivery } = extractAdditionalMetrics(entity.normalizedPayload);

  const spend = entity.totalSpend;
  const results = entity.totalResults;
  const impressions = entity.totalImpressions;
  const clicks = entity.totalClicks;

  return {
    adSetId: entity.adSetId,
    adSetName: entity.adsetName ?? "",
    campaignId: entity.campaignId,
    delivery,
    spend,
    results,
    cpa: results > 0 ? spend / results : null,
    outboundCtr,
    cplpv,
    lpv: cplpv && cplpv > 0 ? Math.round(spend / cplpv) : null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    intervalSpend: entity.dailySpend,
    intervalResults: entity.dailyResults,
    ads
  };
}

function buildCampaignRow(entity: EntityRecord, adSets: HierarchyAdSetRow[]): HierarchyCampaignRow {
  const { outboundCtr, cplpv, delivery } = extractAdditionalMetrics(entity.normalizedPayload);

  const spend = entity.totalSpend;
  const results = entity.totalResults;
  const impressions = entity.totalImpressions;
  const clicks = entity.totalClicks;

  return {
    campaignId: entity.campaignId,
    campaignName: entity.campaignName ?? "",
    approachName: entity.approachName,
    delivery,
    spend,
    results,
    cpa: results > 0 ? spend / results : null,
    outboundCtr,
    cplpv,
    lpv: cplpv && cplpv > 0 ? Math.round(spend / cplpv) : null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    intervalSpend: entity.dailySpend,
    intervalResults: entity.dailyResults,
    adSets
  };
}

function aggregateIntoAdSet(adSetName: string, campaignId: string | null, ads: HierarchyAdRow[]): HierarchyAdSetRow {
  const spend = ads.reduce((s, r) => s + r.spend, 0);
  const results = ads.reduce((s, r) => s + r.results, 0);
  const impressions = ads.reduce((s, r) => s + r.impressions, 0);
  const clicks = ads.reduce((s, r) => s + r.clicks, 0);
  const lpv = ads.reduce((s, r) => s + (r.lpv ?? 0), 0);
  const intervalSpend = ads.reduce((s, r) => s + r.intervalSpend, 0);
  const intervalResults = ads.reduce((s, r) => s + r.intervalResults, 0);

  return {
    adSetId: null,
    adSetName,
    campaignId,
    delivery: null,
    spend,
    results,
    cpa: results > 0 ? spend / results : null,
    outboundCtr: null,
    cplpv: null,
    lpv: lpv || null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    intervalSpend,
    intervalResults,
    ads
  };
}

function aggregateIntoCampaign(
  campaignName: string,
  approachName: string | null,
  adSets: HierarchyAdSetRow[]
): HierarchyCampaignRow {
  const spend = adSets.reduce((s, r) => s + r.spend, 0);
  const results = adSets.reduce((s, r) => s + r.results, 0);
  const impressions = adSets.reduce((s, r) => s + r.impressions, 0);
  const clicks = adSets.reduce((s, r) => s + r.clicks, 0);
  const lpv = adSets.reduce((s, r) => s + (r.lpv ?? 0), 0);
  const intervalSpend = adSets.reduce((s, r) => s + r.intervalSpend, 0);
  const intervalResults = adSets.reduce((s, r) => s + r.intervalResults, 0);

  return {
    campaignId: null,
    campaignName,
    approachName,
    delivery: null,
    spend,
    results,
    cpa: results > 0 ? spend / results : null,
    outboundCtr: null,
    cplpv: null,
    lpv: lpv || null,
    impressions,
    clicks,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : null,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : null,
    cpc: clicks > 0 ? spend / clicks : null,
    intervalSpend,
    intervalResults,
    adSets
  };
}

// ── Main snapshot function ────────────────────────────────────────────────────

export async function getCampaignHierarchySnapshot(
  filters: DashboardFilters = {}
): Promise<CampaignHierarchySnapshot> {
  const { from, to, adAccountId, ownerId } = filters;

  const importRunFilter: Prisma.ImportRunWhereInput = {
    isActive: true,
    processingStatus: ImportRunStatus.COMPLETED,
    ...(adAccountId ? { adAccountId } : {}),
    ...(ownerId ? { adAccount: { ownerId } } : {}),
  };

  const where: Prisma.ImportNormalizedRowWhereInput = {
    isActive: true,
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
      normalizedPayload: true,
    },
    orderBy: { reportDate: "asc" },
  });

  if (rows.length === 0) {
    return { importRunId: null, reportDate: null, campaigns: [] };
  }

  // Aggregate rows per entity — sum raw metrics, take latest payload for additional metrics
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

    const rowSpend = toNum(row.spend);
    const rowResults = row.results ?? 0;
    const rowImpressions = row.impressions ?? 0;
    const rowClicks = row.clicks ?? 0;

    if (row.reportDate && (!latestReportDate || row.reportDate > latestReportDate)) {
      latestReportDate = row.reportDate;
    }

    const existing = entityMap.get(key);
    if (!existing) {
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
        totalImpressions: rowImpressions,
        totalClicks: rowClicks,
        dailySpend: 0,
        dailyResults: 0,
        normalizedPayload: row.normalizedPayload,
      });
    } else {
      existing.totalSpend += rowSpend;
      existing.totalResults += rowResults;
      existing.totalImpressions += rowImpressions;
      existing.totalClicks += rowClicks;
      // Latest row wins for payload (outboundCtr, cplpv, delivery from most recent day)
      existing.normalizedPayload = row.normalizedPayload;
    }
  }

  const entityRecords = [...entityMap.values()];

  const campaignEntities = entityRecords.filter((r) => r.importLevel === ImportLevel.CAMPAIGN);
  const adSetEntities = entityRecords.filter((r) => r.importLevel === ImportLevel.AD_SET);
  const adEntities = entityRecords.filter((r) => r.importLevel === ImportLevel.AD);

  // Group ads by adSetId / adSetName
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

  // Build adSet rows, group by campaignId / campaignName
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
        const cn = adSet.campaignName ?? "";
        const list = adSetsByCampaignName.get(cn) ?? [];
        list.push(row);
        adSetsByCampaignName.set(cn, list);
      }
    }
  } else {
    // No adSet-level data: synthesize from ad rows
    for (const [adSetId, ads] of adsByAdSetId) {
      const firstAd = adEntities.find((r) => r.adSetId === adSetId);
      const row = aggregateIntoAdSet(firstAd?.adsetName ?? adSetId, firstAd?.campaignId ?? null, ads);

      const campaignId = firstAd?.campaignId;
      if (campaignId) {
        const list = adSetsByCampaignId.get(campaignId) ?? [];
        list.push(row);
        adSetsByCampaignId.set(campaignId, list);
      } else {
        const cn = firstAd?.campaignName ?? "";
        const list = adSetsByCampaignName.get(cn) ?? [];
        list.push(row);
        adSetsByCampaignName.set(cn, list);
      }
    }
    for (const [name, ads] of adsByAdSetName) {
      const firstAd = adEntities.find((r) => (r.adsetName ?? "") === name);
      const row = aggregateIntoAdSet(name, firstAd?.campaignId ?? null, ads);
      const cn = firstAd?.campaignName ?? "";
      const list = adSetsByCampaignName.get(cn) ?? [];
      list.push(row);
      adSetsByCampaignName.set(cn, list);
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
        adSetEntities.find((r) => r.campaignId === campaignId) ??
        adEntities.find((r) => r.campaignId === campaignId);
      campaigns.push(
        aggregateIntoCampaign(
          firstAdSet?.campaignName ?? campaignId,
          firstAdSet?.approachName ?? null,
          adSets
        )
      );
    }
    for (const [campaignName, adSets] of adSetsByCampaignName) {
      const firstAdSet = adEntities.find((r) => (r.campaignName ?? "") === campaignName);
      campaigns.push(aggregateIntoCampaign(campaignName, firstAdSet?.approachName ?? null, adSets));
    }
  }

  campaigns.sort((a, b) => b.spend - a.spend);

  return {
    importRunId: null,
    reportDate: latestReportDate,
    campaigns,
  };
}
