import type { BudgetMode, LifecycleStatus } from "@prisma/client";
import { db } from "@/server/db/client";
import { requireAuthSession } from "@/server/auth/session";

export type LaunchPlanFilters = {
  query?: string;
  status?: LifecycleStatus;
  approachId?: string;
};

type PlanCreative = {
  id: string;
  name: string;
  approachId: string | null;
  approach: {
    id: string;
    name: string;
  } | null;
};

function normalizeNamingSegment(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildNamingBase(approachName: string, label?: string | null): string {
  const normalizedApproachName = normalizeNamingSegment(approachName) || "Approach";
  const normalizedLabel = label ? normalizeNamingSegment(label) : "";

  if (normalizedLabel) {
    return `${normalizedApproachName}_${normalizedLabel}`;
  }

  return normalizedApproachName;
}

function dedupeCreativeIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function getPlanCapacity(input: {
  campaignsCount: number;
  adsetsCount: number;
  creativesCount: number;
}) {
  return input.campaignsCount * input.adsetsCount * input.creativesCount;
}

function validatePlanStructure(input: {
  budget: number;
  campaignsCount: number;
  adsetsCount: number;
  creativesCount: number;
}) {
  if (input.budget <= 0) {
    throw new Error("Бюджет должен быть больше нуля.");
  }

  if (input.campaignsCount < 1 || input.adsetsCount < 1 || input.creativesCount < 1) {
    throw new Error("Структура плана должна содержать значения больше нуля.");
  }
}

async function resolveApproach(approachId?: string) {
  if (!approachId) {
    return null;
  }

  const approach = await db.approach.findUnique({
    where: { id: approachId },
    select: { id: true, name: true }
  });

  if (!approach) {
    throw new Error("Выбранная воронка не найдена.");
  }

  return approach;
}

async function resolvePlanCreatives(selectedCreativeIds: string[], approachId?: string) {
  const uniqueIds = dedupeCreativeIds(selectedCreativeIds);

  if (!uniqueIds.length) {
    throw new Error("Нужно выбрать хотя бы один креатив.");
  }

  const creatives = await db.creative.findMany({
    where: {
      id: {
        in: uniqueIds
      }
    },
    select: {
      id: true,
      name: true,
      approachId: true,
      approach: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });

  if (creatives.length !== uniqueIds.length) {
    throw new Error("Часть выбранных креативов не найдена.");
  }

  if (approachId) {
    const mismatchedCreative = creatives.find((creative) => creative.approachId !== approachId);

    if (mismatchedCreative) {
      throw new Error("Для одного плана запусков можно выбрать только креативы из выбранной воронки.");
    }
  }

  return uniqueIds
    .map((id) => creatives.find((creative) => creative.id === id))
    .filter((creative): creative is PlanCreative => Boolean(creative));
}

function buildPlanItems(input: {
  approachName: string | null;
  namingLabel?: string | null;
  budgetMode: BudgetMode;
  campaignsCount: number;
  adsetsCount: number;
  creativesCount: number;
  creatives: PlanCreative[];
}) {
  const capacity = getPlanCapacity(input);

  if (input.creatives.length > capacity) {
    throw new Error(`Выбрано ${input.creatives.length} креативов, а структура плана рассчитана только на ${capacity}.`);
  }

  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const budgetModeLabel = input.budgetMode === "CAMPAIGN" ? "CBO" : "ABO";
  const base = buildNamingBase(input.approachName ?? input.creatives[0]?.approach?.name ?? "NoFunnel", input.namingLabel);

  return input.creatives.map((creative, index) => {
    const campaignSpan = input.adsetsCount * input.creativesCount;
    const campaignNumber = Math.floor(index / campaignSpan) + 1;
    const offsetWithinCampaign = index % campaignSpan;
    const adsetNumber = Math.floor(offsetWithinCampaign / input.creativesCount) + 1;
    const creativeNumber = (offsetWithinCampaign % input.creativesCount) + 1;
    const creativeBase = normalizeNamingSegment(creative.name) || `Creative_${index + 1}`;

    return {
      creativeId: creative.id,
      campaignNaming: `${base}_${budgetModeLabel}_${today}_C${campaignNumber}`,
      adsetNaming: `${base}_C${campaignNumber}_A${adsetNumber}`,
      creativeNaming: `${creativeBase}_C${campaignNumber}A${adsetNumber}Cr${creativeNumber}`
    };
  });
}

type UpsertLaunchPlanInput = {
  name: string;
  budgetMode: BudgetMode;
  budget: number;
  campaignsCount: number;
  adsetsCount: number;
  creativesCount: number;
  approachId?: string;
  namingLabel?: string;
  selectedCreativeIds: string[];
};

export async function listLaunchPlans(filters: LaunchPlanFilters) {
  const where: any = {};

  if (filters.query) {
    where.name = {
      contains: filters.query,
      mode: "insensitive"
    };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.approachId) {
    where.approachId = filters.approachId;
  }

  return db.launchPlan.findMany({
    where,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      approach: {
        select: { id: true, name: true }
      },
      items: {
        include: {
          creative: {
            select: {
              id: true,
              name: true,
              approachId: true,
              approach: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      },
      createdBy: {
        select: {
          email: true
        }
      }
    }
  });
}

export async function getLaunchPlanDetails(id: string) {
  return db.launchPlan.findUnique({
    where: { id },
    include: {
      approach: {
        select: { id: true, name: true }
      },
      items: {
        include: {
          creative: {
            select: {
              id: true,
              name: true,
              approachId: true,
              type: true,
              thumbnailUrl: true,
              currentStatus: true,
              approach: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      },
      createdBy: {
        select: {
          name: true,
          email: true
        }
      },
      updatedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
}

export async function deleteLaunchPlan(planId: string) {
  return db.launchPlan.delete({
    where: { id: planId },
    select: { approachId: true }
  });
}

export async function createLaunchPlan(input: UpsertLaunchPlanInput) {
  const session = await requireAuthSession();

  validatePlanStructure(input);

  const [approach, creatives] = await Promise.all([
    resolveApproach(input.approachId),
    resolvePlanCreatives(input.selectedCreativeIds, input.approachId)
  ]);
  const itemsData = buildPlanItems({
    approachName: approach?.name ?? null,
    namingLabel: input.namingLabel,
    budgetMode: input.budgetMode,
    campaignsCount: input.campaignsCount,
    adsetsCount: input.adsetsCount,
    creativesCount: input.creativesCount,
    creatives
  });

  const plan = await db.launchPlan.create({
    data: {
      name: input.name || `План от ${new Date().toISOString().split("T")[0]}`,
      budgetMode: input.budgetMode,
      budget: input.budget,
      campaignsCount: input.campaignsCount,
      adsetsCount: input.adsetsCount,
      creativesCount: input.creativesCount,
      approachId: approach?.id ?? null,
      namingLabel: input.namingLabel || null,
      createdById: session.user.id,
      updatedById: session.user.id,
      items: {
        create: itemsData
      }
    }
  });

  return plan;
}

export async function updateLaunchPlan(
  planId: string,
  input: UpsertLaunchPlanInput & {
    status: LifecycleStatus;
  }
) {
  const session = await requireAuthSession();

  validatePlanStructure(input);

  const existingPlan = await db.launchPlan.findUnique({
    where: { id: planId },
    select: { id: true }
  });

  if (!existingPlan) {
    throw new Error("План запусков не найден.");
  }

  const [approach, creatives] = await Promise.all([
    resolveApproach(input.approachId),
    resolvePlanCreatives(input.selectedCreativeIds, input.approachId)
  ]);
  const itemsData = buildPlanItems({
    approachName: approach?.name ?? null,
    namingLabel: input.namingLabel,
    budgetMode: input.budgetMode,
    campaignsCount: input.campaignsCount,
    adsetsCount: input.adsetsCount,
    creativesCount: input.creativesCount,
    creatives
  });

  return db.$transaction(async (tx) => {
    await tx.launchPlanItem.deleteMany({
      where: {
        launchPlanId: planId
      }
    });

    return tx.launchPlan.update({
      where: {
        id: planId
      },
      data: {
        name: input.name,
        status: input.status,
        budgetMode: input.budgetMode,
        budget: input.budget,
        campaignsCount: input.campaignsCount,
        adsetsCount: input.adsetsCount,
        creativesCount: input.creativesCount,
        approachId: approach?.id ?? null,
        namingLabel: input.namingLabel || null,
        updatedById: session.user.id,
        items: {
          create: itemsData
        }
      }
    });
  });
}
