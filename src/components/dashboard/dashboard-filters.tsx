"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export type AdAccountOption = {
  id: string;
  tag: string;
  accountId: string;
  ownerId?: string | null;
};

type CabinetMode = "include" | "exclude";

type Props = {
  adAccounts: AdAccountOption[];
  owners: string[];
  currentFrom: string;
  currentTo: string;
  currentCabinetIds: string[];
  currentCabinetMode: CabinetMode;
  currentOwnerId: string;
};

function formatDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

function buildUrl(input: {
  from: string;
  to: string;
  cabinetIds: string[];
  cabinetMode: CabinetMode;
  ownerId: string;
}): string {
  const params = new URLSearchParams();
  const cabinetIds = normalizeIds(input.cabinetIds);

  if (input.from) params.set("from", input.from);
  if (input.to) params.set("to", input.to);
  if (input.ownerId) params.set("ownerId", input.ownerId);
  if (cabinetIds.length) {
    params.set("cabinetMode", input.cabinetMode);
    params.set("cabinetIds", cabinetIds.join(","));
  }

  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export function DashboardFilters({
  adAccounts,
  owners,
  currentFrom,
  currentTo,
  currentCabinetIds,
  currentCabinetMode,
  currentOwnerId,
}: Props) {
  const router = useRouter();
  const [selectedCabinetIds, setSelectedCabinetIds] = useState(() => normalizeIds(currentCabinetIds));
  const [cabinetMode, setCabinetMode] = useState<CabinetMode>(currentCabinetMode);
  const [cabinetSearch, setCabinetSearch] = useState("");

  const cabinetsForOwner = useMemo(() => {
    if (!currentOwnerId) return adAccounts;
    return adAccounts.filter((account) => account.ownerId === currentOwnerId);
  }, [adAccounts, currentOwnerId]);

  const allowedCabinetIdSet = useMemo(
    () => new Set(cabinetsForOwner.map((account) => account.id)),
    [cabinetsForOwner]
  );

  const validSelectedCabinetIds = useMemo(
    () => normalizeIds(selectedCabinetIds).filter((id) => allowedCabinetIdSet.has(id)),
    [allowedCabinetIdSet, selectedCabinetIds]
  );

  const filteredCabinets = useMemo(() => {
    const query = cabinetSearch.trim().toLowerCase();
    if (!query) return cabinetsForOwner;

    return cabinetsForOwner.filter((account) =>
      `${account.tag} ${account.accountId} ${account.ownerId ?? ""}`.toLowerCase().includes(query)
    );
  }, [cabinetSearch, cabinetsForOwner]);

  useEffect(() => {
    setSelectedCabinetIds(normalizeIds(currentCabinetIds));
    setCabinetMode(currentCabinetMode);
  }, [currentCabinetIds, currentCabinetMode]);

  useEffect(() => {
    const current = normalizeIds(currentCabinetIds);
    const valid = current.filter((id) => allowedCabinetIdSet.has(id));

    if (current.length !== valid.length || current.some((id, index) => id !== valid[index])) {
      router.replace(
        buildUrl({
          from: currentFrom,
          to: currentTo,
          cabinetIds: valid,
          cabinetMode,
          ownerId: currentOwnerId,
        })
      );
    }
  }, [allowedCabinetIdSet, cabinetMode, currentCabinetIds, currentFrom, currentOwnerId, currentTo, router]);

  const navigate = useCallback(
    (input: Partial<{ from: string; to: string; cabinetIds: string[]; mode: CabinetMode; ownerId: string }>) => {
      router.push(
        buildUrl({
          from: input.from ?? currentFrom,
          to: input.to ?? currentTo,
          cabinetIds: input.cabinetIds ?? validSelectedCabinetIds,
          cabinetMode: input.mode ?? cabinetMode,
          ownerId: input.ownerId ?? currentOwnerId,
        })
      );
    },
    [cabinetMode, currentFrom, currentOwnerId, currentTo, router, validSelectedCabinetIds]
  );

  function preset(offsetDays: number, spanDays = 1) {
    const to = new Date();
    to.setUTCHours(0, 0, 0, 0);
    to.setUTCDate(to.getUTCDate() - offsetDays);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (spanDays - 1));
    navigate({ from: formatDateParam(from), to: formatDateParam(to) });
  }

  function handleOwnerChange(ownerId: string) {
    const nextAllowedIds = new Set(
      (ownerId ? adAccounts.filter((account) => account.ownerId === ownerId) : adAccounts).map((account) => account.id)
    );
    const nextSelectedIds = selectedCabinetIds.filter((id) => nextAllowedIds.has(id));
    setSelectedCabinetIds(nextSelectedIds);
    navigate({ ownerId, cabinetIds: nextSelectedIds });
  }

  function handleCabinetToggle(cabinetId: string) {
    setSelectedCabinetIds((current) =>
      current.includes(cabinetId)
        ? current.filter((id) => id !== cabinetId)
        : [...current, cabinetId]
    );
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    navigate({
      from: String(data.get("from") ?? ""),
      to: String(data.get("to") ?? ""),
      cabinetIds: validSelectedCabinetIds,
      mode: cabinetMode,
      ownerId: String(data.get("ownerId") ?? ""),
    });
  }

  const presets: Array<{ label: string; offsetDays: number; spanDays: number }> = [
    { label: "Сегодня", offsetDays: 0, spanDays: 1 },
    { label: "Вчера", offsetDays: 1, spanDays: 1 },
    { label: "7 дней", offsetDays: 6, spanDays: 7 },
    { label: "30 дней", offsetDays: 29, spanDays: 30 },
  ];

  const selectedLabel =
    validSelectedCabinetIds.length === 0
      ? "Все кабинеты"
      : `${validSelectedCabinetIds.length} выбрано`;

  return (
    <div className="dashboard-filters">
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

      <form className="dashboard-filters__form" onSubmit={handleFormSubmit}>
        <input name="cabinetIds" type="hidden" value={validSelectedCabinetIds.join(",")} />
        <input name="cabinetMode" type="hidden" value={cabinetMode} />

        <div className="dashboard-filters__row">
          <div className="dashboard-filters__group">
            <label className="field__label" htmlFor="df-from">
              С
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
              По
            </label>
            <input
              className="auth-input auth-input--compact"
              defaultValue={currentTo}
              id="df-to"
              name="to"
              type="date"
            />
          </div>

          {owners.length > 0 && (
            <div className="dashboard-filters__group">
              <label className="field__label" htmlFor="df-owner">
                Владелец
              </label>
              <select
                className="auth-input auth-input--compact"
                id="df-owner"
                name="ownerId"
                onChange={(event) => handleOwnerChange(event.currentTarget.value)}
                value={currentOwnerId}
              >
                <option value="">Все</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
              {currentOwnerId ? (
                <span className="dashboard-filter-helper">Показаны кабинеты выбранного владельца.</span>
              ) : null}
            </div>
          )}

          <div className="dashboard-filters__group dashboard-filters__group--mode">
            <span className="field__label">Фильтр кабинетов</span>
            <div className="dashboard-filter-mode" role="group" aria-label="Фильтр кабинетов">
              <button
                className={`dashboard-filter-mode__button${cabinetMode === "include" ? " dashboard-filter-mode__button--active" : ""}`}
                type="button"
                onClick={() => setCabinetMode("include")}
              >
                Включить выбранные
              </button>
              <button
                className={`dashboard-filter-mode__button${cabinetMode === "exclude" ? " dashboard-filter-mode__button--active" : ""}`}
                type="button"
                onClick={() => setCabinetMode("exclude")}
              >
                Исключить выбранные
              </button>
            </div>
          </div>

          <div className="dashboard-filters__group dashboard-filters__group--cabinets">
            <span className="field__label">Фильтр кабинетов</span>
            <details className="dashboard-cabinet-select">
              <summary className="dashboard-cabinet-select__summary">{selectedLabel}</summary>
              <div className="dashboard-cabinet-select__panel">
                <input
                  aria-label="Поиск кабинетов"
                  className="auth-input auth-input--compact"
                  onChange={(event) => setCabinetSearch(event.currentTarget.value)}
                  placeholder="Поиск кабинетов"
                  type="search"
                  value={cabinetSearch}
                />

                {cabinetsForOwner.length === 0 ? (
                  <p className="dashboard-filter-empty">Нет активных кабинетов у этого владельца.</p>
                ) : filteredCabinets.length === 0 ? (
                  <p className="dashboard-filter-empty">Кабинеты не найдены.</p>
                ) : (
                  <div className="dashboard-cabinet-select__list">
                    {filteredCabinets.map((account) => (
                      <label className="dashboard-cabinet-select__option" key={account.id}>
                        <input
                          checked={selectedCabinetIds.includes(account.id)}
                          onChange={() => handleCabinetToggle(account.id)}
                          type="checkbox"
                        />
                        <span>
                          <strong>{account.tag}</strong>
                          <small>{account.accountId}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <div className="dashboard-cabinet-select__actions">
                  <button
                    className="button button--secondary button--compact"
                    onClick={() => setSelectedCabinetIds([])}
                    type="button"
                  >
                    Очистить
                  </button>
                </div>
              </div>
            </details>
          </div>

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
