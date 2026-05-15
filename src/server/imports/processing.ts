import { readFile } from "node:fs/promises";
import { ImportLevel, ImportRunStatus, Prisma } from "@prisma/client";
import { notifyImportAnalyzerFailure, runImportAnalyzer } from "@/server/analyzer/execution";
import { db } from "@/server/db/client";
import { parseMetaAdsCampaignCsv, parseMetaAdsAdSetCsv, parseSupportedMetaAdsCsv } from "@/server/imports/meta-ads-format";
import { resolveStoredImportFilePath } from "@/server/imports/storage";
import { getImportRunSummary, updateImportRunStatus } from "@/server/services/import-runs";
import { updateEntityStats } from "@/server/services/entity-stats";

const importRunKickoffSelect = {
  id: true,
  sourceFilename: true,
  sourceStorageKey: true,
  adSetFileStorageKey: true,
  campaignFileStorageKey: true,
  processingStatus: true,
  sourceByteSize: true,
  adAccountId: true
} satisfies Prisma.ImportRunSelect;

export type ImportKickoffResult = {
  importRunId: string;
  processingStatus: "completed" | "failed";
  nextStep: "alerts_review" | "analyzer_fix_required" | "import_fix_required";
  totalRows: number;
  parsedRows: number;
  failedRows: number;
  warningRows: number;
  supportedFormat: string;
  comparisonGroups: number;
  analyzerResults: number;
  alertEvents: number;
  notificationDeliveries: {
    delivered: number;
    failed: number;
    skipped: number;
  };
};

async function getImportRunKickoffContext(importRunId: string) {
  return db.importRun.findUnique({
    where: { id: importRunId },
    select: importRunKickoffSelect
  });
}

function buildRowSummaryDetails(parsedImport: ReturnType<typeof parseSupportedMetaAdsCsv>) {
  return {
    stage: parsedImport.failedRows ? "normalization_completed_with_issues" : "normalization_completed",
    supportedFormat: parsedImport.format.key,
    totalRows: parsedImport.totalRows,
    parsedRows: parsedImport.parsedRows,
    failedRows: parsedImport.failedRows,
    warningRows: parsedImport.warningRows,
    recentIssues: parsedImport.recentIssues
  } satisfies Prisma.InputJsonValue;
}

function buildProcessingDetails(
  parsedImport: ReturnType<typeof parseSupportedMetaAdsCsv>,
  analyzer?: {
    comparisonGroupsCount: number;
    analyzerResultsCount: number;
    alertEventsCount: number;
    queuedDigestAlertsCount: number;
    queuedDigestsCount: number;
    deliveredCount: number;
    failedDeliveriesCount: number;
    skippedDeliveriesCount: number;
  } | null
) {
  return {
    ...(buildRowSummaryDetails(parsedImport) as Record<string, unknown>),
    analyzer: analyzer
      ? {
          stage: "completed",
          comparisonGroupsCount: analyzer.comparisonGroupsCount,
          analyzerResultsCount: analyzer.analyzerResultsCount,
          alertEventsCount: analyzer.alertEventsCount,
          queuedDigestAlertsCount: analyzer.queuedDigestAlertsCount,
          queuedDigestsCount: analyzer.queuedDigestsCount,
          notificationDeliveries: {
            delivered: analyzer.deliveredCount,
            failed: analyzer.failedDeliveriesCount,
            skipped: analyzer.skippedDeliveriesCount
          }
        }
      : {
          stage: "pending"
        }
  } satisfies Prisma.InputJsonValue;
}

type ParsedImportBundle = {
  adLevel: ReturnType<typeof parseSupportedMetaAdsCsv>;
  adSetLevel: ReturnType<typeof parseMetaAdsAdSetCsv> | null;
  campaignLevel: ReturnType<typeof parseMetaAdsCampaignCsv> | null;
};

// ---------------------------------------------------------------------------
// Single-day validation
// ---------------------------------------------------------------------------

/**
 * Returns the single unique reportDate found in a set of rows, or null if rows
 * are empty / all dates are null. Throws ImportUploadValidationError when more
 * than one distinct date is detected.
 */
