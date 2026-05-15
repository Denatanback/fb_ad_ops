import { ImportLevel } from "@prisma/client";
import { db } from "@/server/db/client";

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n =
    typeof v === "object" && v !== null && "toNumber" in v
      ? (v as { toNumber(): number }).toNumber()
      : Number(v);
  return Number.isFinite(n) ? n : 0;
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

export async function updateEntityStats(importRunId: string): Promise<void> {
  const importRun = await db.importRun.findUnique({
    where: { id: importRunId },
    select: { id: true, createdAt: true }
  });

  if (!importRun) return;

  const rows = await db.importNormalizedRow.findMany({
    where: { importRunId },
    select: {
      id: true,
      importLevel: true,
      campaignId: true,
      adSetId: true,
      adId: true,
      campaignName: true,
      adsetName: true,
      adName: true,
      approachName: true,
      spend: true,
      results: true,
      impressions: true,
      clicks: true,
      normalizedPayload: true
    }
  });

  if (rows.length === 0) return;

  // Deduplicate: one representative row per entity (prefer ones with spend > 0)
  const entityRowMap = new Map<string, (typeof rows)[0]>();
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
    const existing = entityRowMap.get(key);
    if (!existing || toNum(row.spend) > toNum(existing.spend)) {
      entityRowMap.set(key, row);
    }
  }

  // Truncate importRun.createdAt to a date-only value (midnight UTC)
  const importDate = new Date(importRun.createdAt);
  importDate.setUTCHours(0, 0, 0, 0);

  // Load all existing daily records for these entity keys in one query
  const entityKeys = [...entityRowMap.keys()];
  const existingDailyRecords = await db.statsEntityDaily.findMany({
    where: { entityKey: { in: entityKeys } }
  });
  const dailyByKey = new Map(existingDailyRecords.map((r) => [r.entityKey, r]));

  // Load existing cumulative records for day-reset entities
  const existingCumulativeRecords = await db.statsEntityCumulative.findMany({
    where: { entityKey: { in: entityKeys } }
  });
  const cumulativeByKey = new Map(existingCumulativeRecords.map((r) => [r.entityKey, r]));

  for (const [entityKey, row] of entityRowMap) {
    const currentSpend = toNum(row.spend);
    const currentResults = row.results ?? 0;
    const currentImpressions = row.impressions ?? 0;
    const currentClicks = row.clicks ?? 0;

    const existing = dailyByKey.get(entityKey);

    if (!existing) {
      // First time seeing this entity — create daily record
      await db.statsEntityDaily.create({
        data: {
          entityKey,
          importLevel: row.importLevel,
          campaignId: row.campaignId,
          adSetId: row.adSetId,
          adId: row.adId,
          campaignName: row.campaignName,
          adsetName: row.adsetName,
          adName: row.adName,
          approachName: row.approachName,
          date: importDate,
          spend: currentSpend,
          results: currentResults,
          impressions: currentImpressions,
          clicks: currentClicks,
          normalizedPayload: row.normalizedPayload ?? undefined
        }
      });
      continue;
    }

    const prevSpend = toNum(existing.spend);
    const prevResults = existing.results;
    const prevImpressions = existing.impressions;
    const prevClicks = existing.clicks;

    // Day-reset detection: Facebook midnight reset causes spend to drop below
    // the previous stored value. Also detect explicit date change.
    const storedDate = new Date(existing.date);
    storedDate.setUTCHours(0, 0, 0, 0);
    const isDayReset = currentSpend < prevSpend || importDate.getTime() > storedDate.getTime();

    if (isDayReset) {
      // Commit yesterday's final daily totals to cumulative
      const existingCumulative = cumulativeByKey.get(entityKey);
      if (existingCumulative) {
        await db.statsEntityCumulative.update({
          where: { entityKey },
          data: {
            totalSpend: { increment: prevSpend },
            totalResults: { increment: prevResults },
            totalImpressions: { increment: prevImpressions },
            totalClicks: { increment: prevClicks },
            campaignName: row.campaignName,
            adsetName: row.adsetName,
            adName: row.adName,
            approachName: row.approachName,
            normalizedPayload: row.normalizedPayload ?? undefined
          }
        });
      } else {
        await db.statsEntityCumulative.create({
          data: {
            entityKey,
            importLevel: row.importLevel,
            campaignId: row.campaignId,
            adSetId: row.adSetId,
            adId: row.adId,
            campaignName: row.campaignName,
            adsetName: row.adsetName,
            adName: row.adName,
            approachName: row.approachName,
            totalSpend: prevSpend,
            totalResults: prevResults,
            totalImpressions: prevImpressions,
            totalClicks: prevClicks,
            normalizedPayload: existing.normalizedPayload ?? undefined
          }
        });
      }

      // Reset daily with today's values
      await db.statsEntityDaily.update({
        where: { entityKey },
        data: {
          date: importDate,
          spend: currentSpend,
          results: currentResults,
          impressions: currentImpressions,
          clicks: currentClicks,
          campaignName: row.campaignName,
          adsetName: row.adsetName,
          adName: row.adName,
          approachName: row.approachName,
          normalizedPayload: row.normalizedPayload ?? undefined
        }
      });
    } else {
      // Same day: update absolute values (Facebook's running total for today)
      await db.statsEntityDaily.update({
        where: { entityKey },
        data: {
          spend: currentSpend,
          results: currentResults,
          impressions: currentImpressions,
          clicks: currentClicks,
          campaignName: row.campaignName,
          adsetName: row.adsetName,
          adName: row.adName,
          approachName: row.approachName,
          normalizedPayload: row.normalizedPayload ?? undefined
        }
      });
    }
  }
}
