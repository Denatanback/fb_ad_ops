export const analyzerEvaluationModes = ["results_aware", "proxy_mode"] as const;
export const analyzerConfidenceLevels = ["low", "medium", "high"] as const;
export const importRunStatuses = ["received", "parsing", "normalizing", "analyzing", "completed", "failed"] as const;
export const analyzerAlertKinds = [
  "conversion_arrival",
  "spend_pacing_risk",
  "weak_performance",
  "opportunity_review",
  "import_error_tech"
] as const;
export const analyzerAlertSeverities = ["info", "warning", "critical"] as const;
export const notificationDeliveryStatuses = ["pending", "sent", "failed", "skipped"] as const;
export const analyzerRuleScopes = ["global", "approach", "funnel"] as const;
export const analyzerRuleStages = ["watchdog", "benchmark"] as const;
export const analyzerRuleKeys = [
  "outbound_ctr",
  "cplpv",
  "spend_no_results_creative",
  "spend_no_results_adset"
] as const;
export const analyzerMetricKeys = ["outbound_ctr", "cplpv", "spend"] as const;
export const analyzerRuleReasonCodes = ["spend_anomaly", "weak_metrics", "result_weakness", "mixed_signal"] as const;
export const notificationTopicKeys = [
  "conversions",
  "needs_review",
  "reports",
  "import_errors_tech",
  "bot_test"
] as const;

export type AnalyzerEvaluationMode = (typeof analyzerEvaluationModes)[number];
export type AnalyzerConfidenceLevel = (typeof analyzerConfidenceLevels)[number];
export type ImportRunStatus = (typeof importRunStatuses)[number];
export type AnalyzerAlertKind = (typeof analyzerAlertKinds)[number];
export type AnalyzerAlertSeverity = (typeof analyzerAlertSeverities)[number];
export type NotificationDeliveryStatus = (typeof notificationDeliveryStatuses)[number];
export type AnalyzerRuleScope = (typeof analyzerRuleScopes)[number];
export type AnalyzerRuleStage = (typeof analyzerRuleStages)[number];
export type AnalyzerRuleKey = (typeof analyzerRuleKeys)[number];
export type AnalyzerMetricKey = (typeof analyzerMetricKeys)[number];
export type AnalyzerRuleReasonCode = (typeof analyzerRuleReasonCodes)[number];
export type NotificationTopicKey = (typeof notificationTopicKeys)[number];

export type AnalyzerComparisonGroup = {
  approachId: string;
  groupKey: string;
  groupLabel: string;
};

export type AnalyzerAlertDraft = {
  kind: AnalyzerAlertKind;
  confidence: AnalyzerConfidenceLevel;
  evaluationMode: AnalyzerEvaluationMode;
  title: string;
  summary: string;
  cooldownKey: string;
  comparisonGroup: AnalyzerComparisonGroup;
};

export type ImportProcessingPlan = {
  source: "csv_upload";
  startsAnalyzer: true;
  persistsAlerts: true;
  maySendTelegram: true;
};

export type AnalyzerRuleDefinition = {
  key: AnalyzerRuleKey;
  label: string;
  description: string;
  metricKey: AnalyzerMetricKey;
  stage: Extract<AnalyzerRuleStage, "watchdog">;
  destinationTopicKey: Extract<NotificationTopicKey, "needs_review">;
  defaultReasonCode: AnalyzerRuleReasonCode;
  thresholdHint: string;
};

export type AnalyzerRuleSeedTemplate = {
  ruleKey: AnalyzerRuleKey;
  metricKey: AnalyzerMetricKey;
  ruleStage: AnalyzerRuleDefinition["stage"];
  scope: Extract<AnalyzerRuleScope, "global">;
  scopeKey: "global";
  enabled: boolean;
  severity: Extract<AnalyzerAlertSeverity, "warning" | "critical">;
  destinationTopicKey: Extract<NotificationTopicKey, "needs_review">;
  reasonCode: AnalyzerRuleReasonCode;
  minValue: string | null;
  maxValue: string | null;
  spendThreshold: string | null;
  maxResults: number | null;
  notes: string;
};

