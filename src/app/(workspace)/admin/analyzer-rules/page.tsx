import { FlashMessage } from "@/components/workspace/flash-message";
import { PendingFormStatus, PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { saveAnalyzerRuleConfigAction } from "@/app/(workspace)/admin/analyzer-rules/actions";
import { requireRole } from "@/server/auth/session";
import {
  analyzerAlertSeverities,
  analyzerRuleDefinitions,
  analyzerRuleReasonCodes,
  type AnalyzerAlertSeverity,
  type AnalyzerRuleScope,
  type NotificationTopicKey
} from "@/server/analyzer/foundation";
import { telegramNeedsReviewReasonDefinitions, telegramTopicDefinitions } from "@/server/notifications/telegram-routing";
import { listApproachOptions } from "@/server/services/approaches";
import {
  getAnalyzerRuleAdminData,
  type AnalyzerRuleConfigView
} from "@/server/services/analyzer-rules";

type AnalyzerRulesPageProps = {
  searchParams?: {
    status?: string;
    reason?: string;
  };
};

const severityLabels: Record<AnalyzerAlertSeverity, string> = {
  info: "Инфо",
  warning: "Предупреждение",
  critical: "Критично"
};

const severityColors: Record<AnalyzerAlertSeverity, string> = {
  info: "pill--neutral",
  warning: "pill--pending",
  critical: "pill--stopped"
};

const scopeLabels: Record<AnalyzerRuleScope, string> = {
  global: "Глобально",
  approach: "По подходу",
  funnel: "По funnel"
};

function getFlashMessage(status: string | undefined, reason: string | undefined) {
  if (status === "saved") return { tone: "success" as const, message: "Правило сохранено." };
  if (status === "error") return { tone: "error" as const, message: reason || "Не удалось сохранить." };
  return null;
}

function getReasonLabel(code: string | null) {
  if (!code) return "Без кода";
  return telegramNeedsReviewReasonDefinitions.find((r) => r.code === code)?.label ?? code;
}

function getTopicLabel(key: NotificationTopicKey) {
  return telegramTopicDefinitions.find((t) => t.key === key)?.label ?? key;
}

function buildDraftRule(
  definition: (typeof analyzerRuleDefinitions)[number],
  globalDefault: AnalyzerRuleConfigView | undefined,
  scope: Extract<AnalyzerRuleScope, "approach" | "funnel">
): AnalyzerRuleConfigView {
  return {
    id: `create-${scope}-${definition.key}`,
    ruleKey: definition.key,
    ruleLabel: definition.label,
    ruleDescription: definition.description,
    metricKey: definition.metricKey,
    scope,
    scopeKey: "",
    approachId: null,
    approachName: null,
    funnelKey: null,
    enabled: globalDefault?.enabled ?? true,
    severity: globalDefault?.severity ?? "warning",
    destinationTopicKey: globalDefault?.destinationTopicKey ?? definition.destinationTopicKey,
    reasonCode: globalDefault?.reasonCode ?? definition.defaultReasonCode,
    minValue: globalDefault?.minValue ?? null,
    maxValue: globalDefault?.maxValue ?? null,
    spendThreshold: globalDefault?.spendThreshold ?? null,
    maxResults: globalDefault?.maxResults ?? 0,
    notes: globalDefault?.notes ?? null,
    updatedAt: new Date(0)
  };
}

// ─── Compact Rule Form ────────────────────────────────────────────────────────
// One row for thresholds + routing, no nested panels.

function RuleRow({
  rule,
  scope,
  approachOptions = [],
  allowScopeEdit = false
}: Readonly<{
  rule: AnalyzerRuleConfigView;
  scope: AnalyzerRuleScope;
  approachOptions?: { id: string; name: string }[];
  allowScopeEdit?: boolean;
}>) {
  const isMetric = rule.ruleKey === "outbound_ctr" || rule.ruleKey === "cplpv";
  const uid = `${scope}-${rule.ruleKey}-${rule.approachId ?? rule.funnelKey ?? "new"}`;

  return (
    <form action={saveAnalyzerRuleConfigAction} className="rule-row">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="ruleKey" value={rule.ruleKey} />
      {!allowScopeEdit && rule.approachId ? <input type="hidden" name="approachId" value={rule.approachId} /> : null}
      {!allowScopeEdit && rule.funnelKey ? <input type="hidden" name="funnelKey" value={rule.funnelKey} /> : null}

      {/* Header */}
      <div className="rule-row__head">
        <div className="rule-row__title-block">
          <span className="rule-row__name">{rule.ruleLabel}</span>
          {rule.approachName ? (
            <span className="pill pill--neutral rule-row__scope-pill">{rule.approachName}</span>
          ) : rule.funnelKey ? (
            <span className="pill pill--neutral rule-row__scope-pill">{rule.funnelKey}</span>
          ) : null}
          <span className="rule-row__desc">{rule.ruleDescription}</span>
        </div>
        <div className="rule-row__controls">
          <label className="rule-row__toggle" htmlFor={`${uid}-enabled`}>
            <input
              type="checkbox"
              id={`${uid}-enabled`}
              name="enabled"
              defaultChecked={rule.enabled}
              className="rule-row__checkbox"
            />
            <span>Активно</span>
          </label>
          <select
            id={`${uid}-severity`}
            name="severity"
            defaultValue={rule.severity}
            className="auth-input rule-row__select-sm"
            aria-label="Уровень сигнала"
          >
            {analyzerAlertSeverities.map((s) => (
              <option key={s} value={s}>{severityLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Scope identity for new overrides */}
      {allowScopeEdit && scope === "approach" ? (
        <div className="rule-row__scope-field">
          <label className="field__label" htmlFor={`${uid}-approach`}>Подход</label>
          <select
            id={`${uid}-approach`}
            name="approachId"
            defaultValue=""
            className="auth-input"
            required
          >
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
          <input
            id={`${uid}-fkey`}
            name="funnelKey"
            type="text"
            className="auth-input"
            placeholder="например, soulmate-main"
            required
          />
        </div>
      ) : null}

      {/* Fields grid */}
      <div className="rule-row__fields">
        {isMetric ? (
          <>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-min`}>Минимум</label>
              <input
                id={`${uid}-min`}
                name="minValue"
                type="text"
                inputMode="decimal"
                className="auth-input"
                defaultValue={rule.minValue ?? ""}
                placeholder="—"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-max`}>Максимум</label>
              <input
                id={`${uid}-max`}
                name="maxValue"
                type="text"
                inputMode="decimal"
                className="auth-input"
                defaultValue={rule.maxValue ?? ""}
                placeholder="—"
                autoComplete="off"
              />
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-spend`}>Порог расхода ($)</label>
              <input
                id={`${uid}-spend`}
                name="spendThreshold"
                type="text"
                inputMode="decimal"
                className="auth-input"
                defaultValue={rule.spendThreshold ?? ""}
                placeholder="—"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-results`}>Макс. результатов</label>
              <input
                id={`${uid}-results`}
                name="maxResults"
                type="number"
                min={0}
                className="auth-input"
                defaultValue={rule.maxResults ?? 0}
                autoComplete="off"
              />
            </div>
          </>
        )}

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-topic`}>Telegram</label>
          <select
            id={`${uid}-topic`}
            name="destinationTopicKey"
            defaultValue={rule.destinationTopicKey}
            className="auth-input"
          >
            {telegramTopicDefinitions.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor={`${uid}-reason`}>Причина</label>
          <select
            id={`${uid}-reason`}
            name="reasonCode"
            defaultValue={rule.reasonCode ?? "mixed_signal"}
            className="auth-input"
          >
            {analyzerRuleReasonCodes.map((code) => (
              <option key={code} value={code}>{getReasonLabel(code)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes + submit */}
      <div className="rule-row__footer">
        <div className="field rule-row__notes">
          <label className="field__label" htmlFor={`${uid}-notes`}>Комментарий</label>
          <input
            id={`${uid}-notes`}
            name="notes"
            type="text"
            className="auth-input"
            defaultValue={rule.notes ?? ""}
            placeholder="Необязательно"
            autoComplete="off"
          />
        </div>
        <PendingSubmitButton
          className="button button--primary button--compact rule-row__save"
          label="Сохранить"
          pendingLabel="Saving..."
        />
      </div>
      <PendingFormStatus message="Saving..." detail="Updating analyzer rule settings." />
    </form>
  );
}

// ─── Override table row (read-only preview in table) ─────────────────────────

function OverrideTableRow({
  rule,
  scope
}: {
  rule: AnalyzerRuleConfigView;
  scope: Extract<AnalyzerRuleScope, "approach" | "funnel">;
}) {
  const isMetric = rule.ruleKey === "outbound_ctr" || rule.ruleKey === "cplpv";
  const threshold = isMetric
    ? [rule.minValue ? `мин. ${rule.minValue}` : null, rule.maxValue ? `макс. ${rule.maxValue}` : null].filter(Boolean).join(" / ")
    : [rule.spendThreshold ? `расход $${rule.spendThreshold}` : null, rule.maxResults != null ? `результатов ≤ ${rule.maxResults}` : null].filter(Boolean).join(", ");

  return (
    <tr>
      <td>
        <div className="table-primary">
          <strong>{rule.ruleLabel}</strong>
          <span className="table-subcopy">{scope === "approach" ? (rule.approachName ?? "—") : (rule.funnelKey ?? "—")}</span>
        </div>
      </td>
      <td>
        <span className={`pill ${rule.enabled ? "pill--ready" : "pill--pending"}`}>
          {rule.enabled ? "Вкл" : "Откл"}
        </span>
      </td>
      <td>
        <span className={`pill ${severityColors[rule.severity]}`}>{severityLabels[rule.severity]}</span>
      </td>
      <td className="table-muted">{threshold || "—"}</td>
      <td className="table-muted">{getTopicLabel(rule.destinationTopicKey)}</td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyzerRulesAdminPage({ searchParams }: AnalyzerRulesPageProps) {
  await requireRole("admin");

  const [{ globalRules, approachOverrides, funnelOverrides }, approachOptions] = await Promise.all([
    getAnalyzerRuleAdminData(),
    listApproachOptions()
  ]);

  const flashMessage = getFlashMessage(searchParams?.status, searchParams?.reason);
  const globalRuleByKey = new Map(globalRules.map((r) => [r.ruleKey, r]));

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Настройки анализатора"
        title="Правила и пороги"
        description="Диапазоны метрик и пороги расходов, по которым анализатор оценивает кампании. Funnel и подходы могут переопределять глобальные значения."
      />

      <SettingsSectionNav activeHref="/admin/analyzer-rules" isAdmin />

      {flashMessage ? <FlashMessage message={flashMessage.message} tone={flashMessage.tone} /> : null}

      {/* Global rules */}
      <SectionCard
        title="Глобальные правила"
        description="Базовые значения, применяемые ко всем кампаниям, если не задан override."
      >
        <div className="rules-stack">
          {globalRules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} scope="global" />
          ))}
        </div>
      </SectionCard>

      {/* Approach overrides */}
      <SectionCard
        title="Переопределения по подходам"
        description="Точные настройки для конкретного подхода — перекрывают глобальные значения."
      >
        {approachOverrides.length > 0 ? (
          <div className="table-shell" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Правило / Подход</th>
                  <th>Статус</th>
                  <th>Уровень</th>
                  <th>Пороги</th>
                  <th>Telegram</th>
                </tr>
              </thead>
              <tbody>
                {approachOverrides.map((rule) => (
                  <OverrideTableRow key={rule.id} rule={rule} scope="approach" />
                ))}
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
              {analyzerRuleDefinitions.map((def) => (
                <RuleRow
                  key={`approach-new-${def.key}`}
                  rule={buildDraftRule(def, globalRuleByKey.get(def.key), "approach")}
                  scope="approach"
                  approachOptions={approachOptions}
                  allowScopeEdit
                />
              ))}
            </div>
          </details>
        ) : (
          <p className="table-muted">
            Сначала создайте хотя бы один подход, чтобы добавить override.
          </p>
        )}
      </SectionCard>

      {/* Funnel overrides */}
      <SectionCard
        title="Переопределения по funnel"
        description="Самый точный слой. Применяется по системному funnel key без перевода."
      >
        {funnelOverrides.length > 0 ? (
          <div className="table-shell" style={{ marginBottom: 24 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Правило / Funnel key</th>
                  <th>Статус</th>
                  <th>Уровень</th>
                  <th>Пороги</th>
                  <th>Telegram</th>
                </tr>
              </thead>
              <tbody>
                {funnelOverrides.map((rule) => (
                  <OverrideTableRow key={rule.id} rule={rule} scope="funnel" />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <details className="rule-override-expander">
          <summary className="rule-override-expander__toggle">
            {funnelOverrides.length > 0 ? "Добавить ещё funnel override" : "Добавить funnel override"}
          </summary>
          <div className="rules-stack" style={{ marginTop: 16 }}>
            {analyzerRuleDefinitions.map((def) => (
              <RuleRow
                key={`funnel-new-${def.key}`}
                rule={buildDraftRule(def, globalRuleByKey.get(def.key), "funnel")}
                scope="funnel"
                allowScopeEdit
              />
            ))}
          </div>
        </details>
      </SectionCard>
    </div>
  );
}