function extractSingleReportDate(
  rows: { reportDate?: Date | null }[],
  levelLabel: string
): Date | null {
  const dates = new Set<string>();
  for (const row of rows) {
    if (row.reportDate) dates.add(row.reportDate.toISOString());
  }
  if (dates.size > 1) {
    throw new Error(
      `Пожалуйста, загружайте CSV с одним днём отчётности (${levelLabel}). Многодневные CSV пока не поддерживаются.`
    );
  }
  if (dates.size === 1) return new Date(dates.values().next().value!);
  return null;
}

// ---------------------------------------------------------------------------
// Soft replacement helpers
// ---------------------------------------------------------------------------

type LevelReplacementPlan = {
  level: ImportLevel;
  reportDate: Date;
};

/**
 * Collects which (level, reportDate) pairs in this bundle need replacement.
 * Only levels that are present AND have a deterministic single date are included.
 */
function buildReplacementPlan(bundle: ParsedImportBundle): LevelReplacementPlan[] {
  const plan: LevelReplacementPlan[] = [];

  const adDate = extractSingleReportDate(bundle.adLevel.normalizedRows, "Ad level");
  if (adDate) plan.push({ level: ImportLevel.AD, reportDate: adDate });

  if (bundle.adSetLevel) {
    const adSetDate = extractSingleReportDate(bundle.adSetLevel.normalizedRows, "Ad Set level");
    if (adSetDate) plan.push({ level: ImportLevel.AD_SET, reportDate: adSetDate });
  }

  if (bundle.campaignLevel) {
    const campaignDate = extractSingleReportDate(bundle.campaignLevel.normalizedRows, "Campaign level");
    if (campaignDate) plan.push({ level: ImportLevel.CAMPAIGN, reportDate: campaignDate });
  }

  return plan;
}

// ---------------------------------------------------------------------------
// persistParsedImport
// ---------------------------------------------------------------------------

