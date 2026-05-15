import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { parseCsvDocument } from "@/server/imports/csv";

const supportedFormatKey = "meta_ads_ad_level_export_v1" as const;
const supportedFormatLabel = "Meta Ads ad-level export" as const;
const campaignFormatKey = "meta_ads_campaign_level_export_v1" as const;
const campaignFormatLabel = "Meta Ads campaign-level export" as const;
const adSetFormatKey = "meta_ads_adset_level_export_v1" as const;
const adSetFormatLabel = "Meta Ads ad set-level export" as const;

const requiredColumns = [
  "Ad name",
  "Ad delivery",
  "Results",
  "Result indicator",
  "Cost per results",
  "Ad set budget",
  "Ad set budget type",
  "Amount spent (USD)",
  "Impressions",
  "Reach",
  "Clicks (all)",
  "CPC (all) (USD)",
  "CTR (link click-through rate)",
  "Outbound CTR (click-through rate)",
  "Cost per landing page view (USD)",
  "CPM (cost per 1,000 impressions) (USD)",
  "Ad set name",
  "Ad set ID",
  "Campaign name",
  "Campaign ID",
  "Reporting starts",
  "Reporting ends",
  "Ad set delivery"
] as const;

const campaignRequiredColumns = [
  "Campaign name",
  "Campaign ID",
  "Campaign delivery",
  "Results",
  "Result indicator",
  "Cost per results",
  "Amount spent (USD)",
  "Impressions",
  "Reach",
  "Clicks (all)",
  "CPC (all) (USD)",
  "CTR (link click-through rate)",
  "Outbound CTR (click-through rate)",
  "Cost per landing page view (USD)",
  "CPM (cost per 1,000 impressions) (USD)",
  "Reporting starts",
  "Reporting ends"
] as const;

const adSetRequiredColumns = [
  "Ad set name",
  "Ad set ID",
  "Ad set delivery",
  "Campaign name",
  "Campaign ID",
  "Results",
  "Result indicator",
  "Cost per results",
  "Ad set budget",
  "Ad set budget type",
  "Amount spent (USD)",
  "Impressions",
  "Reach",
  "Clicks (all)",
  "CPC (all) (USD)",
  "CTR (link click-through rate)",
  "Outbound CTR (click-through rate)",
  "Cost per landing page view (USD)",
  "CPM (cost per 1,000 impressions) (USD)",
  "Reporting starts",
  "Reporting ends"
] as const;

const optionalColumns = [] as const;

type CsvRecord = Record<string, string>;

type ImportIssue = {
  rowNumber: number;
  message: string;
};

type RawRowDraft = {
  rowNumber: number;
  rowHash: string;
  rawPayload: Prisma.InputJsonValue;
  parseError: string | null;
};

type NormalizedRowDraft = {
  importLevel: "CAMPAIGN" | "AD_SET" | "AD";
  campaignId: string | null;
  adSetId: string | null;
  adId: string | null;
  sourceRowNumber: number;
  reportDate: Date;
  approachName: string | null;
  campaignName: string;
  adsetName: string;
  adName: string;
  globalGroupKey: string | null;
  comparisonGroupKey: string | null;
  hasResults: boolean;
  results: number | null;
  spend: string | null;
  impressions: number | null;
  clicks: number | null;
  cpc: string | null;
  ctr: string | null;
  cpm: string | null;
  costPerResult: string | null;
  normalizedPayload: Prisma.InputJsonValue;
  normalizationError: string | null;
};

export type SupportedImportFormat = {
  key: string;
  label: string;
  requiredColumns: readonly string[];
  optionalColumns: readonly string[];
  namingDelimiter: "|";
};

export type ParsedMetaAdsImport = {
  format: SupportedImportFormat;
  totalRows: number;
  parsedRows: number;
  failedRows: number;
  warningRows: number;
  rawRows: RawRowDraft[];
  normalizedRows: NormalizedRowDraft[];
  recentIssues: ImportIssue[];
};

