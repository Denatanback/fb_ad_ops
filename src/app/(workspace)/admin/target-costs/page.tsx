import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { saveTargetCostConfigAction } from "@/app/(workspace)/admin/target-costs/actions";
import { requireRole } from "@/server/auth/session";
import { listApproachOptions } from "@/server/services/approaches";
import { getHistoricalDashboardAggregates } from "@/server/services/historical-aggregates";
import { getTargetCostAdminData, type TargetCostConfigView } from "@/server/services/target-costs";
import type { AnalyzerRuleScope } from "@/server/analyzer/foundation";

type TargetCostsPageProps = {
  searchParams?: { status?: string; reason?: string };
};

const statusLabels = {
  below_target: "Ниже цели",
  on_target: "В цели",
  above_target: "Выше цели",
  no_target: "Без цели",
  insufficient_results: "Мало данных"
} as const;

const statusPills = {
  below_target: "pill--ready",
  on_target: "pill--ready",
  above_target: "pill--stopped",
  no_target: "pill--neutral",
  insufficient_results: "pill--pending"
} as const;

function getFlashMessage(status?: string, reason?: string) {
  if (status === "saved") return { tone: "success" as const, message: "Target cost сохранён." };
  if (status === "error") return { tone: "error" as const, message: reason || "Не удалось сохранить." };
  return null;
}