async function persistParsedImport(
  importRunId: string,
  bundle: ParsedImportBundle,
  adAccountId: string | null
) {
  const allNormalizedRows = [
    ...(bundle.campaignLevel?.normalizedRows ?? []),
    ...(bundle.adSetLevel?.normalizedRows ?? []),
    ...bundle.adLevel.normalizedRows
  ];
  const allRawRows = [
    // Offset row numbers per level to avoid conflicts
    ...bundle.adLevel.rawRows,
    ...(bundle.adSetLevel?.rawRows.map((r) => ({ ...r, rowNumber: r.rowNumber + 10000 })) ?? []),
    ...(bundle.campaignLevel?.rawRows.map((r) => ({ ...r, rowNumber: r.rowNumber + 20000 })) ?? [])
  ];

  // Build replacement plan before the transaction (reads are fine outside)
  const replacementPlan = adAccountId ? buildReplacementPlan(bundle) : [];

  // For each level in the replacement plan, find which ImportRun IDs currently
  // own active rows for this cabinet + date + level (to mark them as replaced).
  type OldRunEntry = { importRunId: string };
  const replacedRunIdSets: Map<string, Set<string>> = new Map();

  for (const entry of replacementPlan) {
    const oldRows: OldRunEntry[] = await db.importNormalizedRow.findMany({
      where: {
        adAccountId,
        reportDate: entry.reportDate,
        importLevel: entry.level,
        isActive: true,
        importRunId: { not: importRunId }
      },
      select: { importRunId: true },
      distinct: ["importRunId"]
    });

    for (const row of oldRows) {
      if (!replacedRunIdSets.has(entry.level)) {
        replacedRunIdSets.set(entry.level, new Set());
      }
      replacedRunIdSets.get(entry.level)!.add(row.importRunId);
    }
  }

  // Find the most recent applicable completed/analyzing import run to use as a prior snapshot
  const previousRun = await db.importRun.findFirst({
    where: {
      processingStatus: { in: [ImportRunStatus.COMPLETED, ImportRunStatus.ANALYZING, ImportRunStatus.NORMALIZING] },
      id: { not: importRunId }
    },
    orderBy: { createdAt: "desc" },
    select: { id: true }
  });

  const previousRows = previousRun
    ? await db.importNormalizedRow.findMany({
        where: { importRunId: previousRun.id },
        select: {
          id: true,
          importLevel: true,
          campaignId: true,
          adSetId: true,
          adId: true,
          reportDate: true,
          campaignName: true,
          adsetName: true,
          adName: true,
          spend: true,
          impressions: true,
          clicks: true,
          results: true
        }
      })
    : [];

  // Key: level|campaignId|adSetId|adId (IDs preferred for precision, fallback to names)
  const prevRowMap = new Map(
    previousRows.map((row) => {
      const key = row.campaignId
        ? `${row.importLevel}|${row.campaignId}|${row.adSetId ?? ""}|${row.adId ?? ""}`
        : `${row.importLevel}|${row.reportDate?.toISOString()}|${row.campaignName}|${row.adsetName}|${row.adName}`;
      return [key, row];
    })
  );

  const now = new Date();

  await db.$transaction(async (transaction) => {
    // 1. Soft-deactivate old normalized rows for each (level, reportDate) pair
    for (const entry of replacementPlan) {
      await transaction.importNormalizedRow.updateMany({
        where: {
          adAccountId,
          reportDate: entry.reportDate,
          importLevel: entry.level,
          isActive: true,
          importRunId: { not: importRunId }
        },
        data: { isActive: false }
      });

      // Mark old ImportRun(s) as replaced
      const oldRunIds = Array.from(replacedRunIdSets.get(entry.level) ?? []);
      if (oldRunIds.length > 0) {
        await transaction.importRun.updateMany({
          where: { id: { in: oldRunIds } },
          data: {
            isActive: false,
            replacedAt: now,
            replacedByImportRunId: importRunId
          }
        });
      }
    }

    // 2. Delete and re-insert raw / normalized rows for THIS import run
    await transaction.importNormalizedRow.deleteMany({ where: { importRunId } });
    await transaction.importRawRow.deleteMany({ where: { importRunId } });

    await transaction.importRawRow.createMany({
      data: allRawRows.map((row) => ({
        importRunId,
        rowNumber: row.rowNumber,
        rowHash: row.rowHash,
        rawPayload: row.rawPayload,
        parseError: row.parseError
      }))
    });

    const persistedRawRows = await transaction.importRawRow.findMany({
      where: { importRunId },
      select: { id: true, rowNumber: true }
    });
    const rawRowIdByNumber = new Map(persistedRawRows.map((row) => [row.rowNumber, row.id]));

    // Ad-level raw row numbers stay as-is; adset/campaign are offset
    const getRowNumberForLookup = (level: "AD" | "AD_SET" | "CAMPAIGN", sourceRowNumber: number) => {
      if (level === "AD_SET") return sourceRowNumber + 10000;
      if (level === "CAMPAIGN") return sourceRowNumber + 20000;
      return sourceRowNumber;
    };

    if (allNormalizedRows.length) {
      await transaction.importNormalizedRow.createMany({
        data: allNormalizedRows.map((row) => {
          const prevKey = row.campaignId
            ? `${row.importLevel}|${row.campaignId}|${row.adSetId ?? ""}|${row.adId ?? ""}`
            : `${row.importLevel}|${row.reportDate?.toISOString()}|${row.campaignName}|${row.adsetName}|${row.adName}`;
          const prevRow = prevRowMap.get(prevKey);

          let intervalSpend = row.spend ? Number(row.spend) : 0;
          let intervalImpressions = row.impressions ?? 0;
          let intervalClicks = row.clicks ?? 0;
          let intervalResults = row.results ?? 0;

          if (prevRow) {
            const prevSpend = prevRow.spend ? Number(prevRow.spend) : 0;
            const prevImpressions = prevRow.impressions ?? 0;
            const prevClicks = prevRow.clicks ?? 0;
            const prevResults = prevRow.results ?? 0;

            // Day-reset detection: if current < previous, Facebook midnight-reset occurred —
            // treat the entire current value as the interval for the new day.
            intervalSpend = intervalSpend < prevSpend
              ? intervalSpend
              : Math.max(0, intervalSpend - prevSpend);
            intervalImpressions = intervalImpressions < prevImpressions
              ? intervalImpressions
              : Math.max(0, intervalImpressions - prevImpressions);
            intervalClicks = intervalClicks < prevClicks
              ? intervalClicks
              : Math.max(0, intervalClicks - prevClicks);
            intervalResults = intervalResults < prevResults
              ? intervalResults
              : Math.max(0, intervalResults - prevResults);
          }

          return {
            importRunId,
            adAccountId: adAccountId ?? null,
            isActive: true,
            rawRowId: rawRowIdByNumber.get(getRowNumberForLookup(row.importLevel, row.sourceRowNumber)) ?? null,
            previousRowId: prevRow?.id ?? null,
            importLevel: row.importLevel,
            campaignId: row.campaignId,
            adSetId: row.adSetId,
            adId: row.adId,
            sourceRowNumber: row.sourceRowNumber,
            reportDate: row.reportDate,
            approachName: row.approachName,
            campaignName: row.campaignName,
            adsetName: row.adsetName,
            adName: row.adName,
            globalGroupKey: row.globalGroupKey,
            comparisonGroupKey: row.comparisonGroupKey,
            hasResults: row.hasResults,
            results: row.results,
            spend: row.spend,
            impressions: row.impressions,
            clicks: row.clicks,
            cpc: row.cpc,
            ctr: row.ctr,
            cpm: row.cpm,
            costPerResult: row.costPerResult,
            intervalResults: Math.floor(intervalResults),
            intervalSpend,
            intervalImpressions: Math.floor(intervalImpressions),
            intervalClicks: Math.floor(intervalClicks),
            normalizedPayload: row.normalizedPayload,
            normalizationError: row.normalizationError
          };
        })
      });
    }
  });
}