export type InspectedMetaAdsImport = {
  format: SupportedImportFormat;
  reportStart: Date | null;
  reportEnd: Date | null;
  totalRows: number;
};

const maxPersistedIssues = 12;

function normalizeTextValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildRowHash(row: CsvRecord) {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

function slugifyToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDecimalValue(value: string | null, label: string, rowNumber: number) {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[%,$\s]/g, "").replace(/,/g, "");

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Строка ${rowNumber}: поле ${label} содержит некорректное число.`);
  }

  return parsed.toFixed(4);
}

function parseLooseDecimalValue(value: string | null) {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[%,$\s]/g, "").replace(/,/g, "");

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed.toFixed(4) : null;
}

function parseIntegerValue(value: string | null, label: string, rowNumber: number) {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/[,\s]/g, "");

  if (!sanitized) {
    return null;
  }

  const parsed = Number(sanitized);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Строка ${rowNumber}: поле ${label} должно быть целым числом.`);
  }

  return parsed;
}

function parseRequiredIsoDate(value: string | null, label: string, rowNumber: number) {
  if (!value) {
    throw new Error(`Строка ${rowNumber}: поле ${label} обязательно.`);
  }

  const normalized = value.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Строка ${rowNumber}: поле ${label} должно использовать формат YYYY-MM-DD.`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Строка ${rowNumber}: поле ${label} содержит некорректную дату.`);
  }

  return parsed;
}

function extractNamingSignals(record: CsvRecord) {
  const campaignName = (record["Campaign name"] ?? "").trim();
  const adsetName = (record["Ad set name"] ?? "").trim();
  const adName = (record["Ad name"] ?? "").trim();
  const campaignTokens = campaignName
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
  const adsetTokens = adsetName
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
  const adTokens = adName
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
  const fallbackCampaignTokens = campaignName
    .split(/[-_]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const approachName = campaignTokens[0] ?? fallbackCampaignTokens[0] ?? null;
  const globalGroupSource = campaignTokens[1] ?? campaignName;
  const comparisonLabel =
    [campaignTokens[0], campaignTokens[1], adsetTokens[0]].filter(Boolean).join(" | ") || campaignName;

  if (campaignTokens.length < 2 && !fallbackCampaignTokens.length) {
    warnings.push("Campaign name не содержит ожидаемый паттерн `Approach | Group`.");
  }

  return {
    approachName,
    globalGroupKey: globalGroupSource ? slugifyToken(globalGroupSource) || null : null,
    comparisonGroupKey: comparisonLabel ? slugifyToken(comparisonLabel) || null : slugifyToken(campaignName) || null,
    warnings,
    tokens: {
      campaign: campaignTokens,
      adset: adsetTokens,
      ad: adTokens
    }
  };
}

function ensureSupportedHeaders(headers: string[]) {
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));

  if (missingColumns.length) {
    throw new Error(
      `Неподдерживаемый CSV-формат. Не хватает обязательных колонок: ${missingColumns.join(", ")}. Ожидается формат ${supportedFormatLabel} (${supportedFormatKey}).`
    );
  }
}

function ensureHeaders(headers: string[], required: readonly string[], formatLabel: string, formatKey: string) {
  const missing = required.filter((col) => !headers.includes(col));
  if (missing.length) {
    throw new Error(
      `Неподдерживаемый CSV-формат. Не хватает обязательных колонок: ${missing.join(", ")}. Ожидается формат ${formatLabel} (${formatKey}).`
    );
  }
}

function buildCsvRecord(headers: string[], values: string[]) {
  return headers.reduce<CsvRecord>((record, header, index) => {
    record[header] = values[index]?.trim() ?? "";
    return record;
  }, {});
}

