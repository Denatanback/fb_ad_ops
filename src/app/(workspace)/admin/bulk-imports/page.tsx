import Link from "next/link";
import { ImportRunStatus } from "@prisma/client";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { uploadBulkHistoricalCsvAction } from "@/app/(workspace)/admin/bulk-imports/actions";
import { requireRole } from "@/server/auth/session";
import { listAdAccounts } from "@/server/services/ad-accounts";
import { listBulkHistoricalImportRuns } from "@/server/services/import-runs";

type BulkImportsPageProps = {
  searchParams?: {
    status?: string;
    reason?: string;
    rows?: string;
    replaced?: string;
  };
};

const importRunStatusLabels: Record<ImportRunStatus, string> = {
  RECEIVED: "Received",
  PARSING: "Parsing",
  NORMALIZING: "Normalizing",
  ANALYZING: "Analyzing",
  COMPLETED: "Completed",
  FAILED: "Failed"
};

function getImportStatusTone(status: ImportRunStatus) {
  if (status === ImportRunStatus.COMPLETED) return "pill--ready";
  if (status === ImportRunStatus.FAILED) return "pill--warning";
  return "pill--pending";
}

function formatReportingWindow(start: Date | null, end: Date | null) {
  if (!start && !end) return "-";
  if (start && end) return `${formatDate(start)} - ${formatDate(end)}`;
  return formatDate(start ?? end);
}

function readBulkDetails(errorDetails: unknown) {
  if (!errorDetails || typeof errorDetails !== "object" || Array.isArray(errorDetails)) {
    return { includedLevels: [] as string[], replacedRowsCount: null as number | null };
  }

  const record = errorDetails as Record<string, unknown>;
  const includedLevels = Array.isArray(record.includedLevels)
    ? record.includedLevels.filter((value): value is string => typeof value === "string")
    : [];
  const replacedRowsCount =
    typeof record.replacedRowsCount === "number" && Number.isFinite(record.replacedRowsCount)
      ? record.replacedRowsCount
      : null;

  return { includedLevels, replacedRowsCount };
}

function formatLevel(level: string) {
  if (level === "CAMPAIGN") return "Campaign";
  if (level === "AD_SET") return "Ad Set";
  if (level === "AD") return "Ad";
  return level;
}

function getFlashMessage(searchParams: BulkImportsPageProps["searchParams"]) {
  if (searchParams?.status === "uploaded") {
    return {
      tone: "success" as const,
      message: `Bulk CSV imported: ${searchParams.rows ?? "0"} rows, ${searchParams.replaced ?? "0"} replaced.`
    };
  }

  if (searchParams?.status === "error") {
    return {
      tone: "error" as const,
      message: searchParams.reason || "Bulk CSV upload failed."
    };
  }

  return null;
}

