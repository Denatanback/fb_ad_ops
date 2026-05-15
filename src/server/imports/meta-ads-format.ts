import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { parseCsvDocument } from "@/server/imports/csv";

const supportedFormatKey = "meta_ads_ad_level_export_v1" as const;
const supportedFormatLabel = "Meta Ads ad-level export" as const;
const campaignFormatKey = "meta_ads_campaign_level_export_v1" as const;
const campaignFormatLabel = "Meta Ads campaign-level export" as const;
const adSetFormatKey = "meta_ads_adset_level_export_v1" as const;
const adSetFormatLabel = "Meta Ads ad set-level export" as const;

const adRequiredColumns = [
  "Ad name",
  "Ad set name",
  "Campaign name",
  "Reporting starts",
  "Reporting ends",
] as const;

const adSetRequiredColumns = [
  "Ad set name",
  "Campaign name",
  "Reporting starts",
  "Reporting ends",
] as const;

const campaignRequiredColumns = [
  "Campaign name",
  "Reporting starts",
  "Reporting ends",
] as const;

const sharedOptionalMetricColumns = [
  "Delivery",
  "Results",
  "Result indicator",
  "Cost per results",
  "Amount spent (USD)",
  "CPM (cost per 1,000 impressions) (USD)",
  "Frequency",
  "Reach",
  "Impressions",
  "Clicks (all)",
  "Cost per outbound click (USD)",
  "Outbound CTR (click-through rate)",
  "Outbound clicks",
  "CPC (cost per link click) (USD)",
  "CTR (link click-through rate)",
  "Link clicks",
  "CTR (all)",
  "CPC (all) (USD)",
  "Landing page views",
  "Cost per landing page view (USD)",
  "Budget",
  "Ad set budget",
  "Ad set budget type",
  "Results (initial)",
  "Results (initial) indicator",
] as const;

const campaignOptionalColumns = [
  "Campaign ID",
  "Campaign delivery",
  ...sharedOptionalMetricColumns,
] as const;

const adSetOptionalColumns = [
  "Campaign ID",
  "Ad set ID",
  "Ad set delivery",
  ...sharedOptionalMetricColumns,
] as const;

const adOptionalColumns = [
  "Campaign ID",
  "Ad set ID",
  "Ad ID",
  "Ad delivery",
  "Ad set delivery",
  ...sharedOptionalMetricColumns,
] as const;

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

type ParsedSharedMetrics = {
  results: number | null;
  resultIndicator: string | null;
  costPerResult: string | null;
  spend: string | null;
  cpm: string | null;
  frequency: number | null;
  reach: number | null;
  impressions: number | null;
  clicksAll: number | null;
  costPerOutboundClick: number | null;
  outboundCtr: number | null;
  outboundClicks: number | null;
  linkCpc: number | null;
  linkCtr: string | null;
  linkCtrNumber: number | null;
  linkClicks: number | null;
  ctrAll: number | null;
  cpcAll: string | null;
  landingPageViews: number | null;
  costPerLandingPageView: number | null;
  budget: number | null;
  adSetBudget: number | null;
  adSetBudgetType: string | null;
  resultsInitial: number | null;
  resultsInitialIndicator: string | null;
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

function sanitizeNumericValue(value: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || /^[-\u2013\u2014]+$/.test(trimmed)) return null;

  const withoutCurrencyOrPercent = trimmed.replace(/[$%]/g, "");
  const withoutGrouping = withoutCurrencyOrPercent.replace(/,/g, "");
  const normalized = withoutGrouping.replace(/\s/g, "");

  return normalized && !/^[-\u2013\u2014]+$/.test(normalized) ? normalized : null;
}