export const analyzerRuleDefinitions: readonly AnalyzerRuleDefinition[] = [
  {
    key: "outbound_ctr",
    label: "Outbound CTR",
    description: "Минимальный guardrail по outbound CTR для future watchdog-проверок.",
    metricKey: "outbound_ctr",
    stage: "watchdog",
    destinationTopicKey: "needs_review",
    defaultReasonCode: "weak_metrics",
    thresholdHint: "Обычно используется min value."
  },
  {
    key: "cplpv",
    label: "CPLPV",
    description: "Максимально допустимый guardrail по CPLPV для weak-metrics review.",
    metricKey: "cplpv",
    stage: "watchdog",
    destinationTopicKey: "needs_review",
    defaultReasonCode: "weak_metrics",
    thresholdHint: "Обычно используется max value."
  },
  {
    key: "spend_no_results_creative",
    label: "Spend without results - Creative",
    description: "Порог расхода без результатов на уровне creative.",
    metricKey: "spend",
    stage: "watchdog",
    destinationTopicKey: "needs_review",
    defaultReasonCode: "spend_anomaly",
    thresholdHint: "Используется spend threshold и max results."
  },
  {
    key: "spend_no_results_adset",
    label: "Spend without results - Ad set",
    description: "Порог расхода без результатов на уровне ad set.",
    metricKey: "spend",
    stage: "watchdog",
    destinationTopicKey: "needs_review",
    defaultReasonCode: "spend_anomaly",
    thresholdHint: "Используется spend threshold и max results."
  }
] as const;

export const initialAnalyzerRuleSeedTemplates: readonly AnalyzerRuleSeedTemplate[] = [
  {
    ruleKey: "outbound_ctr",
    metricKey: "outbound_ctr",
    ruleStage: "watchdog",
    scope: "global",
    scopeKey: "global",
    enabled: true,
    severity: "warning",
    destinationTopicKey: "needs_review",
    reasonCode: "weak_metrics",
    minValue: "1.2000",
    maxValue: null,
    spendThreshold: null,
    maxResults: null,
    notes: "Базовый global guardrail по outbound CTR."
  },
  {
    ruleKey: "cplpv",
    metricKey: "cplpv",
    ruleStage: "watchdog",
    scope: "global",
    scopeKey: "global",
    enabled: true,
    severity: "warning",
    destinationTopicKey: "needs_review",
    reasonCode: "weak_metrics",
    minValue: null,
    maxValue: "2.5000",
    spendThreshold: null,
    maxResults: null,
    notes: "Базовый global guardrail по CPLPV."
  },
  {
    ruleKey: "spend_no_results_creative",
    metricKey: "spend",
    ruleStage: "watchdog",
    scope: "global",
    scopeKey: "global",
    enabled: true,
    severity: "warning",
    destinationTopicKey: "needs_review",
    reasonCode: "spend_anomaly",
    minValue: null,
    maxValue: null,
    spendThreshold: "50.0000",
    maxResults: 0,
    notes: "Global порог расхода без результатов на уровне creative."
  },
  {
    ruleKey: "spend_no_results_adset",
    metricKey: "spend",
    ruleStage: "watchdog",
    scope: "global",
    scopeKey: "global",
    enabled: true,
    severity: "warning",
    destinationTopicKey: "needs_review",
    reasonCode: "spend_anomaly",
    minValue: null,
    maxValue: null,
    spendThreshold: "35.0000",
    maxResults: 0,
    notes: "Global порог расхода без результатов на уровне ad set."
  }
] as const;

export const importProcessingPlan: ImportProcessingPlan = {
  source: "csv_upload",
  startsAnalyzer: true,
  persistsAlerts: true,
  maySendTelegram: true
};

export function getAnalyzerRuleDefinition(ruleKey: AnalyzerRuleKey) {
  return analyzerRuleDefinitions.find((definition) => definition.key === ruleKey)!;
}