export function inspectSupportedMetaAdsCsv(sourceText: string): InspectedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureSupportedHeaders(document.headers);

  let reportStart: Date | null = null;
  let reportEnd: Date | null = null;

  for (let rowIndex = 0; rowIndex < document.rows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 2;
    const record = buildCsvRecord(document.headers, document.rows[rowIndex]);
    const rowStart = parseRequiredIsoDate(normalizeTextValue(record["Reporting starts"]), "Reporting starts", rowNumber);
    const rowEnd = parseRequiredIsoDate(normalizeTextValue(record["Reporting ends"]), "Reporting ends", rowNumber);

    if (rowEnd.getTime() < rowStart.getTime()) {
      throw new Error(`РЎС‚СЂРѕРєР° ${rowNumber}: Reporting ends РЅРµ РјРѕР¶РµС‚ Р±С‹С‚СЊ СЂР°РЅСЊС€Рµ Reporting starts.`);
    }

    if (!reportStart || rowStart < reportStart) {
      reportStart = rowStart;
    }

    if (!reportEnd || rowEnd > reportEnd) {
      reportEnd = rowEnd;
    }
  }

  return {
    format: supportedMetaAdsImportFormat,
    reportStart,
    reportEnd,
    totalRows: document.rows.length
  };
}

function normalizeCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  const adsetName = normalizeTextValue(record["Ad set name"]);
  const adName = normalizeTextValue(record["Ad name"]);

  if (!campaignName || !adsetName || !adName) {
    throw new Error(`Строка ${rowNumber}: поля Campaign name, Ad set name и Ad name обязательны.`);
  }

  const reportingStarts = parseRequiredIsoDate(normalizeTextValue(record["Reporting starts"]), "Reporting starts", rowNumber);
  const reportingEnds = parseRequiredIsoDate(normalizeTextValue(record["Reporting ends"]), "Reporting ends", rowNumber);

  if (reportingEnds.getTime() < reportingStarts.getTime()) {
    throw new Error(`Строка ${rowNumber}: Reporting ends не может быть раньше Reporting starts.`);
  }

  const results = parseIntegerValue(normalizeTextValue(record["Results"]), "Results", rowNumber);
  const namingSignals = extractNamingSignals({
    ...record,
    "Campaign name": campaignName,
    "Ad set name": adsetName,
    "Ad name": adName
  });

  const additionalMetrics = {
    outboundCtr: parseDecimalValue(
      normalizeTextValue(record["Outbound CTR (click-through rate)"]),
      "Outbound CTR (click-through rate)",
      rowNumber
    ),
    cplpv: parseDecimalValue(
      normalizeTextValue(record["Cost per landing page view (USD)"]),
      "Cost per landing page view (USD)",
      rowNumber
    ),
    cr: null
  };

  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const adSetId = normalizeTextValue(record["Ad set ID"]);
  // Ad-level has no explicit Ad ID column — use stable key from adSetId + adName
  const adId = adSetId && adName ? `${adSetId}__${slugifyToken(adName)}` : null;

  return {
    importLevel: "AD" as const,
    campaignId,
    adSetId,
    adId,
    sourceRowNumber: rowNumber,
    reportDate: reportingStarts,
    approachName: namingSignals.approachName,
    campaignName,
    adsetName,
    adName,
    globalGroupKey: namingSignals.globalGroupKey,
    comparisonGroupKey: namingSignals.comparisonGroupKey,
    hasResults: (results ?? 0) > 0,
    results,
    spend: parseDecimalValue(normalizeTextValue(record["Amount spent (USD)"]), "Amount spent (USD)", rowNumber),
    impressions: parseIntegerValue(normalizeTextValue(record["Impressions"]), "Impressions", rowNumber),
    clicks: parseIntegerValue(normalizeTextValue(record["Clicks (all)"]), "Clicks (all)", rowNumber),
    cpc: parseDecimalValue(normalizeTextValue(record["CPC (all) (USD)"]), "CPC (all) (USD)", rowNumber),
    ctr: parseDecimalValue(
      normalizeTextValue(record["CTR (link click-through rate)"]),
      "CTR (link click-through rate)",
      rowNumber
    ),
    cpm: parseDecimalValue(
      normalizeTextValue(record["CPM (cost per 1,000 impressions) (USD)"]),
      "CPM (cost per 1,000 impressions) (USD)",
      rowNumber
    ),
    costPerResult: parseDecimalValue(normalizeTextValue(record["Cost per results"]), "Cost per results", rowNumber),
    normalizedPayload: {
      format: supportedFormatKey,
      naming: {
        delimiter: "|",
        ...namingSignals
      },
      additionalMetrics,
      source: {
        columns: Object.fromEntries(requiredColumns.map((column) => [column, record[column] ?? ""])),
        reportingWindow: {
          starts: reportingStarts.toISOString(),
          ends: reportingEnds.toISOString()
        },
        metricsSemantics: {
          clicks: "Clicks (all)",
          cpc: "CPC (all) (USD)",
          ctr: "CTR (link click-through rate)",
          outboundCtr: "Outbound CTR (click-through rate)",
          cplpv: "Cost per landing page view (USD)",
          cpm: "CPM (cost per 1,000 impressions) (USD)",
          costPerResult: "Cost per results"
        },
        sourceContext: {
          resultIndicator: normalizeTextValue(record["Result indicator"]),
          adDelivery: normalizeTextValue(record["Ad delivery"]),
          adsetDelivery: normalizeTextValue(record["Ad set delivery"]),
          adsetBudget: parseLooseDecimalValue(normalizeTextValue(record["Ad set budget"])),
          adsetBudgetType: normalizeTextValue(record["Ad set budget type"]),
          reach: parseIntegerValue(normalizeTextValue(record["Reach"]), "Reach", rowNumber),
          adsetId: adSetId,
          campaignId
        }
      }
    } satisfies Prisma.InputJsonValue,
    normalizationError: null
  };
}