function fmt(value: number | string | null | undefined) {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

function fmtInt(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

function buildDraft(scope: Extract<AnalyzerRuleScope, "approach" | "funnel">): TargetCostConfigView {
  return { id: `create-${scope}`, scope, scopeKey: "", approachId: null, approachName: null, funnelKey: null, targetCostUsd: "60.0000", notes: null, updatedAt: new Date(0) };
}

// ─── Compact cost row ─────────────────────────────────────────────────────────

function CostRow({
  config,
  scope,
  approachOptions = [],
  allowScopeEdit = false
}: {
  config: TargetCostConfigView;
  scope: AnalyzerRuleScope;
  approachOptions?: { id: string; name: string }[];
  allowScopeEdit?: boolean;
}) {
  const uid = `${scope}-${config.id}`;

  return (
    <form action={saveTargetCostConfigAction} className="rule-row">
      <input type="hidden" name="scope" value={scope} />
      {scope === "approach" && !allowScopeEdit ? <input type="hidden" name="approachId" value={config.approachId ?? ""} /> : null}
      {scope === "funnel" && !allowScopeEdit ? <input type="hidden" name="funnelKey" value={config.funnelKey ?? ""} /> : null}

      <div className="rule-row__head">
        <div className="rule-row__title-block">
          <span className="rule-row__name">
            {scope === "global" ? "Глобальный target cost"
              : config.approachName ? config.approachName
              : config.funnelKey ? config.funnelKey
              : "Новый override"}
          </span>
          {config.approachName || config.funnelKey ? null : (
            <span className="rule-row__desc">
              {scope === "global"
                ? "Применяется ко всем кампаниям, где нет более точного override."
                : "Используется, если подход или funnel живёт с другим допустимым CPA."}
            </span>
          )}
        </div>
        <div className="rule-row__controls">
          <span className="pill pill--neutral" style={{ fontSize: "0.8rem" }}>
            {scope === "global" ? "Глобально" : scope === "approach" ? "По подходу" : "По funnel"}
          </span>
        </div>
      </div>

      {/* Scope identity for new overrides */}
      {allowScopeEdit && scope === "approach" ? (
        <div className="rule-row__scope-field">
          <label className="field__label" htmlFor={`${uid}-approach`}>Подход</label>
          <select id={`${uid}-approach`} name="approachId" className="auth-input" defaultValue="" required>
            <option value="">Выберите подход…</option>
            {approachOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      {allowScopeEdit && scope === "funnel" ? (
        <div className="rule-row__scope-field">
          <label className="field__label" htmlFor={`${uid}-fkey`}>Funnel key</label>
          <input id={`${uid}-fkey`} name="funnelKey" type="text" className="auth-input" placeholder="например, soulmate-main" required />
        </div>
      ) : null}

      <div className="rule-row__fields">
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-target`}>Целевой CPA ($)</label>
          <input
            id={`${uid}-target`}
            name="targetCostUsd"
            type="text"
            inputMode="decimal"
            className="auth-input"
            defaultValue={config.targetCostUsd}
            placeholder="60"
            autoComplete="off"
          />
        </div>
        <div className="field rule-row__notes" style={{ flex: "1 1 240px" }}>
          <label className="field__label" htmlFor={`${uid}-notes`}>Комментарий</label>
          <input
            id={`${uid}-notes`}
            name="notes"
            type="text"
            className="auth-input"
            defaultValue={config.notes ?? ""}
            placeholder="Необязательно"
            autoComplete="off"
          />
        </div>
        <div className="field" style={{ alignSelf: "flex-end" }}>
          <button type="submit" className="button button--primary button--compact" style={{ marginTop: "auto" }}>
            Сохранить
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Override table row ───────────────────────────────────────────────────────

function OverrideRow({ config, scope }: { config: TargetCostConfigView; scope: Extract<AnalyzerRuleScope, "approach" | "funnel"> }) {
  return (
    <tr>
      <td>
        <div className="table-primary">
          <strong>{scope === "approach" ? (config.approachName ?? "—") : (config.funnelKey ?? "—")}</strong>
        </div>
      </td>
      <td><strong>{fmt(config.targetCostUsd)}</strong></td>
      <td className="table-muted">{config.notes ?? "—"}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TargetCostsAdminPage({ searchParams }: TargetCostsPageProps) {
  await requireRole("admin");

  const [{ globalDefaults, approachOverrides, funnelOverrides }, approachOptions, hist] = await Promise.all([
    getTargetCostAdminData(),
    listApproachOptions(),
    getHistoricalDashboardAggregates()
  ]);

  const flashMessage = getFlashMessage(searchParams?.status, searchParams?.reason);
  const globalDefault = globalDefaults[0];

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Настройки анализатора"
        title="Целевой CPA"
        description="Источник правды для historical summaries и рекомендаций по cost per result."
      />

      <SettingsSectionNav activeHref="/admin/target-costs" isAdmin />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Глобальная цель</span>
          <strong className="summary-stat__value">{fmt(globalDefault?.targetCostUsd ?? null)}</strong>
          <span className="summary-stat__hint">Базовое значение по умолчанию</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Spend</span>
          <strong className="summary-stat__value">{fmt(hist.summary.totalSpend)}</strong>
          <span className="summary-stat__hint">Суммарный исторический расход</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Кампании</span>
          <strong className="summary-stat__value">{fmtInt(hist.summary.campaignCount)}</strong>
          <span className="summary-stat__hint">В исторической базе</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Overrides</span>
          <strong className="summary-stat__value">{approachOverrides.length + funnelOverrides.length}</strong>
          <span className="summary-stat__hint">global → approach → funnel</span>
        </article>
      </section>

      {/* Global */}
      <SectionCard title="Глобальный target cost" description="Базовое значение. Применяется, если нет override для подхода или funnel.">
        <div className="rules-stack">
          {globalDefault
            ? <CostRow config={globalDefault} scope="global" />
            : <p className="table-muted">Глобальный target cost ещё не настроен.</p>
          }
        </div>
      </SectionCard>

      {/* Approach overrides */}
      <SectionCard title="Overrides по подходам" description="Отдельные target cost для подходов, где нужен свой лимит по CPA.">
        {approachOverrides.length > 0 ? (
          <div className="table-shell" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Подход</th>
                  <th>Целевой CPA</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {approachOverrides.map((c) => <OverrideRow key={c.id} config={c} scope="approach" />)}
              </tbody>
            </table>
          </div>
        ) : null}

        {approachOptions.length > 0 ? (
          <details className="rule-override-expander">
            <summary className="rule-override-expander__toggle">
              {approachOverrides.length > 0 ? "Добавить ещё override" : "Добавить override по подходу"}
            </summary>
            <div className="rules-stack" style={{ marginTop: 16 }}>
              <CostRow config={buildDraft("approach")} scope="approach" approachOptions={approachOptions} allowScopeEdit />
            </div>
          </details>
        ) : (
          <p className="table-muted">Сначала создайте хотя бы один подход.</p>
        )}
      </SectionCard>

      {/* Funnel overrides */}
      <SectionCard title="Overrides по funnel" description="Самый точный слой — по системному funnel key.">
        {funnelOverrides.length > 0 ? (
          <div className="table-shell" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Funnel key</th>
                  <th>Целевой CPA</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {funnelOverrides.map((c) => <OverrideRow key={c.id} config={c} scope="funnel" />)}
              </tbody>
            </table>
          </div>
        ) : null}

        <details className="rule-override-expander">
          <summary className="rule-override-expander__toggle">
            {funnelOverrides.length > 0 ? "Добавить ещё funnel override" : "Добавить funnel override"}
          </summary>
          <div className="rules-stack" style={{ marginTop: 16 }}>
            <CostRow config={buildDraft("funnel")} scope="funnel" allowScopeEdit />
          </div>
        </details>
      </SectionCard>

      {/* Historical summary */}
      {hist.approaches.length > 0 ? (
        <SectionCard title="Топ подходов по spend" description="Исторический snapshot из completed imports.">
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Подход</th>
                  <th>Spend</th>
                  <th>CPA</th>
                  <th>Цель</th>
                  <th>Статус</th>
                  <th>Кампании</th>
                </tr>
              </thead>
              <tbody>
                {hist.approaches.slice(0, 8).map((a) => (
                  <tr key={`${a.approachId ?? "none"}-${a.approachName}`}>
                    <td><strong>{a.approachName}</strong></td>
                    <td>{fmt(a.totalSpend)}</td>
                    <td>{fmt(a.costPerResult)}</td>
                    <td>{fmt(a.targetCostUsd)}</td>
                    <td>
                      <span className={`pill ${statusPills[a.targetCostStatus] ?? "pill--neutral"}`}>
                        {statusLabels[a.targetCostStatus]}
                      </span>
                    </td>
                    <td className="table-muted">{fmtInt(a.campaignCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
