import { AnalyzerRuleScope as PrismaAnalyzerRuleScope, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import type { AnalyzerRuleScope } from "@/server/analyzer/foundation";

type TargetCostConfigInput = {
  scope: AnalyzerRuleScope;
  approachId?: string | null;
  funnelKey?: string | null;
  targetCostUsd: string;
  notes?: string | null;
};

type TargetCostRecord = Awaited<ReturnType<typeof listTargetCostConfigs>>[number];

export type TargetCostConfigView = {
  id: string;
  scope: AnalyzerRuleScope;
  scopeKey: string;
  approachId: string | null;
  approachName: string | null;
  funnelKey: string | null;
  targetCostUsd: string;
  notes: string | null;
  updatedAt: Date;
};

export type EffectiveTargetCost = TargetCostConfigView & {
  resolvedFromScope: AnalyzerRuleScope;
};

const defaultTargetCostTemplate = {
  scope: "global" as const,
  scopeKey: "global",
  targetCostUsd: "60.0000",
  notes: "Базовый target cost по умолчанию для исторических сводок и будущих рекомендаций."
};

const scopeToDb = {
  global: PrismaAnalyzerRuleScope.GLOBAL,
  approach: PrismaAnalyzerRuleScope.APPROACH,
  funnel: PrismaAnalyzerRuleScope.FUNNEL
} satisfies Record<AnalyzerRuleScope, PrismaAnalyzerRuleScope>;

const scopeFromDb = Object.fromEntries(
  Object.entries(scopeToDb).map(([key, value]) => [value, key])
) as Record<PrismaAnalyzerRuleScope, AnalyzerRuleScope>;

const scopePrecedence: Record<AnalyzerRuleScope, number> = {
  global: 0,
  approach: 1,
  funnel: 2
};

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeFunnelKey(value: string | null | undefined) {
  return normalizeNullableText(value)?.toLowerCase() ?? null;
}

function normalizeDecimalInput(value: string | null | undefined) {
  const normalized = normalizeNullableText(value)?.replace(",", ".");

  if (!normalized) {
    throw new Error("Target cost is required.");
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Target cost must be a valid decimal number.");
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Target cost must be greater than zero.");
  }

  return parsed.toFixed(4);
}

function buildScopeDescriptor(input: Pick<TargetCostConfigInput, "scope" | "approachId" | "funnelKey">) {
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

function mapTargetCostRecord(record: TargetCostRecord): TargetCostConfigView {
  return {
    id: record.id,
    scope: scopeFromDb[record.scope],
    scopeKey: record.scopeKey,
    approachId: record.approachId,
    approachName: record.approach?.name ?? null,
    funnelKey: record.funnelKey,
    targetCostUsd: record.targetCostUsd.toString(),
    notes: record.notes,
    updatedAt: record.updatedAt
  };
}

function sortByScope(left: TargetCostConfigView, right: TargetCostConfigView) {
  if (left.scope !== right.scope) {
    return scopePrecedence[left.scope] - scopePrecedence[right.scope];
  }

  return left.scopeKey.localeCompare(right.scopeKey);
}

export async function ensureTargetCostDefaults() {
  await db.targetCostConfig.upsert({
    where: {
      scope_scopeKey: {
        scope: PrismaAnalyzerRuleScope.GLOBAL,
        scopeKey: defaultTargetCostTemplate.scopeKey
      }
    },
    update: {},
    create: {
      scope: PrismaAnalyzerRuleScope.GLOBAL,
      scopeKey: defaultTargetCostTemplate.scopeKey,
      targetCostUsd: defaultTargetCostTemplate.targetCostUsd,
      notes: defaultTargetCostTemplate.notes
    }
  });
}

export async function listTargetCostConfigs() {
  return db.targetCostConfig.findMany({
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

export async function getTargetCostAdminData() {
  await ensureTargetCostDefaults();

  const configs = (await listTargetCostConfigs()).map(mapTargetCostRecord).sort(sortByScope);

  return {
    globalDefaults: configs.filter((config) => config.scope === "global"),
    approachOverrides: configs.filter((config) => config.scope === "approach"),
    funnelOverrides: configs.filter((config) => config.scope === "funnel")
  };
}

export async function resolveEffectiveTargetCost(input: {
  approachId?: string | null;
  funnelKey?: string | null;
}) {
  await ensureTargetCostDefaults();

  const normalizedApproachId = normalizeNullableText(input.approachId);
  const normalizedFunnelKey = normalizeFunnelKey(input.funnelKey);

  const records = await db.targetCostConfig.findMany({
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

  const winner = records
    .map(mapTargetCostRecord)
    .sort((left, right) => {
      const precedenceDelta = scopePrecedence[right.scope] - scopePrecedence[left.scope];

      if (precedenceDelta !== 0) {
        return precedenceDelta;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })[0];

  if (!winner) {
    return null;
  }

  return {
    ...winner,
    resolvedFromScope: winner.scope
  } satisfies EffectiveTargetCost;
}

export async function upsertTargetCostConfig(input: TargetCostConfigInput) {
  await ensureTargetCostDefaults();

  const scopeDescriptor = buildScopeDescriptor(input);

  return db.targetCostConfig.upsert({
    where: {
      scope_scopeKey: {
        scope: scopeToDb[input.scope],
        scopeKey: scopeDescriptor.scopeKey
      }
    },
    update: {
      targetCostUsd: normalizeDecimalInput(input.targetCostUsd),
      notes: normalizeNullableText(input.notes)
    },
    create: {
      scope: scopeToDb[input.scope],
      scopeKey: scopeDescriptor.scopeKey,
      approachId: scopeDescriptor.approachId,
      funnelKey: scopeDescriptor.funnelKey,
      targetCostUsd: normalizeDecimalInput(input.targetCostUsd),
      notes: normalizeNullableText(input.notes)
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

export async function getTargetCostConfigLookup() {
  await ensureTargetCostDefaults();

  const configs = (await listTargetCostConfigs()).map(mapTargetCostRecord);

  return {
    configs,
    resolve(input: {
      approachId?: string | null;
      funnelKey?: string | null;
    }) {
      const normalizedApproachId = normalizeNullableText(input.approachId);
      const normalizedFunnelKey = normalizeFunnelKey(input.funnelKey);

      return (
        configs
          .filter((config) => {
            if (config.scope === "global") {
              return true;
            }

            if (config.scope === "approach") {
              return normalizedApproachId && config.approachId === normalizedApproachId;
            }

            return normalizedFunnelKey && config.funnelKey === normalizedFunnelKey;
          })
          .sort((left, right) => {
            const precedenceDelta = scopePrecedence[right.scope] - scopePrecedence[left.scope];

            if (precedenceDelta !== 0) {
              return precedenceDelta;
            }

            return right.updatedAt.getTime() - left.updatedAt.getTime();
          })[0] ?? null
      );
    }
  };
}