export const supportedMetaAdsImportFormat: SupportedImportFormat = {
  key: supportedFormatKey,
  label: supportedFormatLabel,
  requiredColumns,
  optionalColumns,
  namingDelimiter: "|"
};

export const metaAdsCampaignImportFormat: SupportedImportFormat = {
  key: campaignFormatKey,
  label: campaignFormatLabel,
  requiredColumns: campaignRequiredColumns,
  optionalColumns: [],
  namingDelimiter: "|"
};

export const metaAdsAdSetImportFormat: SupportedImportFormat = {
  key: adSetFormatKey,
  label: adSetFormatLabel,
  requiredColumns: adSetRequiredColumns,
  optionalColumns: [],
  namingDelimiter: "|"
};

function normalizeCampaignCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  if (!campaignName) {
    throw new Error(`Строка ${rowNumber}: поле Campaign name обязательно.`);
  }

  const reportingStarts = parseRequiredIsoDate(normalizeTextValue(record["Reporting starts"]), "Reporting starts", rowNumber);
  const reportingEnds = parseRequiredIsoDate(normalizeTextValue(record["Reporting ends"]), "Reporting ends", rowNumber);
  if (reportingEnds.getTime() < reportingStarts.getTime()) {
    throw new Error(`Строка ${rowNumber}: Reporting ends не может быть раньше Reporting starts.`);
  }

  const results = parseIntegerValue(normalizeTextValue(record["Results"]), "Results", rowNumber);
  const namingSignals = extractNamingSignals({ ...record, "Campaign name": campaignName });
  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const additionalMetrics = {
    outboundCtr: parseDecimalValue(normalizeTextValue(record["Outbound CTR (click-through rate)"]), "Outbound CTR (click-through rate)", rowNumber),
    cplpv: parseDecimalValue(normalizeTextValue(record["Cost per landing page view (USD)"]), "Cost per landing page view (USD)", rowNumber),
    delivery: normalizeTextValue(record["Campaign delivery"]),
    cr: null
  };

  return {
    importLevel: "CAMPAIGN" as const,
    campaignId,
    adSetId: null,
    adId: null,
    sourceRowNumber: rowNumber,
    reportDate: reportingStarts,
    approachName: namingSignals.approachName,
    campaignName,
    adsetName: "",
    adName: "",
    globalGroupKey: namingSignals.globalGroupKey,
    comparisonGroupKey: namingSignals.comparisonGroupKey,
    hasResults: (results ?? 0) > 0,
    results,
    spend: parseDecimalValue(normalizeTextValue(record["Amount spent (USD)"]), "Amount spent (USD)", rowNumber),
    impressions: parseIntegerValue(normalizeTextValue(record["Impressions"]), "Impressions", rowNumber),
    clicks: parseIntegerValue(normalizeTextValue(record["Clicks (all)"]), "Clicks (all)", rowNumber),
    cpc: parseDecimalValue(normalizeTextValue(record["CPC (all) (USD)"]), "CPC (all) (USD)", rowNumber),
    ctr: parseDecimalValue(normalizeTextValue(record["CTR (link click-through rate)"]), "CTR (link click-through rate)", rowNumber),
    cpm: parseDecimalValue(normalizeTextValue(record["CPM (cost per 1,000 impressions) (USD)"]), "CPM (cost per 1,000 impressions) (USD)", rowNumber),
    costPerResult: parseDecimalValue(normalizeTextValue(record["Cost per results"]), "Cost per results", rowNumber),
    normalizedPayload: {
      format: campaignFormatKey,
      naming: { delimiter: "|", ...namingSignals },
      additionalMetrics,
      source: {
        columns: Object.fromEntries(campaignRequiredColumns.map((col) => [col, record[col] ?? ""])),
        reportingWindow: { starts: reportingStarts.toISOString(), ends: reportingEnds.toISOString() },
        sourceContext: { resultIndicator: normalizeTextValue(record["Result indicator"]), campaignId }
      }
    } satisfies Prisma.InputJsonValue,
    normalizationError: null
  };
}

function normalizeAdSetCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  const adsetName = normalizeTextValue(record["Ad set name"]);
  if (!campaignName || !adsetName) {
    throw new Error(`Строка ${rowNumber}: поля Campaign name и Ad set name обязательны.`);
  }

  const reportingStarts = parseRequiredIsoDate(normalizeTextValue(record["Reporting starts"]), "Reporting starts", rowNumber);
  const reportingEnds = parseRequiredIsoDate(normalizeTextValue(record["Reporting ends"]), "Reporting ends", rowNumber);
  if (reportingEnds.getTime() < reportingStarts.getTime()) {
    throw new Error(`Строка ${rowNumber}: Reporting ends не может быть раньше Reporting starts.`);
  }

  const results = parseIntegerValue(normalizeTextValue(record["Results"]), "Results", rowNumber);
  const namingSignals = extractNamingSignals({ ...record, "Campaign name": campaignName, "Ad set name": adsetName });
  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const adSetId = normalizeTextValue(record["Ad set ID"]);
  const additionalMetrics = {
    outboundCtr: parseDecimalValue(normalizeTextValue(record["Outbound CTR (click-through rate)"]), "Outbound CTR (click-through rate)", rowNumber),
    cplpv: parseDecimalValue(normalizeTextValue(record["Cost per landing page view (USD)"]), "Cost per landing page view (USD)", rowNumber),
    delivery: normalizeTextValue(record["Ad set delivery"]),
    cr: null
  };

  return {
    importLevel: "AD_SET" as const,
    campaignId,
    adSetId,
    adId: null,
    sourceRowNumber: rowNumber,
    reportDate: reportingStarts,
    approachName: namingSignals.approachName,
    campaignName,
    adsetName,
    adName: "",
    globalGroupKey: namingSignals.globalGroupKey,
    comparisonGroupKey: namingSignals.comparisonGroupKey,
    hasResults: (results ?? 0) > 0,
    results,
    spend: parseDecimalValue(normalizeTextValue(record["Amount spent (USD)"]), "Amount spent (USD)", rowNumber),
    impressions: parseIntegerValue(normalizeTextValue(record["Impressions"]), "Impressions", rowNumber),
    clicks: parseIntegerValue(normalizeTextValue(record["Clicks (all)"]), "Clicks (all)", rowNumber),
    cpc: parseDecimalValue(normalizeTextValue(record["CPC (all) (USD)"]), "CPC (all) (USD)", rowNumber),
    ctr: parseDecimalValue(normalizeTextValue(record["CTR (link click-through rate)"]), "CTR (link click-through rate)", rowNumber),
    cpm: parseDecimalValue(normalizeTextValue(record["CPM (cost per 1,000 impressions) (USD)"]), "CPM (cost per 1,000 impressions) (USD)", rowNumber),
    costPerResult: parseDecimalValue(normalizeTextValue(record["Cost per results"]), "Cost per results", rowNumber),
    normalizedPayload: {
      format: adSetFormatKey,
      naming: { delimiter: "|", ...namingSignals },
      additionalMetrics,
      source: {
        columns: Object.fromEntries(adSetRequiredColumns.map((col) => [col, record[col] ?? ""])),
        reportingWindow: { starts: reportingStarts.toISOString(), ends: reportingEnds.toISOString() },
        sourceContext: {
          resultIndicator: normalizeTextValue(record["Result indicator"]),
          adsetDelivery: normalizeTextValue(record["Ad set delivery"]),
          adsetBudget: parseLooseDecimalValue(normalizeTextValue(record["Ad set budget"])),
          adsetBudgetType: normalizeTextValue(record["Ad set budget type"]),
          reach: parseIntegerValue(normalizeTextValue(record["Reach"]), "Reach", rowNumber),
          adSetId,
          campaignId
        }
      }
    } satisfies Prisma.InputJsonValue,
    normalizationError: null
  };
}

