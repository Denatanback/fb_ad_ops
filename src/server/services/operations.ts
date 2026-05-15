import { CreativeLabelKey, LifecycleStatus, Prisma } from "@prisma/client";
import { db } from "@/server/db/client";
import { listRecentImportRuns } from "@/server/services/import-runs";

export type OperationalViewKey = "queue" | "active" | "scaling";
export type OperationalSortValue = "recent" | "name" | "launches" | "latest_launch" | "attention";

export type OperationalViewFilters = {
  query?: string;
  approachId?: string;
  label?: CreativeLabelKey;
  sort?: OperationalSortValue;
};

export type OperationalStatusCounts = {
  queue: number;
  active: number;
  scaling: number;
  stopped: number;
};

const operationalViewStatusMap: Record<OperationalViewKey, LifecycleStatus> = {
  queue: LifecycleStatus.QUEUE,
  active: LifecycleStatus.ACTIVE,
  scaling: LifecycleStatus.SCALING
};

const operationalCreativeSelect = {
  id: true,
  name: true,
  type: true,
  notes: true,
  currentStatus: true,
  updatedAt: true,
  approach: {
    select: {
      id: true,
      name: true
    }
  },
  labelAssignments: {
    orderBy: {
      creativeLabel: {
        name: "asc"
      }
    },
    select: {
      creativeLabel: {
        select: {
          id: true,
          key: true,
          name: true
        }
      }
    }
  },
  launches: {
    take: 2,
    orderBy: [{ launchedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      setupName: true,
      budgetMode: true,
      lifecycleStatus: true,
      launchedAt: true,
      stoppedAt: true,
      createdAt: true,
      lander: {
        select: {
          id: true,
          name: true,
          url: true
        }
      },
      metrics: {
        take: 1,
        orderBy: {
          capturedAt: "desc"
        },
        select: {
          id: true,
          capturedAt: true,
          ctr: true,
          cplpv: true,
          outboundCtr: true,
          clicks: true,
          results: true,
          costPerResult: true
        }
      }
    }
  },
  _count: {
    select: {
      launches: true
    }
  }
} satisfies Prisma.CreativeSelect;

type OperationalCreativeRecord = Prisma.CreativeGetPayload<{
  select: typeof operationalCreativeSelect;
}>;

export type OperationalCreativeRow = {
  id: string;
  name: string;
  type: string | null;
  notes: string | null;
  currentStatus: LifecycleStatus;
  updatedAt: Date;
  approach: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    key: CreativeLabelKey;
    name: string;
  }>;
  launchCount: number;
  latestLaunch: OperationalCreativeRecord["launches"][number] | null;
  previousLaunch: OperationalCreativeRecord["launches"][number] | null;
  latestMetrics: OperationalCreativeRecord["launches"][number]["metrics"][number] | null;
  attentionNeeded: boolean;
  attentionReasons: string[];
};

export type OperationalViewData = {
  creatives: OperationalCreativeRow[];
  statusCounts: OperationalStatusCounts;
  attentionCount: number;
  withLaunchCount: number;
  withMetricsCount: number;
  latestImport: {
    id: string;
    sourceFilename: string;
    processingStatus: string;
    receivedAt: Date;
    alertCount: number;
    analyzerResultCount: number;
  } | null;
};

export function parseOperationalSortValue(value: string | null | undefined) {
  switch (value) {
    case "name":
    case "launches":
    case "latest_launch":
    case "attention":
    case "recent":
      return value;
    default:
      return null;
  }
}

function buildOperationalWhere(filters: OperationalViewFilters, view?: OperationalViewKey): Prisma.CreativeWhereInput {
  const where: Prisma.CreativeWhereInput = {};

  if (filters.query) {
    where.OR = [
      {
        name: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        type: {
          contains: filters.query,
          mode: "insensitive"
        }
      },
      {
        notes: {
          contains: filters.query,
          mode: "insensitive"
        }
      }
    ];
  }

  if (filters.approachId) {
    where.approachId = filters.approachId;
  }

  if (filters.label) {
    where.labelAssignments = {
      some: {
        creativeLabel: {
          key: filters.label
        }
      }
    };
  }

  if (view) {
    where.currentStatus = operationalViewStatusMap[view];
  }

  return where;
}

function getLaunchTimestamp(record: OperationalCreativeRow | OperationalCreativeRecord) {
  const latestLaunch = "latestLaunch" in record ? record.latestLaunch : record.launches[0];
  const dateValue = latestLaunch?.launchedAt ?? latestLaunch?.createdAt ?? null;
  return dateValue ? new Date(dateValue).getTime() : 0;
}