async function processImportRun(importRunId: string) {
  const importRun = await getImportRunKickoffContext(importRunId);

  if (!importRun) {
    throw new Error("Import run not found.");
  }

  if (!importRun.sourceStorageKey) {
    throw new Error("Import run storage key is missing.");
  }

  const adFileContents = await readFile(resolveStoredImportFilePath(importRun.sourceStorageKey), "utf8");
  const adLevelParsed = parseSupportedMetaAdsCsv(adFileContents);

  let adSetLevelParsed: ReturnType<typeof parseMetaAdsAdSetCsv> | null = null;
  if (importRun.adSetFileStorageKey) {
    const adSetContents = await readFile(resolveStoredImportFilePath(importRun.adSetFileStorageKey), "utf8");
    adSetLevelParsed = parseMetaAdsAdSetCsv(adSetContents);
  }

  let campaignLevelParsed: ReturnType<typeof parseMetaAdsCampaignCsv> | null = null;
  if (importRun.campaignFileStorageKey) {
    const campaignContents = await readFile(resolveStoredImportFilePath(importRun.campaignFileStorageKey), "utf8");
    campaignLevelParsed = parseMetaAdsCampaignCsv(campaignContents);
  }

  const bundle: ParsedImportBundle = {
    adLevel: adLevelParsed,
    adSetLevel: adSetLevelParsed,
    campaignLevel: campaignLevelParsed
  };

  // Use ad-level for top-level reporting counts (primary format)
  const parsedImport = adLevelParsed;

  await persistParsedImport(importRunId, bundle, importRun.adAccountId ?? null);
  await updateEntityStats(importRunId);

  await updateImportRunStatus({
    importRunId,
    processingStatus: ImportRunStatus.NORMALIZING,
    errorSummary: parsedImport.failedRows ? "Some CSV rows need manual review." : null,
    errorDetails: buildProcessingDetails(parsedImport),
    rawRowsCount: parsedImport.totalRows,
    normalizedRowsCount: parsedImport.parsedRows
  });

  if (!parsedImport.parsedRows) {
    await updateImportRunStatus({
      importRunId,
      processingStatus: ImportRunStatus.FAILED,
      errorSummary: "CSV import finished without any normalized rows.",
      errorDetails: buildProcessingDetails(parsedImport),
      rawRowsCount: parsedImport.totalRows,
      normalizedRowsCount: parsedImport.parsedRows
    });

    return {
      importRunId,
      processingStatus: "failed",
      nextStep: "import_fix_required",
      totalRows: parsedImport.totalRows,
      parsedRows: parsedImport.parsedRows,
      failedRows: parsedImport.failedRows,
      warningRows: parsedImport.warningRows,
      supportedFormat: parsedImport.format.key,
      comparisonGroups: 0,
      analyzerResults: 0,
      alertEvents: 0,
      notificationDeliveries: {
        delivered: 0,
        failed: 0,
        skipped: 0
      }
    } satisfies ImportKickoffResult;
  }

  await updateImportRunStatus({
    importRunId,
    processingStatus: ImportRunStatus.ANALYZING,
    errorSummary: parsedImport.failedRows ? "Import normalized with row-level issues. Analyzer is running." : null,
    errorDetails: {
      ...(buildRowSummaryDetails(parsedImport) as Record<string, unknown>),
      analyzer: { stage: "running" }
    },
    rawRowsCount: parsedImport.totalRows,
    normalizedRowsCount: parsedImport.parsedRows
  });

  try {
    const analyzer = await runImportAnalyzer(importRunId);

    await updateImportRunStatus({
      importRunId,
      processingStatus: ImportRunStatus.COMPLETED,
      errorSummary: parsedImport.failedRows ? "Import completed with row-level issues." : null,
      errorDetails: buildProcessingDetails(parsedImport, analyzer),
      rawRowsCount: parsedImport.totalRows,
      normalizedRowsCount: parsedImport.parsedRows
    });

    return {
      importRunId,
      processingStatus: "completed",
      nextStep: "alerts_review",
      totalRows: parsedImport.totalRows,
      parsedRows: parsedImport.parsedRows,
      failedRows: parsedImport.failedRows,
      warningRows: parsedImport.warningRows,
      supportedFormat: parsedImport.format.key,
      comparisonGroups: analyzer.comparisonGroupsCount,
      analyzerResults: analyzer.analyzerResultsCount,
      alertEvents: analyzer.alertEventsCount,
      notificationDeliveries: {
        delivered: analyzer.deliveredCount,
        failed: analyzer.failedDeliveriesCount,
        skipped: analyzer.skippedDeliveriesCount
      }
    } satisfies ImportKickoffResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analyzer execution failed.";

    await updateImportRunStatus({
      importRunId,
      processingStatus: ImportRunStatus.FAILED,
      errorSummary: "CSV parsing succeeded, but analyzer execution failed.",
      errorDetails: {
        ...(buildRowSummaryDetails(parsedImport) as Record<string, unknown>),
        analyzer: { stage: "failed", message }
      },
      rawRowsCount: parsedImport.totalRows,
      normalizedRowsCount: parsedImport.parsedRows
    });

    await notifyImportAnalyzerFailure({
      importRunId,
      importRunFilename: importRun.sourceFilename,
      message
    });

    return {
      importRunId,
      processingStatus: "failed",
      nextStep: "analyzer_fix_required",
      totalRows: parsedImport.totalRows,
      parsedRows: parsedImport.parsedRows,
      failedRows: parsedImport.failedRows,
      warningRows: parsedImport.warningRows,
      supportedFormat: parsedImport.format.key,
      comparisonGroups: 0,
      analyzerResults: 0,
      alertEvents: 0,
      notificationDeliveries: {
        delivered: 0,
        failed: 0,
        skipped: 0
      }
    } satisfies ImportKickoffResult;
  }
}

export async function kickOffImportProcessing(importRunId: string): Promise<ImportKickoffResult> {
  const importRun = await getImportRunKickoffContext(importRunId);

  if (!importRun) {
    throw new Error("Import run not found.");
  }

  if (!importRun.sourceStorageKey) {
    throw new Error("Import run storage key is missing.");
  }

  try {
    await updateImportRunStatus({
      importRunId,
      processingStatus: ImportRunStatus.PARSING,
      errorSummary: null,
      errorDetails: {
        stage: "parsing",
        nextStep: "csv_parse_and_normalize",
        sourceStorageKey: importRun.sourceStorageKey
      }
    });

    return await processImportRun(importRunId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start import processing.";
    const latestSummary = await getImportRunSummary(importRunId);

    await updateImportRunStatus({
      importRunId,
      processingStatus: ImportRunStatus.FAILED,
      errorSummary: "Failed to parse uploaded CSV.",
      errorDetails: {
        stage: "parsing",
        message,
        sourceStorageKey: importRun.sourceStorageKey,
        rawRowsCount: latestSummary?.rawRowsCount ?? 0,
        normalizedRowsCount: latestSummary?.normalizedRowsCount ?? 0
      }
    });

    throw new Error(message);
  }
}
