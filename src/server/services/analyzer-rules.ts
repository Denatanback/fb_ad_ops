import {
  AlertSeverity as PrismaAlertSeverity,
  AnalyzerMetricKey as PrismaAnalyzerMetricKey,
  AnalyzerRuleKey as PrismaAnalyzerRuleKey,
  AnalyzerRuleScope as PrismaAnalyzerRuleScope,
  AnalyzerRuleStage as PrismaAnalyzerRuleStage,
  NotificationTopicKey as PrismaNotificationTopicKey
} from "@prisma/client";
import { db } from "@/server/db/client";
import {
  analyzerRuleDefinitions,
  analyzerRuleKeys,
  getAnalyzerRuleDefinition,
  initialAnalyzerRuleSeedTemplates,
  type AnalyzerAlertSeverity,
  type AnalyzerMetricKey,
  type AnalyzerRuleKey,
  type AnalyzerRuleReasonCode,
  type AnalyzerRuleScope,
  type NotificationTopicKey
} from "@/server/analyzer/foundation";

type AnalyzerRuleConfigInput = {
  ruleKey: AnalyzerRuleKey;
  scope: AnalyzerRuleScope;
  approachId?: string | null;
  funnelKey?: string | null;
  enabled: boolean;
  severity: AnalyzerAlertSeverity;
  destinationTopicKey: NotificationTopicKey;
  reasonCode?: AnalyzerRuleReasonCode | null;
  minValue?: string | null;
  maxValue?: string | null;
  spendThreshold?: string | null;
  maxResults?: number | null;
  notes?: string | null;
};

type AnalyzerRuleConfigRecord = Awaited<ReturnType<typeof listAnalyzerRuleConfigs>>[number];

export type AnalyzerRuleConfigView = {
  id: string;
  ruleKey: AnalyzerRuleKey;
  ruleLabel: string;
  ruleDescription: string;
  metricKey: AnalyzerMetricKey;
  scope: AnalyzerRuleScope;
  scopeKey: string;
  approachId: string | null;
  approachName: string | null;
  funnelKey: string | null;
  enabled: boolean;
  severity: AnalyzerAlertSeverity;
  destinationTopicKey: NotificationTopicKey;
  reasonCode: string | null;
  minValue: string | null;
  maxValue: string | null;
  spendThreshold: string | null;
  maxResults: number | null;
  notes: string | null;
  updatedAt: Date;
};

export type EffectiveAnalyzerRule = AnalyzerRuleConfigView & {
  resolvedFromScope: AnalyzerRuleScope;
};

const ruleKeyToDb = {
  outbound_ctr: PrismaAnalyzerRuleKey.OUTBOUND_CTR,
  cplpv: PrismaAnalyzerRuleKey.CPLPV,
  spend_no_results_creative: PrismaAnalyzerRuleKey.SPEND_NO_RESULTS_CREATIVE,
  spend_no_results_adset: PrismaAnalyzerRuleKey.SPEND_NO_RESULTS_ADSET
} satisfies Record<AnalyzerRuleKey, PrismaAnalyzerRuleKey>;

const ruleKeyFromDb = Object.fromEntries(
  Object.entries(ruleKeyToDb).map(([key, value]) => [value, key])
) as Record<PrismaAnalyzerRuleKey, AnalyzerRuleKey>;

const metricKeyToDb = {
  outbound_ctr: PrismaAnalyzerMetricKey.OUTBOUND_CTR,
  cplpv: PrismaAnalyzerMetricKey.CPLPV,
  spend: PrismaAnalyzerMetricKey.SPEND
} satisfies Record<AnalyzerMetricKey, PrismaAnalyzerMetricKey>;

const metricKeyFromDb = Object.fromEntries(
  Object.entries(metricKeyToDb).map(([key, value]) => [value, key])
) as Record<PrismaAnalyzerMetricKey, AnalyzerMetricKey>;

const scopeToDb = {
  global: PrismaAnalyzerRuleScope.GLOBAL,
  approach: PrismaAnalyzerRuleScope.APPROACH,
  funnel: PrismaAnalyzerRuleScope.FUNNEL
} satisfies Record<AnalyzerRuleScope, PrismaAnalyzerRuleScope>;

const scopeFromDb = Object.fromEntries(
  Object.entries(scopeToDb).map(([key, value]) => [value, key])
) as Record<PrismaAnalyzerRuleScope, AnalyzerRuleScope>;

const severityToDb = {
  info: PrismaAlertSeverity.INFO,
  warning: PrismaAlertSeverity.WARNING,
  critical: PrismaAlertSeverity.CRITICAL
} satisfies Record<AnalyzerAlertSeverity, PrismaAlertSeverity>;

const severityFromDb = Object.fromEntries(
  Object.entries(severityToDb).map(([key, value]) => [value, key])
) as Record<PrismaAlertSeverity, AnalyzerAlertSeverity>;

