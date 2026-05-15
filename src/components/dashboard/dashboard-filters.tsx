"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

export type AdAccountOption = {
  id: string;
  tag: string;
  accountId: string;
};

type Props = {
  adAccounts: AdAccountOption[];
  owners: string[];
  currentFrom: string;
  currentTo: string;
  currentAdAccountId: string;
  currentOwnerId: string;
};

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildUrl(from: string, to: string, adAccountId: string, ownerId: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (adAccountId) params.set("cabinetId", adAccountId);
  if (ownerId) params.set("ownerId", ownerId);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function DashboardFilters({
  adAccounts,
  owners,
  currentFrom,
  currentTo,
  currentAdAccountId,
  currentOwnerId,
}: Props) {
  const router = useRouter();

  const navigate = useCallback(
    (from: string, to: string, adAccountId?: string, ownerId?: string) => {
      router.push(
        buildUrl(
          from,
          to,
          adAccountId ?? currentAdAccountId,
          ownerId ?? currentOwnerId
        )
      );
    },
    [router, currentAdAccountId, currentOwnerId]
  );

  function preset(offsetDays: number, spanDays = 1) {
    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);
    to.setUTCDate(to.getUTCDate() - offsetDays);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (spanDays - 1));
    navigate(formatDateParam(from), formatDateParam(to));
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    navigate(
      String(data.get("from") ?? ""),
      String(data.get("to") ?? ""),
      String(data.get("cabinetId") ?? ""),
      String(data.get("ownerId") ?? "")
    );
  }

  const presets: Array<{ label: string; offsetDays: number; spanDays: number }> = [
    { label: "Сегодня", offsetDays: 0, spanDays: 1 },
    { label: "Вчера", offsetDays: 1, spanDays: 1 },
    { label: "7 дней", offsetDays: 6, spanDays: 7 },
    { label: "30 дней", offsetDays: 29, spanDays: 30 },
  ];

  return (
    <div className="dashboard-filters">
      {/* Preset buttons */}
      <div className="dashboard-filters__presets">
        {presets.map((p) => (
          <button
            key={p.label}
            className="button button--secondary button--compact"
            type="button"
            onClick={() => preset(p.offsetDays, p.spanDays)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range + cabinet + owner */}
      <form className="dashboard-filters__form" onSubmit={handleFormSubmit}>
        <div className="dashboard-filters__row">
          <div className="dashboard-filters__group">
            <label className="field__label" htmlFor="df-from">
              От
            </label>
            <input
              className="auth-input auth-input--compact"
              defaultValue={currentFrom}
              id="df-from"
              name="from"
              type="date"
            />
          </div>
          <div className="dashboard-filters__group">
            <label className="field__label" htmlFor="df-to">
              До
            </label>
            <input
              className="auth-input auth-input--compact"
              defaultValue={currentTo}
              id="df-to"
              name="to"
              type="date"
            />
          </div>

          {adAccounts.length > 0 && (
            <div className="dashboard-filters__group">
              <label className="field__label" htmlFor="df-cabinet">
                Кабинет
              </label>
              <select
                className="auth-input auth-input--compact"
                defaultValue={currentAdAccountId}
                id="df-cabinet"
                name="cabinetId"
              >
                <option value="">Все</option>
                {adAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          {owners.length > 0 && (
            <div className="dashboard-filters__group">
              <label className="field__label" htmlFor="df-owner">
                Владелец
              </label>
              <select
                className="auth-input auth-input--compact"
                defaultValue={currentOwnerId}
                id="df-owner"
                name="ownerId"
              >
                <option value="">Все</option>
                {owners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="dashboard-filters__group dashboard-filters__group--action">
            <label className="field__label" aria-hidden="true">
              &nbsp;
            </label>
            <button className="button button--primary button--compact" type="submit">
              Применить
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
