import { db } from "@/server/db/client";

export async function listApproaches() {
  return db.approach.findMany({
    orderBy: {
      name: "asc"
    },
    include: {
      creatives: {
        take: 4,
        orderBy: {
          updatedAt: "desc"
        },
        select: {
          id: true,
          name: true,
          currentStatus: true,
          type: true,
          updatedAt: true
        }
      },
      _count: {
        select: {
          creatives: true
        }
      },
      updatedBy: {
        select: {
          email: true
        }
      }
    }
  });
}

export async function listApproachOptions() {
  return db.approach.findMany({
    orderBy: {
      name: "asc"
    },
    select: {
      id: true,
      name: true
    }
  });
}

export async function getApproachSummary() {
  const [count, creativesCount] = await Promise.all([db.approach.count(), db.creative.count()]);

  return {
    count,
    creativesCount
  };
}

export async function getApproachBudgetTotals() {
  const [hypothesesAgg, launchPlansAgg] = await Promise.all([
    db.hypothesis.aggregate({ _sum: { budget: true } }),
    db.launchPlan.aggregate({ _sum: { budget: true } })
  ]);

  return {
    hypothesesBudget: Number(hypothesesAgg._sum.budget ?? 0),
    launchPlansBudget: Number(launchPlansAgg._sum.budget ?? 0)
  };
}

export async function getApproachWithHypotheses(approachId: string) {
  return db.approach.findUnique({
    where: { id: approachId },
    include: {
      hypotheses: {
        orderBy: { createdAt: "asc" }
      },
      creatives: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          currentStatus: true,
          type: true,
          sourceMimeType: true,
          updatedAt: true
        }
      }
    }
  });
}