const topicKeyToDb = {
  conversions: PrismaNotificationTopicKey.conversions,
  needs_review: PrismaNotificationTopicKey.needs_review,
  reports: PrismaNotificationTopicKey.strong_signals,
  import_errors_tech: PrismaNotificationTopicKey.import_errors_tech,
  bot_test: PrismaNotificationTopicKey.bot_test
} satisfies Record<NotificationTopicKey, PrismaNotificationTopicKey>;

const topicKeyFromDb = Object.fromEntries(
  Object.entries(topicKeyToDb).map(([key, value]) => [value, key])
) as Record<PrismaNotificationTopicKey, NotificationTopicKey>;

const scopePrecedence: Record<AnalyzerRuleScope, number> = {
  global: 0,
  approach: 1,
  funnel: 2
};

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeDecimalInput(value: string | null | undefined, label: string) {
  const normalized = normalizeNullableText(value)?.replace(",", ".");

  if (!normalized) {
    return null;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`${label} must be a valid decimal number.`);
  }

  return Number(normalized).toFixed(4);
}

function normalizeIntegerInput(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function normalizeFunnelKey(value: string | null | undefined) {
  const normalized = normalizeNullableText(value)?.toLowerCase();
  return normalized ?? null;
}

function buildScopeDescriptor(input: Pick<AnalyzerRuleConfigInput, "scope" | "approachId" | "funnelKey">) {
  switch (input.scope) {
    case "global":
      return {
        scopeKey: "global",
        approachId: null,
        funnelKey: null
      };
    case "approach": {
      const approachId = normalizeNullableText(input.approachId);

      if (!approachId) {
        throw new Error("Approach override requires an approach.");
      }

      return {
        scopeKey: `approach:${approachId}`,
        approachId,
        funnelKey: null
      };
    }
    case "funnel": {
      const funnelKey = normalizeFunnelKey(input.funnelKey);

      if (!funnelKey) {
        throw new Error("Funnel override requires a funnel key.");
      }

      return {
        scopeKey: `funnel:${funnelKey}`,
        approachId: null,
        funnelKey
      };
    }
  }
}

function buildRuleThresholdPatch(input: AnalyzerRuleConfigInput) {
  switch (input.ruleKey) {
    case "outbound_ctr":
    case "cplpv":
      return {
        minValue: normalizeDecimalInput(input.minValue, "Min value"),
        maxValue: normalizeDecimalInput(input.maxValue, "Max value"),
        spendThreshold: null,
        maxResults: null
      };
    case "spend_no_results_creative":
    case "spend_no_results_adset":
      return {
        minValue: null,
        maxValue: null,
        spendThreshold: normalizeDecimalInput(input.spendThreshold, "Spend threshold"),
        maxResults: normalizeIntegerInput(input.maxResults ?? 0, "Max results") ?? 0
      };
  }
}

function sortByRuleAndScope(left: AnalyzerRuleConfigView, right: AnalyzerRuleConfigView) {
  const leftRuleIndex = analyzerRuleKeys.indexOf(left.ruleKey);
  const rightRuleIndex = analyzerRuleKeys.indexOf(right.ruleKey);

  if (leftRuleIndex !== rightRuleIndex) {
    return leftRuleIndex - rightRuleIndex;
  }

  if (left.scope !== right.scope) {
    return scopePrecedence[left.scope] - scopePrecedence[right.scope];
  }

  return left.scopeKey.localeCompare(right.scopeKey);
}

function mapRuleRecord(record: AnalyzerRuleConfigRecord): AnalyzerRuleConfigView {
  const ruleKey = ruleKeyFromDb[record.ruleKey];
  const definition = getAnalyzerRuleDefinition(ruleKey);

  return {
    id: record.id,
    ruleKey,
    ruleLabel: definition.label,
    ruleDescription: definition.description,
    metricKey: metricKeyFromDb[record.metricKey],
    scope: scopeFromDb[record.scope],
    scopeKey: record.scopeKey,
    approachId: record.approachId,
    approachName: record.approach?.name ?? null,
    funnelKey: record.funnelKey,
    enabled: record.enabled,
    severity: severityFromDb[record.severity],
    destinationTopicKey: topicKeyFromDb[record.destinationTopicKey],
    reasonCode: record.reasonCode,
    minValue: record.minValue?.toString() ?? null,
    maxValue: record.maxValue?.toString() ?? null,
    spendThreshold: record.spendThreshold?.toString() ?? null,
    maxResults: record.maxResults,
    notes: record.notes,
    updatedAt: record.updatedAt
  };
}

export async function ensureAnalyzerRuleDefaults() {
  for (const template of initialAnalyzerRuleSeedTemplates) {
    await db.analyzerRuleConfig.upsert({
      where: {
        ruleKey_scopeKey: {
          ruleKey: ruleKeyToDb[template.ruleKey],
          scopeKey: template.scopeKey
        }
      },
      update: {},
      create: {
        ruleKey: ruleKeyToDb[template.ruleKey],
        metricKey: metricKeyToDb[template.metricKey],
        ruleStage: PrismaAnalyzerRuleStage.WATCHDOG,
        scope: PrismaAnalyzerRuleScope.GLOBAL,
        scopeKey: template.scopeKey,
        enabled: template.enabled,
        severity: severityToDb[template.severity],
        destinationTopicKey: topicKeyToDb[template.destinationTopicKey],
        reasonCode: template.reasonCode,
        minValue: template.minValue,
        maxValue: template.maxValue,
        spendThreshold: template.spendThreshold,
        maxResults: template.maxResults,
        notes: template.notes
      }
    });
  }
}

export async function listAnalyzerRuleConfigs() {
  return db.analyzerRuleConfig.findMany({
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}

export async function getAnalyzerRuleAdminData() {
  await ensureAnalyzerRuleDefaults();

  const rules = (await listAnalyzerRuleConfigs()).map(mapRuleRecord).sort(sortByRuleAndScope);

  return {
    globalRules: rules.filter((rule) => rule.scope === "global"),
    approachOverrides: rules.filter((rule) => rule.scope === "approach"),
    funnelOverrides: rules.filter((rule) => rule.scope === "funnel")
  };
}

export async function resolveEffectiveAnalyzerRules(input: {
  approachId?: string | null;
  funnelKey?: string | null;
}) {
  await ensureAnalyzerRuleDefaults();

  const normalizedApproachId = normalizeNullableText(input.approachId);
  const normalizedFunnelKey = normalizeFunnelKey(input.funnelKey);
  const records = await db.analyzerRuleConfig.findMany({
    where: {
      OR: [
        {
          scope: PrismaAnalyzerRuleScope.GLOBAL
        },
        ...(normalizedApproachId
          ? [
              {
                scope: PrismaAnalyzerRuleScope.APPROACH,
                approachId: normalizedApproachId
              }
            ]
          : []),
        ...(normalizedFunnelKey
          ? [
              {
                scope: PrismaAnalyzerRuleScope.FUNNEL,
                funnelKey: normalizedFunnelKey
              }
            ]
          : [])
      ]
    },
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  const normalizedRecords = records.map(mapRuleRecord);

  return analyzerRuleKeys.flatMap((ruleKey) => {
    const candidates = normalizedRecords
      .filter((record) => record.ruleKey === ruleKey)
      .sort((left, right) => {
        const precedenceDelta = scopePrecedence[right.scope] - scopePrecedence[left.scope];

        if (precedenceDelta !== 0) {
          return precedenceDelta;
        }

        return right.updatedAt.getTime() - left.updatedAt.getTime();
      });

    const winner = candidates[0];

    if (!winner) {
      return [];
    }

    return [
      {
        ...winner,
        resolvedFromScope: winner.scope
      } satisfies EffectiveAnalyzerRule
    ];
  });
}

export async function upsertAnalyzerRuleConfig(input: AnalyzerRuleConfigInput) {
  await ensureAnalyzerRuleDefaults();

  const definition = getAnalyzerRuleDefinition(input.ruleKey);
  const scopeDescriptor = buildScopeDescriptor(input);
  const thresholdPatch = buildRuleThresholdPatch(input);

  return db.analyzerRuleConfig.upsert({
    where: {
      ruleKey_scopeKey: {
        ruleKey: ruleKeyToDb[input.ruleKey],
        scopeKey: scopeDescriptor.scopeKey
      }
    },
    update: {
      enabled: input.enabled,
      severity: severityToDb[input.severity],
      destinationTopicKey: topicKeyToDb[input.destinationTopicKey],
      reasonCode: normalizeNullableText(input.reasonCode),
      notes: normalizeNullableText(input.notes),
      ...thresholdPatch
    },
    create: {
      ruleKey: ruleKeyToDb[input.ruleKey],
      metricKey: metricKeyToDb[definition.metricKey],
      ruleStage: PrismaAnalyzerRuleStage.WATCHDOG,
      scope: scopeToDb[input.scope],
      scopeKey: scopeDescriptor.scopeKey,
      approachId: scopeDescriptor.approachId,
      funnelKey: scopeDescriptor.funnelKey,
      enabled: input.enabled,
      severity: severityToDb[input.severity],
      destinationTopicKey: topicKeyToDb[input.destinationTopicKey],
      reasonCode: normalizeNullableText(input.reasonCode),
      notes: normalizeNullableText(input.notes),
      ...thresholdPatch
    },
    include: {
      approach: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
}
