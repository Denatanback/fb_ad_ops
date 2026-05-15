"use client";

import { useFormStatus } from "react-dom";
import { PendingFormStatus } from "@/components/ui/pending-submit-button";

type AdAccountOption = {
  id: string;
  accountId: string;
  tag: string;
};

type ManualImportUploadFormProps = {
  action: (formData: FormData) => void;
  adAccounts: AdAccountOption[];
};

function ManualImportUploadFields({ adAccounts }: { adAccounts: AdAccountOption[] }) {
  const { pending } = useFormStatus();

  return (
    <fieldset className="stack" disabled={pending}>
      <div className="field">
        <label className="field__label" htmlFor="import-ad-account">
          Рекламный кабинет <span className="field__required">*</span>
        </label>
        {adAccounts.length > 0 ? (
          <select
            className="auth-input"
            defaultValue=""
            id="import-ad-account"
            name="adAccountId"
            required
          >
            <option disabled value="">
              — выберите кабинет —
            </option>
            {adAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.tag} ({account.accountId})
              </option>
            ))}
          </select>
        ) : (
          <p className="field__hint field__hint--warning">
            Нет активных рекламных кабинетов. Сначала добавьте кабинет на вкладке «Кабинеты».
          </p>
        )}
      </div>

      <div className="field">
        <label className="field__label" htmlFor="import-campaign-file">
          Кампании (Campaign level)
        </label>
        <input
          accept=".csv,text/csv"
          className="auth-input"
          id="import-campaign-file"
          name="campaignFile"
          type="file"
        />
        <p className="field__hint">meta_ads_campaign_level_export_v1 · необязательно</p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="import-adset-file">
          Группы объявлений (Ad set level)
        </label>
        <input
          accept=".csv,text/csv"
          className="auth-input"
          id="import-adset-file"
          name="adSetFile"
          type="file"
        />
        <p className="field__hint">meta_ads_adset_level_export_v1 · необязательно</p>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="import-ad-file">
          Объявления (Ad level) <span className="field__required">*</span>
        </label>
        <input
          accept=".csv,text/csv"
          className="auth-input"
          id="import-ad-file"
          name="adFile"
          required
          type="file"
        />
        <p className="field__hint">
          meta_ads_ad_level_export_v1 · обязательно. Один день отчётности на файл.
          Повторная загрузка того же дня заменяет предыдущие данные кабинета.
        </p>
      </div>

      <div className="hero-actions">
        <button className="button button--primary" disabled={pending} type="submit">
          {pending ? <span aria-hidden="true" className="loading-spinner" /> : null}
          <span>{pending ? "Uploading CSV..." : "Загрузить CSV"}</span>
        </button>
      </div>
      <PendingFormStatus
        message="Uploading CSV..."
        detail="Uploading and processing CSV. Please keep this tab open."
      />
    </fieldset>
  );
}

export function ManualImportUploadForm({ action, adAccounts }: ManualImportUploadFormProps) {
  return (
    <form action={action} className="stack">
      <ManualImportUploadFields adAccounts={adAccounts} />
    </form>
  );
}
