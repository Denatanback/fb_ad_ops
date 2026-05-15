"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { PendingFormStatus, PendingSubmitButton } from "@/components/ui/pending-submit-button";

type AdAccountOption = {
  id: string;
  tag: string;
  accountId: string;
};

type BulkHistoricalImportFormProps = {
  action: (formData: FormData) => void;
  activeAccounts: AdAccountOption[];
};

function BulkHistoricalImportFields({ activeAccounts }: { activeAccounts: AdAccountOption[] }) {
  const { pending } = useFormStatus();

  return (
    <fieldset className="stack" disabled={pending}>
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
        <PendingSubmitButton
          disabled={!activeAccounts.length}
          label="Upload bulk CSV"
          pendingLabel="Processing bulk import..."
        />
        <Link className="button button--secondary" href="/ad-accounts?tab=upload">
          Daily CSV upload
        </Link>
      </div>
      <PendingFormStatus
        message="Processing bulk import..."
        detail="Uploading and processing CSV. Please keep this tab open."
      />
    </fieldset>
  );
}

export function BulkHistoricalImportForm({ action, activeAccounts }: BulkHistoricalImportFormProps) {
  return (
    <form action={action} className="stack">
      <BulkHistoricalImportFields activeAccounts={activeAccounts} />
    </form>
  );
}