function buildParsedImport<T extends readonly string[]>(
  document: ReturnType<typeof parseCsvDocument>,
  formatKey: string,
  format: SupportedImportFormat,
  normalizeFn: (record: CsvRecord, rowNumber: number) => NormalizedRowDraft,
  columns: T
): ParsedMetaAdsImport {
  const rawRows: RawRowDraft[] = [];
  const normalizedRows: NormalizedRowDraft[] = [];
  const recentIssues: ImportIssue[] = [];
  let warningRows = 0;

  for (let rowIndex = 0; rowIndex < document.rows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 2;
    const record = buildCsvRecord(document.headers, document.rows[rowIndex]);
    let parseError: string | null = null;

    try {
      const normalizedRow = normalizeFn(record, rowNumber);
      normalizedRows.push(normalizedRow);
      const warnings = Array.isArray((normalizedRow.normalizedPayload as { naming?: { warnings?: unknown } }).naming?.warnings)
        ? ((normalizedRow.normalizedPayload as { naming?: { warnings?: string[] } }).naming?.warnings ?? [])
        : [];
      if (warnings.length) {
        warningRows += 1;
        if (recentIssues.length < maxPersistedIssues) {
          recentIssues.push({ rowNumber, message: warnings.join(" ") });
        }
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : `Строка ${rowNumber}: не удалось нормализовать CSV-строку.`;
      if (recentIssues.length < maxPersistedIssues) {
        recentIssues.push({ rowNumber, message: parseError });
      }
    }

    rawRows.push({
      rowNumber,
      rowHash: buildRowHash(record),
      rawPayload: { format: formatKey, columns: record } satisfies Prisma.InputJsonValue,
      parseError
    });
  }

  return {
    format,
    totalRows: rawRows.length,
    parsedRows: normalizedRows.length,
    failedRows: rawRows.filter((row) => row.parseError).length,
    warningRows,
    rawRows,
    normalizedRows,
    recentIssues
  };
}

export function parseMetaAdsCampaignCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, campaignRequiredColumns, campaignFormatLabel, campaignFormatKey);
  return buildParsedImport(document, campaignFormatKey, metaAdsCampaignImportFormat, normalizeCampaignCsvRow, campaignRequiredColumns);
}

export function parseMetaAdsAdSetCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, adSetRequiredColumns, adSetFormatLabel, adSetFormatKey);
  return buildParsedImport(document, adSetFormatKey, metaAdsAdSetImportFormat, normalizeAdSetCsvRow, adSetRequiredColumns);
}

export function parseSupportedMetaAdsCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureSupportedHeaders(document.headers);
  return buildParsedImport(document, supportedFormatKey, supportedMetaAdsImportFormat, normalizeCsvRow, requiredColumns);
}