export default async function AdminBulkImportsPage({ searchParams }: BulkImportsPageProps) {
  await requireRole("admin");

  const [adAccounts, recentBulkRuns] = await Promise.all([
    listAdAccounts(),
    listBulkHistoricalImportRuns(20)
  ]);
  const activeAccounts = adAccounts.filter((account) => account.isActive);
  const flashMessage = getFlashMessage(searchParams);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Admin"
        title="Bulk Historical CSV Import"
        description="Upload Meta Ads daily-breakdown exports and replace only the cabinet, date, and level keys present in the files."
      />

      <SettingsSectionNav activeHref="/admin/bulk-imports" isAdmin />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      <SectionCard
        title="Upload bulk CSV"
        description="Use this for large historical exports that already contain day-by-day rows."
      >
        <form action={uploadBulkHistoricalCsvAction} className="stack">
          <div className="field">
            <label className="field__label" htmlFor="bulk-ad-account">
              Cabinet <span className="field__required">*</span>
            </label>
            {activeAccounts.length ? (
              <select className="auth-input" defaultValue="" id="bulk-ad-account" name="adAccountId" required>
                <option disabled value="">
                  - select active cabinet -
                </option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.tag} ({account.accountId})
                  </option>
                ))}
              </select>
            ) : (
              <p className="field__hint field__hint--warning">
                No active cabinets are available. Activate a cabinet before uploading bulk CSV.
              </p>
            )}
          </div>

          <div className="inline-edit-grid">
            <div className="field">
              <label className="field__label" htmlFor="bulk-campaign-file">
                Campaign CSV
              </label>
              <input
                accept=".csv,text/csv"
                className="auth-input"
                id="bulk-campaign-file"
                name="campaignFile"
                type="file"
              />
              <p className="field__hint">Optional. Replaces only Campaign-level rows for dates in this file.</p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="bulk-adset-file">
                Ad Set CSV
              </label>
              <input
                accept=".csv,text/csv"
                className="auth-input"
                id="bulk-adset-file"
                name="adSetFile"
                type="file"
              />
              <p className="field__hint">Optional. Replaces only Ad Set-level rows for dates in this file.</p>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="bulk-ad-file">
                Ad CSV
              </label>
              <input
                accept=".csv,text/csv"
                className="auth-input"
                id="bulk-ad-file"
                name="adFile"
                type="file"
              />
              <p className="field__hint">Optional. At least one CSV file is required.</p>
            </div>
          </div>

          <div className="empty-inline empty-inline--subtle">
            <h3>Replacement scope</h3>
            <p>
              Bulk CSV must be exported with daily breakdown. Every row must have Reporting starts =
              Reporting ends; reportDate is read from Reporting starts.
            </p>
            <div className="metric-strip">
              <span className="metric-pill">Key: cabinet + reportDate + importLevel</span>
              <span className="metric-pill">Only dates found in CSV are replaced</span>
              <span className="metric-pill">Other cabinets, dates, and levels are untouched</span>
            </div>
          </div>

          <div className="hero-actions">
            <button className="button button--primary" disabled={!activeAccounts.length} type="submit">
              Upload bulk CSV
            </button>
            <Link className="button button--secondary" href="/ad-accounts?tab=upload">
              Daily CSV upload
            </Link>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Bulk import history"
        description="Recent historical imports and their replacement results."
      >
        {recentBulkRuns.length ? (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Cabinet</th>
                  <th>Mode</th>
                  <th>Levels</th>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Replaced</th>
                  <th>Uploaded</th>
                  <th>By</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentBulkRuns.map((run) => {
                  const details = readBulkDetails(run.errorDetails);

                  return (
                    <tr key={run.id}>
                      <td>
                        {run.adAccount ? (
                          <div className="table-primary">
                            <span>{run.adAccount.tag}</span>
                            <span className="table-subcopy">{run.adAccount.accountId}</span>
                          </div>
                        ) : (
                          <span className="table-empty">-</span>
                        )}
                      </td>
                      <td>Bulk historical</td>
                      <td>
                        {details.includedLevels.length ? (
                          <div className="metric-strip">
                            {details.includedLevels.map((level) => (
                              <span className="metric-pill" key={level}>
                                {formatLevel(level)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="table-empty">-</span>
                        )}
                      </td>
                      <td>{formatReportingWindow(run.reportingWindowStart, run.reportingWindowEnd)}</td>
                      <td>
                        <span className={`pill ${getImportStatusTone(run.processingStatus)}`}>
                          {importRunStatusLabels[run.processingStatus]}
                        </span>
                      </td>
                      <td>
                        <div className="table-primary">
                          <strong>{run.normalizedRowsCount}</strong>
                          <span className="table-subcopy">Raw: {run.rawRowsCount}</span>
                        </div>
                      </td>
                      <td>{details.replacedRowsCount ?? "-"}</td>
                      <td>{formatDateTime(run.receivedAt)}</td>
                      <td>{run.uploadedBy?.name ?? run.uploadedBy?.email ?? <span className="table-empty">-</span>}</td>
                      <td className="table-actions">
                        <Link className="button button--secondary button--compact" href={`/imports/${run.id}`}>
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>No bulk imports yet</h3>
            <p>Upload a historical CSV export above to create the first bulk import record.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
