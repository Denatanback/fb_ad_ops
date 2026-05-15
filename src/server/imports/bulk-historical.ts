import { ImportLevel, ImportMode, ImportRunStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import {
  parseMetaAdsAdSetCsv,
  parseMetaAdsCampaignCsv,
  parseSupportedMetaAdsCsv,
  type ParsedMetaAdsImport
} from "@/server/imports/meta-ads-format";
import {
  isCsvFileUpload,
  removeStoredImportFile,
  storeUploadedImportFile,
  type StoredImportFile
} from "@/server/imports/storage";
import { findAdAccountById } from "@/server/services/ad-accounts";

const bulkFormatKey = "meta_ads_bulk_historical_v1";
const bulkDailyBreakdownError =
  "Bulk CSV must use daily breakdown: each row must represent exactly one reporting day.";

type BulkHistoricalCsvImportInput = {
  adAccountId: string;
  uploadedById?: string | null;
  campaignFile?: File | null;
  adSetFile?: File | null;
  adFile?: File | null;
};

type ParsedBulkFile = {
  level: ImportLevel;
  label: string;
  storedFile: StoredImportFile;
  parsed: ParsedMetaAdsImport;
  rowOffset: number;
};

export type BulkHistoricalCsvImportResult = {
  importRunId: string;
  levels: ImportLevel[];
  reportStart: Date;
  reportEnd: Date;
  rawRowsCount: number;
  normalizedRowsCount: number;
  replacedRowsCount: number;
};

export class BulkHistoricalImportValidationError extends Error {}

function assertCsvUpload(file: File, label: string) {
  if (!file.size) {
    throw new BulkHistoricalImportValidationError(`${label} CSV is empty.`);
  }

  if (!isCsvFileUpload(file)) {
    throw new BulkHistoricalImportValidationError(`${label} must be a CSV file.`);
  }
}

function hasDailyBreakdownIssue(parsed: ParsedMetaAdsImport) {
  return parsed.rawRows.some((row) =>
    row.parseError?.includes("daily imports require Reporting starts and Reporting ends")
  );
}

function assertParsedWithoutRowErrors(file: ParsedBulkFile) {
  if (!file.parsed.failedRows) {
    return;
  }

  if (hasDailyBreakdownIssue(file.parsed)) {
    throw new BulkHistoricalImportValidationError(bulkDailyBreakdownError);
  }

  const firstIssue = file.parsed.recentIssues[0]?.message;
  throw new BulkHistoricalImportValidationError(
    `${file.label} CSV has ${file.parsed.failedRows} row(s) that could not be normalized.${firstIssue ? ` First issue: ${firstIssue}` : ""}`
  );
}

function parseStoredFile(level: ImportLevel, storedFile: StoredImportFile): ParsedMetaAdsImport {
  if (level === ImportLevel.CAMPAIGN) return parseMetaAdsCampaignCsv(storedFile.utf8Text);
  if (level === ImportLevel.AD_SET) return parseMetaAdsAdSetCsv(storedFile.utf8Text);
  return parseSupportedMetaAdsCsv(storedFile.utf8Text);
}

function getRowLookupNumber(level: ImportLevel, sourceRowNumber: number) {
  if (level === ImportLevel.AD_SET) return sourceRowNumber + 10000;
  if (level === ImportLevel.CAMPAIGN) return sourceRowNumber + 20000;
  return sourceRowNumber;
}

function buildReplacementKeys(rows: ParsedMetaAdsImport["normalizedRows"]) {
  const keys = new Map<string, { importLevel: ImportLevel; reportDate: Date }>();

  for (const row of rows) {
    const importLevel = row.importLevel as ImportLevel;
    const reportDate = row.reportDate;
    keys.set(`${importLevel}|${reportDate.toISOString()}`, { importLevel, reportDate });
  }

  return [...keys.values()];
}

function buildReportingWindow(rows: ParsedMetaAdsImport["normalizedRows"]) {
  let reportStart: Date | null = null;
  let reportEnd: Date | null = null;

  for (const row of rows) {
    if (!reportStart || row.reportDate < reportStart) reportStart = row.reportDate;
    if (!reportEnd || row.reportDate > reportEnd) reportEnd = row.reportDate;
  }

  if (!reportStart || !reportEnd) {
    throw new BulkHistoricalImportValidationError("Bulk CSV did not contain any normalized rows.");
  }

  return { reportStart, reportEnd };
}

function buildSourceFilename(files: ParsedBulkFile[]) {
  return `Bulk historical CSV (${files.map((file) => file.label).join(", ")})`;
}

function buildBulkDetails(input: {
  levels: ImportLevel[];
  replacementKeysCount: number;
  replacedRowsCount: number;
  reportStart: Date;
  reportEnd: Date;
}) {
  return {
    stage: "bulk_historical_import_completed",
    mode: "BULK_HISTORICAL",
    includedLevels: input.levels,
    replacementKeysCount: input.replacementKeysCount,
    replacedRowsCount: input.replacedRowsCount,
    reportingWindowStart: input.reportStart.toISOString(),
    reportingWindowEnd: input.reportEnd.toISOString()
  } satisfies Prisma.InputJsonValue;
}

async function storeOptionalBulkFile(
  file: File | null | undefined,
  level: ImportLevel,
  label: string,
  rowOffset: number,
  onStored: (storageKey: string) => void
): Promise<ParsedBulkFile | null> {
  if (!file) return null;

  assertCsvUpload(file, label);
  const storedFile = await storeUploadedImportFile({ file });
  onStored(storedFile.relativeStorageKey);
  const parsed = parseStoredFile(level, storedFile);
  const parsedFile = { level, label, storedFile, parsed, rowOffset };

  assertParsedWithoutRowErrors(parsedFile);

  if (!parsed.parsedRows) {
    throw new BulkHistoricalImportValidationError(`${label} CSV did not contain any normalized rows.`);
  }

  return parsedFile;
}

export async function acceptBulkHistoricalCsvImport(
  input: BulkHistoricalCsvImportInput
): Promise<BulkHistoricalCsvImportResult> {
  const account = await findAdAccountById(input.adAccountId);

  if (!account || !account.isActive) {
    throw new BulkHistoricalImportValidationError("Select an active advertising cabinet before uploading bulk CSV.");
  }

  if (!input.campaignFile && !input.adSetFile && !input.adFile) {
    throw new BulkHistoricalImportValidationError("Upload at least one Campaign, Ad Set, or Ad CSV file.");
  }

  const storedKeys: string[] = [];
  let committed = false;

  try {
    const parsedFiles: ParsedBulkFile[] = [];
    const campaignFile = await storeOptionalBulkFile(
      input.campaignFile,
      ImportLevel.CAMPAIGN,
      "Campaign",
      20000,
      (key) => storedKeys.push(key)
    );
    if (campaignFile) {
      parsedFiles.push(campaignFile);
    }

    const adSetFile = await storeOptionalBulkFile(
      input.adSetFile,
      ImportLevel.AD_SET,
      "Ad Set",
      10000,
      (key) => storedKeys.push(key)
    );
    if (adSetFile) {
      parsedFiles.push(adSetFile);
    }

    const adFile = await storeOptionalBulkFile(
      input.adFile,
      ImportLevel.AD,
      "Ad",
      0,
      (key) => storedKeys.push(key)
    );
    if (adFile) {
      parsedFiles.push(adFile);
    }

    if (!parsedFiles.length) {
      throw new BulkHistoricalImportValidationError("Upload at least one Campaign, Ad Set, or Ad CSV file.");
    }

    const allNormalizedRows = parsedFiles.flatMap((file) => file.parsed.normalizedRows);
    const allRawRows = parsedFiles.flatMap((file) =>
      file.parsed.rawRows.map((row) => ({
        ...row,
        rowNumber: row.rowNumber + file.rowOffset
      }))
    );
    const replacementKeys = buildReplacementKeys(allNormalizedRows);
    const { reportStart, reportEnd } = buildReportingWindow(allNormalizedRows);
    const levels = parsedFiles.map((file) => file.level);
    const primaryFile = parsedFiles.find((file) => file.level === ImportLevel.AD) ?? parsedFiles[0];
    const totalByteSize = parsedFiles.reduce((total, file) => total + file.storedFile.byteSize, 0);

    const result = await db.$transaction(
      async (transaction) => {
        const importRun = await transaction.importRun.create({
          data: {
            adAccountId: account.id,
            sourceType: "CSV_UPLOAD",
            importMode: ImportMode.BULK_HISTORICAL,
            sourceFilename: buildSourceFilename(parsedFiles),
            sourceStorageKey: primaryFile.storedFile.relativeStorageKey,
            sourceFileHash: primaryFile.storedFile.sha256,
            sourceFormatKey: bulkFormatKey,
            sourceContentType: primaryFile.storedFile.contentType,
            sourceByteSize: totalByteSize,
            adSetFileStorageKey:
              parsedFiles.find((file) => file.level === ImportLevel.AD_SET)?.storedFile.relativeStorageKey ?? null,
            adSetFileHash: parsedFiles.find((file) => file.level === ImportLevel.AD_SET)?.storedFile.sha256 ?? null,
            campaignFileStorageKey:
              parsedFiles.find((file) => file.level === ImportLevel.CAMPAIGN)?.storedFile.relativeStorageKey ?? null,
            campaignFileHash:
              parsedFiles.find((file) => file.level === ImportLevel.CAMPAIGN)?.storedFile.sha256 ?? null,
            reportingWindowStart: reportStart,
            reportingWindowEnd: reportEnd,
            processingStatus: ImportRunStatus.PARSING,
            processingStartedAt: new Date(),
            uploadedById: input.uploadedById ?? null,
            rawRowsCount: allRawRows.length,
            normalizedRowsCount: 0,
            errorDetails: {
              stage: "bulk_historical_import_started",
              mode: "BULK_HISTORICAL",
              includedLevels: levels
            } satisfies Prisma.InputJsonValue
          },
          select: { id: true }
        });

        let replacedRowsCount = 0;
        for (const key of replacementKeys) {
          const replaced = await transaction.importNormalizedRow.updateMany({
            where: {
              adAccountId: account.id,
              reportDate: key.reportDate,
              importLevel: key.importLevel,
              isActive: true,
              importRunId: { not: importRun.id }
            },
            data: {
              isActive: false
            }
          });
          replacedRowsCount += replaced.count;
        }

        await transaction.importRawRow.createMany({
          data: allRawRows.map((row) => ({
            importRunId: importRun.id,
            rowNumber: row.rowNumber,
            rowHash: row.rowHash,
            rawPayload: row.rawPayload,
            parseError: row.parseError
          }))
        });

        const persistedRawRows = await transaction.importRawRow.findMany({
          where: { importRunId: importRun.id },
          select: { id: true, rowNumber: true }
        });
        const rawRowIdByNumber = new Map(persistedRawRows.map((row) => [row.rowNumber, row.id]));

        await transaction.importNormalizedRow.createMany({
          data: allNormalizedRows.map((row) => {
            const spendValue = row.spend ? Number(row.spend) : 0;
            const impressions = row.impressions ?? 0;
            const clicks = row.clicks ?? 0;
            const resultsCount = row.results ?? 0;

            return {
              importRunId: importRun.id,
              adAccountId: account.id,
              isActive: true,
              rawRowId: rawRowIdByNumber.get(getRowLookupNumber(row.importLevel as ImportLevel, row.sourceRowNumber)) ?? null,
              previousRowId: null,
              importLevel: row.importLevel as ImportLevel,
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
              intervalResults: resultsCount,
              intervalSpend: spendValue,
              intervalImpressions: impressions,
              intervalClicks: clicks,
              normalizedPayload: row.normalizedPayload,
              normalizationError: row.normalizationError
            };
          })
        });

        await transaction.importRun.update({
          where: { id: importRun.id },
          data: {
            processingStatus: ImportRunStatus.COMPLETED,
            processingFinishedAt: new Date(),
            rawRowsCount: allRawRows.length,
            normalizedRowsCount: allNormalizedRows.length,
            errorSummary: null,
            errorDetails: buildBulkDetails({
              levels,
              replacementKeysCount: replacementKeys.length,
              replacedRowsCount,
              reportStart,
              reportEnd
            })
          }
        });

        return {
          importRunId: importRun.id,
          levels,
          reportStart,
          reportEnd,
          rawRowsCount: allRawRows.length,
          normalizedRowsCount: allNormalizedRows.length,
          replacedRowsCount
        };
      },
      { maxWait: 10000, timeout: 60000 }
    );

    committed = true;
    return result;
  } catch (error) {
    if (!committed) {
      await Promise.all(storedKeys.map((key) => removeStoredImportFile(key).catch(() => undefined)));
    }
    throw error;
  }
}