function parseOptionalDecimal(value: string | null): number | null {
  const sanitized = sanitizeNumericValue(value);
  if (!sanitized) return null;

  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDecimalString(value: string | null): string | null {
  const parsed = parseOptionalDecimal(value);
  return parsed === null ? null : parsed.toFixed(4);
}

function parseOptionalInteger(value: string | null): number | null {
  const parsed = parseOptionalDecimal(value);
  return parsed === null ? null : Math.round(parsed);
}

function parseRequiredIsoDate(value: string | null, label: string, rowNumber: number) {
  if (!value) {
    throw new Error(`Row ${rowNumber}: ${label} is required.`);
  }

  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Row ${rowNumber}: ${label} must use YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Row ${rowNumber}: ${label} contains an invalid date.`);
  }

  return parsed;
}

function parseDailyReportingWindow(record: CsvRecord, rowNumber: number) {
  const reportingStarts = parseRequiredIsoDate(
    normalizeTextValue(record["Reporting starts"]),
    "Reporting starts",
    rowNumber
  );
  const reportingEnds = parseRequiredIsoDate(
    normalizeTextValue(record["Reporting ends"]),
    "Reporting ends",
    rowNumber
  );

  if (reportingStarts.getTime() !== reportingEnds.getTime()) {
    throw new Error(
      `Row ${rowNumber}: daily imports require Reporting starts and Reporting ends to be the same date.`
    );
  }

  return { reportingStarts, reportingEnds };
}

function resolveDelivery(record: CsvRecord, specificColumn: string): string | null {
  return normalizeTextValue(record[specificColumn]) ?? normalizeTextValue(record["Delivery"]);
}

function splitNamingTokens(value: string) {
  return value
    .split("|")
    .map((token) => token.trim())
    .filter(Boolean);
}

function extractNamingSignals(record: CsvRecord) {
  const campaignName = (record["Campaign name"] ?? "").trim();
  const adsetName = (record["Ad set name"] ?? "").trim();
  const adName = (record["Ad name"] ?? "").trim();
  const campaignTokens = splitNamingTokens(campaignName);
  const adsetTokens = splitNamingTokens(adsetName);
  const adTokens = splitNamingTokens(adName);
  const fallbackCampaignTokens = campaignName
    .split(/[-_]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const warnings: string[] = [];
  const approachName = campaignTokens[0] ?? fallbackCampaignTokens[0] ?? null;
  const globalGroupSource = campaignTokens[1] ?? campaignName;
  const comparisonLabel =
    [campaignTokens[0], campaignTokens[1], adsetTokens[0]].filter(Boolean).join(" | ") ||
    campaignName;

  if (campaignTokens.length < 2 && !fallbackCampaignTokens.length) {
    warnings.push("Campaign name does not contain the expected `Approach | Group` pattern.");
  }

  return {
    approachName,
    globalGroupKey: globalGroupSource ? slugifyToken(globalGroupSource) || null : null,
    comparisonGroupKey:
      comparisonLabel ? slugifyToken(comparisonLabel) || null : slugifyToken(campaignName) || null,
    warnings,
    tokens: {
      campaign: campaignTokens,
      adset: adsetTokens,
      ad: adTokens,
    },
  };
}

function ensureHeaders(
  headers: string[],
  required: readonly string[],
  formatLabel: string,
  formatKey: string
) {
  const missing = required.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(
      `Unsupported CSV format. Missing required columns: ${missing.join(", ")}. Expected ${formatLabel} (${formatKey}).`
    );
  }
}

function buildCsvRecord(headers: string[], values: string[]): CsvRecord {
  return headers.reduce<CsvRecord>((record, header, index) => {
    record[header] = values[index]?.trim() ?? "";
    return record;
  }, {});
}

function parseSharedOptionalMetrics(record: CsvRecord): ParsedSharedMetrics {
  const linkCtrNumber = parseOptionalDecimal(normalizeTextValue(record["CTR (link click-through rate)"]));
  const costPerLandingPageView = parseOptionalDecimal(
    normalizeTextValue(record["Cost per landing page view (USD)"])
  );
  const cpcAll = parseOptionalDecimalString(normalizeTextValue(record["CPC (all) (USD)"]));

  return {
    results: parseOptionalInteger(normalizeTextValue(record["Results"])),
    resultIndicator: normalizeTextValue(record["Result indicator"]),
    costPerResult: parseOptionalDecimalString(normalizeTextValue(record["Cost per results"])),
    spend: parseOptionalDecimalString(normalizeTextValue(record["Amount spent (USD)"])),
    cpm: parseOptionalDecimalString(normalizeTextValue(record["CPM (cost per 1,000 impressions) (USD)"])),
    frequency: parseOptionalDecimal(normalizeTextValue(record["Frequency"])),
    reach: parseOptionalInteger(normalizeTextValue(record["Reach"])),
    impressions: parseOptionalInteger(normalizeTextValue(record["Impressions"])),
    clicksAll: parseOptionalInteger(normalizeTextValue(record["Clicks (all)"])),
    costPerOutboundClick: parseOptionalDecimal(normalizeTextValue(record["Cost per outbound click (USD)"])),
    outboundCtr: parseOptionalDecimal(normalizeTextValue(record["Outbound CTR (click-through rate)"])),
    outboundClicks: parseOptionalInteger(normalizeTextValue(record["Outbound clicks"])),
    linkCpc: parseOptionalDecimal(normalizeTextValue(record["CPC (cost per link click) (USD)"])),
    linkCtr: linkCtrNumber === null ? null : linkCtrNumber.toFixed(4),
    linkCtrNumber,
    linkClicks: parseOptionalInteger(normalizeTextValue(record["Link clicks"])),
    ctrAll: parseOptionalDecimal(normalizeTextValue(record["CTR (all)"])),
    cpcAll,
    landingPageViews: parseOptionalInteger(normalizeTextValue(record["Landing page views"])),
    costPerLandingPageView,
    budget: parseOptionalDecimal(
      normalizeTextValue(record["Budget"]) ?? normalizeTextValue(record["Ad set budget"])
    ),
    adSetBudget: parseOptionalDecimal(normalizeTextValue(record["Ad set budget"])),
    adSetBudgetType: normalizeTextValue(record["Ad set budget type"]),
    resultsInitial: parseOptionalInteger(normalizeTextValue(record["Results (initial)"])),
    resultsInitialIndicator: normalizeTextValue(record["Results (initial) indicator"]),
  };
}

function buildAdditionalMetrics(
  metrics: ParsedSharedMetrics,
  deliveryFields: {
    delivery: string | null;
    campaignDelivery?: string | null;
    adSetDelivery?: string | null;
    adDelivery?: string | null;
  }
) {
  return {
    delivery: deliveryFields.delivery,
    campaignDelivery: deliveryFields.campaignDelivery ?? null,
    adSetDelivery: deliveryFields.adSetDelivery ?? null,
    adDelivery: deliveryFields.adDelivery ?? null,
    results: metrics.results,
    resultIndicator: metrics.resultIndicator,
    costPerResult: metrics.costPerResult,
    spend: metrics.spend,
    cpm: metrics.cpm,
    frequency: metrics.frequency,
    reach: metrics.reach,
    impressions: metrics.impressions,
    clicksAll: metrics.clicksAll,
    costPerOutboundClick: metrics.costPerOutboundClick,
    outboundCtr: metrics.outboundCtr,
    outboundClicks: metrics.outboundClicks,
    linkCpc: metrics.linkCpc,
    linkCtr: metrics.linkCtrNumber,
    linkClicks: metrics.linkClicks,
    ctrAll: metrics.ctrAll,
    cpcAll: metrics.cpcAll,
    landingPageViews: metrics.landingPageViews,
    costPerLandingPageView: metrics.costPerLandingPageView,
    budget: metrics.budget,
    adSetBudget: metrics.adSetBudget,
    adSetBudgetType: metrics.adSetBudgetType,
    resultsInitial: metrics.resultsInitial,
    resultsInitialIndicator: metrics.resultsInitialIndicator,
    cplpv: metrics.costPerLandingPageView,
    cr: null,
  };
}

function buildSourcePayload(
  reportingStarts: Date,
  reportingEnds: Date,
  entityKeys: {
    campaignId: string | null;
    campaignName: string;
    adSetId: string | null;
    adSetName: string;
    adId: string | null;
    adName: string;
  },
  context: Record<string, Prisma.InputJsonValue | null>
) {
  return {
    reportingWindow: {
      starts: reportingStarts.toISOString(),
      ends: reportingEnds.toISOString(),
    },
    entityKeys,
    sourceContext: context,
  };
}

function normalizeCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  const adsetName = normalizeTextValue(record["Ad set name"]);
  const adName = normalizeTextValue(record["Ad name"]);

  if (!campaignName || !adsetName || !adName) {
    throw new Error(`Row ${rowNumber}: Campaign name, Ad set name, and Ad name are required.`);
  }

  const { reportingStarts, reportingEnds } = parseDailyReportingWindow(record, rowNumber);
  const metrics = parseSharedOptionalMetrics(record);
  const namingSignals = extractNamingSignals({
    ...record,
    "Campaign name": campaignName,
    "Ad set name": adsetName,
    "Ad name": adName,
  });

  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const adSetId = normalizeTextValue(record["Ad set ID"]);
  const explicitAdId = normalizeTextValue(record["Ad ID"]);
  const adId = explicitAdId ?? (adSetId && adName ? `${adSetId}__${slugifyToken(adName)}` : null);
  const adDelivery = resolveDelivery(record, "Ad delivery");
  const adSetDelivery = normalizeTextValue(record["Ad set delivery"]);

  return {
    importLevel: "AD",
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
    hasResults: (metrics.results ?? 0) > 0,
    results: metrics.results,
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicksAll,
    cpc: metrics.cpcAll,
    ctr: metrics.linkCtr,
    cpm: metrics.cpm,
    costPerResult: metrics.costPerResult,
    normalizedPayload: {
      format: supportedFormatKey,
      naming: { delimiter: "|", ...namingSignals },
      additionalMetrics: buildAdditionalMetrics(metrics, {
        delivery: adDelivery,
        adDelivery,
        adSetDelivery,
      }),
      source: buildSourcePayload(
        reportingStarts,
        reportingEnds,
        { campaignId, campaignName, adSetId, adSetName: adsetName, adId, adName },
        { adDelivery, adSetDelivery, adSetId, campaignId, reach: metrics.reach }
      ),
    } satisfies Prisma.InputJsonValue,
    normalizationError: null,
  };
}

function normalizeCampaignCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  if (!campaignName) {
    throw new Error(`Row ${rowNumber}: Campaign name is required.`);
  }

  const { reportingStarts, reportingEnds } = parseDailyReportingWindow(record, rowNumber);
  const metrics = parseSharedOptionalMetrics(record);
  const namingSignals = extractNamingSignals({ ...record, "Campaign name": campaignName });
  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const campaignDelivery = resolveDelivery(record, "Campaign delivery");

  return {
    importLevel: "CAMPAIGN",
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
    hasResults: (metrics.results ?? 0) > 0,
    results: metrics.results,
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicksAll,
    cpc: metrics.cpcAll,
    ctr: metrics.linkCtr,
    cpm: metrics.cpm,
    costPerResult: metrics.costPerResult,
    normalizedPayload: {
      format: campaignFormatKey,
      naming: { delimiter: "|", ...namingSignals },
      additionalMetrics: buildAdditionalMetrics(metrics, {
        delivery: campaignDelivery,
        campaignDelivery,
      }),
      source: buildSourcePayload(
        reportingStarts,
        reportingEnds,
        { campaignId, campaignName, adSetId: null, adSetName: "", adId: null, adName: "" },
        { campaignDelivery, campaignId, reach: metrics.reach }
      ),
    } satisfies Prisma.InputJsonValue,
    normalizationError: null,
  };
}

function normalizeAdSetCsvRow(record: CsvRecord, rowNumber: number): NormalizedRowDraft {
  const campaignName = normalizeTextValue(record["Campaign name"]);
  const adsetName = normalizeTextValue(record["Ad set name"]);
  if (!campaignName || !adsetName) {
    throw new Error(`Row ${rowNumber}: Campaign name and Ad set name are required.`);
  }

  const { reportingStarts, reportingEnds } = parseDailyReportingWindow(record, rowNumber);
  const metrics = parseSharedOptionalMetrics(record);
  const namingSignals = extractNamingSignals({
    ...record,
    "Campaign name": campaignName,
    "Ad set name": adsetName,
  });
  const campaignId = normalizeTextValue(record["Campaign ID"]);
  const adSetId = normalizeTextValue(record["Ad set ID"]);
  const adSetDelivery = resolveDelivery(record, "Ad set delivery");

  return {
    importLevel: "AD_SET",
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
    hasResults: (metrics.results ?? 0) > 0,
    results: metrics.results,
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicksAll,
    cpc: metrics.cpcAll,
    ctr: metrics.linkCtr,
    cpm: metrics.cpm,
    costPerResult: metrics.costPerResult,
    normalizedPayload: {
      format: adSetFormatKey,
      naming: { delimiter: "|", ...namingSignals },
      additionalMetrics: buildAdditionalMetrics(metrics, {
        delivery: adSetDelivery,
        adSetDelivery,
      }),
      source: buildSourcePayload(
        reportingStarts,
        reportingEnds,
        { campaignId, campaignName, adSetId, adSetName: adsetName, adId: null, adName: "" },
        { adSetDelivery, adSetId, campaignId, reach: metrics.reach }
      ),
    } satisfies Prisma.InputJsonValue,
    normalizationError: null,
  };
}

function buildParsedImport(
  document: ReturnType<typeof parseCsvDocument>,
  formatKey: string,
  format: SupportedImportFormat,
  normalizeFn: (record: CsvRecord, rowNumber: number) => NormalizedRowDraft
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

      const warnings = Array.isArray(
        (normalizedRow.normalizedPayload as { naming?: { warnings?: unknown } }).naming?.warnings
      )
        ? ((normalizedRow.normalizedPayload as { naming?: { warnings?: string[] } }).naming?.warnings ?? [])
        : [];

      if (warnings.length) {
        warningRows += 1;
        if (recentIssues.length < maxPersistedIssues) {
          recentIssues.push({ rowNumber, message: warnings.join(" ") });
        }
      }
    } catch (error) {
      parseError =
        error instanceof Error
          ? error.message
          : `Row ${rowNumber}: failed to normalize CSV row.`;
      if (recentIssues.length < maxPersistedIssues) {
        recentIssues.push({ rowNumber, message: parseError });
      }
    }

    rawRows.push({
      rowNumber,
      rowHash: buildRowHash(record),
      rawPayload: { format: formatKey, columns: record } satisfies Prisma.InputJsonValue,
      parseError,
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
    recentIssues,
  };
}

export const supportedMetaAdsImportFormat: SupportedImportFormat = {
  key: supportedFormatKey,
  label: supportedFormatLabel,
  requiredColumns: adRequiredColumns,
  optionalColumns: adOptionalColumns,
  namingDelimiter: "|",
};

export const metaAdsCampaignImportFormat: SupportedImportFormat = {
  key: campaignFormatKey,
  label: campaignFormatLabel,
  requiredColumns: campaignRequiredColumns,
  optionalColumns: campaignOptionalColumns,
  namingDelimiter: "|",
};

export const metaAdsAdSetImportFormat: SupportedImportFormat = {
  key: adSetFormatKey,
  label: adSetFormatLabel,
  requiredColumns: adSetRequiredColumns,
  optionalColumns: adSetOptionalColumns,
  namingDelimiter: "|",
};

export function inspectSupportedMetaAdsCsv(sourceText: string): InspectedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, adRequiredColumns, supportedFormatLabel, supportedFormatKey);

  let reportStart: Date | null = null;
  let reportEnd: Date | null = null;

  for (let rowIndex = 0; rowIndex < document.rows.length; rowIndex += 1) {
    const rowNumber = rowIndex + 2;
    const record = buildCsvRecord(document.headers, document.rows[rowIndex]);
    const { reportingStarts, reportingEnds } = parseDailyReportingWindow(record, rowNumber);

    if (!reportStart || reportingStarts < reportStart) reportStart = reportingStarts;
    if (!reportEnd || reportingEnds > reportEnd) reportEnd = reportingEnds;
  }

  return {
    format: supportedMetaAdsImportFormat,
    reportStart,
    reportEnd,
    totalRows: document.rows.length,
  };
}

export function parseSupportedMetaAdsCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, adRequiredColumns, supportedFormatLabel, supportedFormatKey);
  return buildParsedImport(document, supportedFormatKey, supportedMetaAdsImportFormat, normalizeCsvRow);
}

export function parseMetaAdsCampaignCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, campaignRequiredColumns, campaignFormatLabel, campaignFormatKey);
  return buildParsedImport(document, campaignFormatKey, metaAdsCampaignImportFormat, normalizeCampaignCsvRow);
}

export function parseMetaAdsAdSetCsv(sourceText: string): ParsedMetaAdsImport {
  const document = parseCsvDocument(sourceText);
  ensureHeaders(document.headers, adSetRequiredColumns, adSetFormatLabel, adSetFormatKey);
  return buildParsedImport(document, adSetFormatKey, metaAdsAdSetImportFormat, normalizeAdSetCsvRow);
}