function buildAttentionReasons(record: OperationalCreativeRecord, view: OperationalViewKey) {
  const latestLaunch = record.launches[0] ?? null;
  const latestMetrics = latestLaunch?.metrics[0] ?? null;
  const reasons: string[] = [];

  if (!latestLaunch) {
    reasons.push(view === "queue" ? "Нужно создать первый запуск" : "Нет связанного запуска");
    return reasons;
  }

  if (view !== "queue" && latestLaunch.lifecycleStatus === LifecycleStatus.STOPPED) {
    reasons.push("Последний запуск уже остановлен");
  }

  if ((view === "active" || view === "scaling") && !latestMetrics) {
    reasons.push("Нет свежего среза метрик");
  }

  if (!latestMetrics) {
    return reasons;
  }

  const clicks = latestMetrics.clicks ?? 0;
  const results = latestMetrics.results ?? 0;

  if ((view === "active" || view === "scaling") && results === 0 && clicks >= 30) {
    reasons.push("Есть трафик без результатов");
  }

  if (view === "queue" && record._count.launches === 0) {
    reasons.push("Креатив ещё не был в работе");
  }

  return reasons;
}

function sortOperationalRows(rows: OperationalCreativeRow[], sort: OperationalSortValue) {
  const sorted = [...rows];

  sorted.sort((left, right) => {
    switch (sort) {
      case "name":
        return left.name.localeCompare(right.name, "ru");
      case "launches":
        return right.launchCount - left.launchCount || getLaunchTimestamp(right) - getLaunchTimestamp(left);
      case "latest_launch":
        return getLaunchTimestamp(right) - getLaunchTimestamp(left) || right.updatedAt.getTime() - left.updatedAt.getTime();
      case "attention":
        return Number(right.attentionNeeded) - Number(left.attentionNeeded) || getLaunchTimestamp(right) - getLaunchTimestamp(left);
      case "recent":
      default:
        return right.updatedAt.getTime() - left.updatedAt.getTime();
    }
  });

  return sorted;
}

function createStatusCounts() {
  return {
    queue: 0,
    active: 0,
    scaling: 0,
    stopped: 0
  } satisfies OperationalStatusCounts;
}

export async function getOperationalViewData(view: OperationalViewKey, filters: OperationalViewFilters) {
  const [creatives, groupedStatuses, recentImports] = await Promise.all([
    db.creative.findMany({
      where: buildOperationalWhere(filters, view),
      select: operationalCreativeSelect
    }),
    db.creative.groupBy({
      by: ["currentStatus"],
      where: buildOperationalWhere(filters),
      _count: {
        _all: true
      }
    }),
    listRecentImportRuns(1)
  ]);

  const statusCounts = createStatusCounts();

  for (const group of groupedStatuses) {
    if (group.currentStatus === LifecycleStatus.QUEUE) {
      statusCounts.queue = group._count._all;
    }

    if (group.currentStatus === LifecycleStatus.ACTIVE) {
      statusCounts.active = group._count._all;
    }

    if (group.currentStatus === LifecycleStatus.SCALING) {
      statusCounts.scaling = group._count._all;
    }

    if (group.currentStatus === LifecycleStatus.STOPPED) {
      statusCounts.stopped = group._count._all;
    }
  }

  const mappedRows = creatives.map((creative) => {
    const latestLaunch = creative.launches[0] ?? null;
    const previousLaunch = creative.launches[1] ?? null;
    const latestMetrics = latestLaunch?.metrics[0] ?? null;
    const attentionReasons = buildAttentionReasons(creative, view);

    return {
      id: creative.id,
      name: creative.name,
      type: creative.type,
      notes: creative.notes,
      currentStatus: creative.currentStatus,
      updatedAt: creative.updatedAt,
      approach: creative.approach ?? {
        id: "unassigned",
        name: "Без воронки"
      },
      labels: creative.labelAssignments.map((assignment) => assignment.creativeLabel),
      launchCount: creative._count.launches,
      latestLaunch,
      previousLaunch,
      latestMetrics,
      attentionNeeded: attentionReasons.length > 0,
      attentionReasons
    } satisfies OperationalCreativeRow;
  });

  const sortedRows = sortOperationalRows(mappedRows, filters.sort ?? "recent");
  const latestImport = recentImports[0]
    ? {
        id: recentImports[0].id,
        sourceFilename: recentImports[0].sourceFilename,
        processingStatus: recentImports[0].processingStatus,
        receivedAt: recentImports[0].receivedAt,
        alertCount: recentImports[0]._count.alertEvents,
        analyzerResultCount: recentImports[0]._count.analyzerResults
      }
    : null;

  return {
    creatives: sortedRows,
    statusCounts,
    attentionCount: sortedRows.filter((item) => item.attentionNeeded).length,
    withLaunchCount: sortedRows.filter((item) => item.latestLaunch).length,
    withMetricsCount: sortedRows.filter((item) => item.latestMetrics).length,
    latestImport
  } satisfies OperationalViewData;
}
