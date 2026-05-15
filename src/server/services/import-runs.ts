import {
  ImportRunStatus,
  NotificationDeliveryStatus,
  NotificationDigestStatus,
  Prisma,
  type ImportSourceType
} from "@prisma/client";
import { db } from "@/server/db/client";

type CreateImportRunInput = {
  sourceFilename: string;
  sourceType?: ImportSourceType;
  sourceStorageKey?: string | null;
  sourceFileHash?: string | null;
  sourceFormatKey?: string | null;
  sourceContentType?: string | null;
  sourceByteSize?: number | null;
  reportingWindowStart?: Date | null;
  reportingWindowEnd?: Date | null;
  uploadedById?: string | null;
  adAccountId?: string | null;
  adSetFileStorageKey?: string | null;
  adSetFileHash?: string | null;
  campaignFileStorageKey?: string | null;
  campaignFileHash?: string | null;
};

type UpdateImportRunStatusInput = {
  importRunId: string;
  processingStatus: ImportRunStatus;
  errorSummary?: string | null;
  errorDetails?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  rawRowsCount?: number;
  normalizedRowsCount?: number;
};

const importRunSummarySelect = {
  id: true,
  sourceFilename: true,
  sourceType: true,
  sourceStorageKey: true,
  sourceFileHash: true,
  sourceFormatKey: true,
  sourceContentType: true,
  sourceByteSize: true,
  reportingWindowStart: true,
  reportingWindowEnd: true,
  processingStatus: true,
  receivedAt: true,
  processingStartedAt: true,
  processingFinishedAt: true,
  analyzerStartedAt: true,
  analyzerFinishedAt: true,
  rawRowsCount: true,
  normalizedRowsCount: true,
  errorSummary: true,
  errorDetails: true
} satisfies Prisma.ImportRunSelect;

const importRunListSelect = {
  id: true,
  sourceFilename: true,
  sourceType: true,
  sourceStorageKey: true,
  sourceFileHash: true,
  sourceFormatKey: true,
  sourceByteSize: true,
  reportingWindowStart: true,
  reportingWindowEnd: true,
  processingStatus: true,
  receivedAt: true,
  processingStartedAt: true,
  processingFinishedAt: true,
  analyzerStartedAt: true,
  analyzerFinishedAt: true,
  rawRowsCount: true,
  normalizedRowsCount: true,
  errorSummary: true,
  errorDetails: true,
  createdAt: true,
  adAccount: {
    select: {
      id: true,
      tag: true,
      accountId: true
    }
  },
  _count: {
    select: {
      comparisonGroups: true,
      analyzerResults: true,
      alertEvents: true,
      notificationDeliveries: true
    }
  }
} satisfies Prisma.ImportRunSelect;

const importRunDetailsSelect = {
  ...importRunSummarySelect,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      comparisonGroups: true,
      analyzerResults: true,
      alertEvents: true,
      notificationDeliveries: true
    }
  },
  rawRows: {
    where: {
      parseError: {
        not: null
      }
    },
    orderBy: {
      rowNumber: "asc"
    },
    take: 8,
    select: {
      id: true,
      rowNumber: true,
      parseError: true
    }
  },
  normalizedRows: {
    orderBy: {
      sourceRowNumber: "asc"
    },
    take: 8,
    select: {
      id: true,
      sourceRowNumber: true,
      reportDate: true,
      campaignName: true,
      adsetName: true,
      adName: true,
      globalGroupKey: true,
      comparisonGroupKey: true,
      normalizedPayload: true,
      normalizationError: true
    }
  },
  comparisonGroups: {
    orderBy: {
      groupLabel: "asc"
    },
    take: 12,
    select: {
      id: true,
      groupKey: true,
      groupLabel: true,
      globalGroupKey: true,
      rowCount: true,
      resultRowCount: true,
      evaluationMode: true,
      confidenceLevel: true,
      maturityReached: true,
      maturitySummary: true
    }
  },
  analyzerResults: {
    orderBy: [{ rank: "asc" }, { score: "desc" }],
    take: 16,
    select: {
      id: true,
      subjectKey: true,
      subjectLabel: true,
      rank: true,
      score: true,
      evaluationMode: true,
      confidenceLevel: true,
      maturityReached: true,
      resultsPresent: true,
      summary: true,
      resultPayload: true,
      comparisonGroup: {
        select: {
          groupLabel: true
        }
      }
    }
  },
  alertEvents: {
    orderBy: {
      createdAt: "desc"
    },
    take: 16,
    select: {
      id: true,
      kind: true,
      severity: true,
      reasonCode: true,
      evaluationMode: true,
      confidenceLevel: true,
      maturityReached: true,
      destinationTopicKey: true,
      title: true,
      summary: true,
      createdAt: true,
      notificationDeliveries: {
        orderBy: {
          createdAt: "desc"
        },
        take: 3,
        select: {
          id: true,
          deliveryStatus: true,
          destinationTopicKey: true,
          telegramThreadId: true,
          providerMessageId: true,
          errorMessage: true,
          createdAt: true
        }
      }
    }
  },
  notificationDeliveries: {
    orderBy: {
      createdAt: "desc"
    },
    take: 16,
    select: {
      id: true,
      alertEventId: true,
      deliveryStatus: true,
      destinationTopicKey: true,
      telegramChatId: true,
      telegramThreadId: true,
      providerMessageId: true,
      errorMessage: true,
      createdAt: true
    }
  }
} satisfies Prisma.ImportRunSelect;

type ImportRunDetailsRecord = Prisma.ImportRunGetPayload<{
  select: typeof importRunDetailsSelect;
}>;

type TopicCount = {
  topicKey: string | null;
  count: number;
};

type TopicDeliverySummary = {
  topicKey: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
};

type DeliveryIssueSummary = {
  deliveryStatus: NotificationDeliveryStatus;
  errorMessage: string;
  count: number;
};

type DigestRouteSummary = {
  topicKey: string | null;
  digests: number;
  alerts: number;
  sent: number;
  failed: number;
  deferred: number;
  queued: number;
  built: number;
};

type RecentDigestSummary = {
  id: string;
  topicKey: string;
  status: NotificationDigestStatus;
  windowStart: Date;
  windowEnd: Date;
  alertCount: number;
  importAlertCount: number;
  importRunCount: number;
  sentAt: Date | null;
  failedAt: Date | null;
  retryAfterUntil: Date | null;
  telegramThreadId: number | null;
  providerMessageId: string | null;
  errorMessage: string | null;
};

type HistoricalFoundationSummary = {
  completedRunsCount: number;
  previousCompletedRunsCount: number;
  normalizedRowsAcrossCompletedRuns: number;
  normalizedRowsBeforeCurrentRun: number;
  earliestReportDate: Date | null;
  latestReportDate: Date | null;
};

type ImportRunDiagnostics = {
  alertRouteCounts: TopicCount[];
  alertReasonCounts: TopicCount[];
  deliveryStatusCounts: Record<NotificationDeliveryStatus, number>;
  deliveryRouteCounts: TopicDeliverySummary[];
  deliveryIssueCounts: DeliveryIssueSummary[];
  digestStatusCounts: Record<NotificationDigestStatus, number>;
  digestRouteCounts: DigestRouteSummary[];
  recentDigests: RecentDigestSummary[];
  alertsWithoutDeliveryCount: number;
  alertsWithoutSuccessfulDeliveryCount: number;
  alertsWithSuccessfulDeliveryCount: number;
  alertsRoutedToDigestsCount: number;
  alertsDeliveredViaDigestCount: number;
  historicalFoundation: HistoricalFoundationSummary;
};

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function emptyDeliveryStatusCounts(): Record<NotificationDeliveryStatus, number> {
  return {
    PENDING: 0,
    SENT: 0,
    FAILED: 0,
    SKIPPED: 0
  };
}

function emptyDigestStatusCounts(): Record<NotificationDigestStatus, number> {
  return {
    QUEUED: 0,
    BUILT: 0,
    SENT: 0,
    FAILED: 0,
    DEFERRED: 0
  };
}

async function buildImportRunStatusPatch(importRunId: string, processingStatus: ImportRunStatus) {
  const now = new Date();
  const currentImportRun = await db.importRun.findUnique({
    where: {
      id: importRunId
    },
    select: {
      processingStartedAt: true,
      analyzerStartedAt: true
    }
  });

  const processingStartedAt = currentImportRun?.processingStartedAt ?? now;
  const analyzerStartedAt = currentImportRun?.analyzerStartedAt ?? null;

  switch (processingStatus) {
    case ImportRunStatus.PARSING:
    case ImportRunStatus.NORMALIZING:
      return {
        processingStartedAt,
        processingFinishedAt: null,
        analyzerFinishedAt: null
      };
    case ImportRunStatus.ANALYZING:
      return {
        processingStartedAt,
        processingFinishedAt: null,
        analyzerStartedAt: analyzerStartedAt ?? now,
        analyzerFinishedAt: null
      };
    case ImportRunStatus.COMPLETED:
      return {
        processingStartedAt,
        processingFinishedAt: now,
        analyzerFinishedAt: analyzerStartedAt ? now : null
      };
    case ImportRunStatus.FAILED:
      return {
        processingStartedAt,
        processingFinishedAt: now,
        analyzerFinishedAt: analyzerStartedAt ? now : null
      };
    default:
      return {};
  }
}

async function buildImportRunDiagnostics(importRun: Pick<ImportRunDetailsRecord, "id" | "receivedAt">): Promise<ImportRunDiagnostics> {
  const [
    alertRouteGroups,
    alertReasonGroups,
    deliveryStatusGroups,
    deliveryRouteGroups,
    deliveryIssueGroups,
    alertTransportRecords,
    completedRunsCount,
    previousCompletedRunsCount,
    normalizedRowsAcrossCompletedRuns,
    normalizedRowsBeforeCurrentRun,
    reportDateRange
  ] = await Promise.all([
    db.alertEvent.groupBy({
      by: ["destinationTopicKey"],
      where: {
        importRunId: importRun.id
      },
      _count: {
        _all: true
      }
    }),
    db.alertEvent.groupBy({
      by: ["reasonCode"],
      where: {
        importRunId: importRun.id,
        reasonCode: {
          not: null
        }
      },
      _count: {
        _all: true
      }
    }),
    db.notificationDelivery.groupBy({
      by: ["deliveryStatus"],
      where: {
        importRunId: importRun.id
      },
      _count: {
        _all: true
      }
    }),
    db.notificationDelivery.groupBy({
      by: ["destinationTopicKey", "deliveryStatus"],
      where: {
        importRunId: importRun.id
      },
      _count: {
        _all: true
      }
    }),
    db.notificationDelivery.groupBy({
      by: ["deliveryStatus", "errorMessage"],
      where: {
        importRunId: importRun.id,
        deliveryStatus: {
          in: [NotificationDeliveryStatus.FAILED, NotificationDeliveryStatus.SKIPPED]
        },
        errorMessage: {
          not: null
        }
      },
      _count: {
        _all: true
      }
    }),
    db.alertEvent.findMany({
      where: {
        importRunId: importRun.id,
      },
      select: {
        id: true,
        destinationTopicKey: true,
        notificationDeliveries: {
          select: {
            deliveryStatus: true
          }
        },
        notificationDigest: {
          select: {
            id: true,
            destinationTopicKey: true,
            status: true,
            windowStart: true,
            windowEnd: true,
            alertCount: true,
            importRunCount: true,
            sentAt: true,
            failedAt: true,
            retryAfterUntil: true,
            telegramThreadId: true,
            providerMessageId: true,
            errorMessage: true
          }
        }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    }),
    db.importRun.count({
      where: {
        processingStatus: ImportRunStatus.COMPLETED
      }
    }),
    db.importRun.count({
      where: {
        processingStatus: ImportRunStatus.COMPLETED,
        receivedAt: {
          lt: importRun.receivedAt
        }
      }
    }),
    db.importNormalizedRow.count({
      where: {
        importRun: {
          processingStatus: ImportRunStatus.COMPLETED
        }
      }
    }),
    db.importNormalizedRow.count({
      where: {
        importRun: {
          processingStatus: ImportRunStatus.COMPLETED,
          receivedAt: {
            lt: importRun.receivedAt
          }
        }
      }
    }),
    db.importNormalizedRow.aggregate({
      where: {
        importRun: {
          processingStatus: ImportRunStatus.COMPLETED
        }
      },
      _min: {
        reportDate: true
      },
      _max: {
        reportDate: true
      }
    })
  ]);

  const deliveryStatusCounts = emptyDeliveryStatusCounts();

  for (const group of deliveryStatusGroups) {
    deliveryStatusCounts[group.deliveryStatus] = group._count._all;
  }

  const deliveryRouteMap = new Map<string, TopicDeliverySummary>();
  const digestRouteMap = new Map<string, DigestRouteSummary>();
  const digestStatusCounts = emptyDigestStatusCounts();
  const digestById = new Map<string, RecentDigestSummary>();
  const countedDigestIds = new Set<string>();
  let alertsWithoutDeliveryCount = 0;
  let alertsWithoutSuccessfulDeliveryCount = 0;
  let alertsWithSuccessfulDeliveryCount = 0;
  let alertsRoutedToDigestsCount = 0;
  let alertsDeliveredViaDigestCount = 0;

  for (const group of deliveryRouteGroups) {
    const key = group.destinationTopicKey ?? "__no_topic__";
    const current = deliveryRouteMap.get(key) ?? {
      topicKey: group.destinationTopicKey,
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      pending: 0
    };

    current.total += group._count._all;

    if (group.deliveryStatus === NotificationDeliveryStatus.SENT) {
      current.sent += group._count._all;
    }

    if (group.deliveryStatus === NotificationDeliveryStatus.FAILED) {
      current.failed += group._count._all;
    }

    if (group.deliveryStatus === NotificationDeliveryStatus.SKIPPED) {
      current.skipped += group._count._all;
    }

    if (group.deliveryStatus === NotificationDeliveryStatus.PENDING) {
      current.pending += group._count._all;
    }

    deliveryRouteMap.set(key, current);
  }

  for (const alert of alertTransportRecords) {
    const directSent = alert.notificationDeliveries.some(
      (delivery) => delivery.deliveryStatus === NotificationDeliveryStatus.SENT
    );
    const digest = alert.notificationDigest;
    const digestSent = digest?.status === NotificationDigestStatus.SENT;
    const successful = directSent || digestSent;

    if (successful) {
      alertsWithSuccessfulDeliveryCount += 1;
    } else {
      alertsWithoutSuccessfulDeliveryCount += 1;
    }

    if (!alert.notificationDeliveries.length && !digest) {
      alertsWithoutDeliveryCount += 1;
    }

    if (!digest) {
      continue;
    }

    alertsRoutedToDigestsCount += 1;

    if (digestSent) {
      alertsDeliveredViaDigestCount += 1;
    }

    const routeKey = digest.destinationTopicKey ?? alert.destinationTopicKey ?? "__no_topic__";
    const currentRoute = digestRouteMap.get(routeKey) ?? {
      topicKey: digest.destinationTopicKey ?? alert.destinationTopicKey ?? null,
      digests: 0,
      alerts: 0,
      sent: 0,
      failed: 0,
      deferred: 0,
      queued: 0,
      built: 0
    };

    currentRoute.alerts += 1;

    if (!countedDigestIds.has(digest.id)) {
      countedDigestIds.add(digest.id);
      digestStatusCounts[digest.status] += 1;
      currentRoute.digests += 1;

      if (digest.status === NotificationDigestStatus.SENT) {
        currentRoute.sent += 1;
      }

      if (digest.status === NotificationDigestStatus.FAILED) {
        currentRoute.failed += 1;
      }

      if (digest.status === NotificationDigestStatus.DEFERRED) {
        currentRoute.deferred += 1;
      }

      if (digest.status === NotificationDigestStatus.QUEUED) {
        currentRoute.queued += 1;
      }

      if (digest.status === NotificationDigestStatus.BUILT) {
        currentRoute.built += 1;
      }
    }

    digestRouteMap.set(routeKey, currentRoute);

    const existingDigest = digestById.get(digest.id);

    if (existingDigest) {
      existingDigest.importAlertCount += 1;
      continue;
    }

    digestById.set(digest.id, {
      id: digest.id,
      topicKey: digest.destinationTopicKey,
      status: digest.status,
      windowStart: digest.windowStart,
      windowEnd: digest.windowEnd,
      alertCount: digest.alertCount,
      importAlertCount: 1,
      importRunCount: digest.importRunCount,
      sentAt: digest.sentAt,
      failedAt: digest.failedAt,
      retryAfterUntil: digest.retryAfterUntil,
      telegramThreadId: digest.telegramThreadId,
      providerMessageId: digest.providerMessageId,
      errorMessage: digest.errorMessage
    });
  }

  return {
    alertRouteCounts: alertRouteGroups
      .map((group) => ({
        topicKey: group.destinationTopicKey,
        count: group._count._all
      }))
      .sort((left, right) => (left.topicKey ?? "").localeCompare(right.topicKey ?? "")),
    alertReasonCounts: alertReasonGroups
      .map((group) => ({
        topicKey: group.reasonCode,
        count: group._count._all
      }))
      .sort((left, right) => (left.topicKey ?? "").localeCompare(right.topicKey ?? "")),
    deliveryStatusCounts,
    deliveryRouteCounts: [...deliveryRouteMap.values()].sort((left, right) =>
      (left.topicKey ?? "").localeCompare(right.topicKey ?? "")
    ),
    deliveryIssueCounts: deliveryIssueGroups
      .filter((group) => group.errorMessage)
      .map((group) => ({
        deliveryStatus: group.deliveryStatus,
        errorMessage: group.errorMessage ?? "",
        count: group._count._all
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 8),
    digestStatusCounts,
    digestRouteCounts: [...digestRouteMap.values()].sort((left, right) =>
      (left.topicKey ?? "").localeCompare(right.topicKey ?? "")
    ),
    recentDigests: [...digestById.values()]
      .sort((left, right) => right.windowStart.getTime() - left.windowStart.getTime())
      .slice(0, 8),
    alertsWithoutDeliveryCount,
    alertsWithoutSuccessfulDeliveryCount,
    alertsWithSuccessfulDeliveryCount,
    alertsRoutedToDigestsCount,
    alertsDeliveredViaDigestCount,
    historicalFoundation: {
      completedRunsCount,
      previousCompletedRunsCount,
      normalizedRowsAcrossCompletedRuns,
      normalizedRowsBeforeCurrentRun,
      earliestReportDate: reportDateRange._min.reportDate,
      latestReportDate: reportDateRange._max.reportDate
    }
  };
}

export async function createImportRun(input: CreateImportRunInput) {
  return db.importRun.create({
    data: {
      sourceFilename: input.sourceFilename,
      sourceType: input.sourceType ?? "CSV_UPLOAD",
      sourceStorageKey: normalizeNullableText(input.sourceStorageKey),
      sourceFileHash: normalizeNullableText(input.sourceFileHash),
      sourceFormatKey: normalizeNullableText(input.sourceFormatKey),
      sourceContentType: normalizeNullableText(input.sourceContentType),
      sourceByteSize: input.sourceByteSize ?? null,
      reportingWindowStart: input.reportingWindowStart ?? null,
      reportingWindowEnd: input.reportingWindowEnd ?? null,
      uploadedById: input.uploadedById ?? null,
      adAccountId: input.adAccountId ?? null,
      adSetFileStorageKey: normalizeNullableText(input.adSetFileStorageKey),
      adSetFileHash: normalizeNullableText(input.adSetFileHash),
      campaignFileStorageKey: normalizeNullableText(input.campaignFileStorageKey),
      campaignFileHash: normalizeNullableText(input.campaignFileHash)
    },
    select: importRunSummarySelect
  });
}

export async function findImportRunBySourceFileHash(sourceFileHash: string) {
  return db.importRun.findFirst({
    where: { sourceFileHash },
    orderBy: { receivedAt: "desc" },
    select: importRunSummarySelect
  });
}

/**
 * Per-cabinet duplicate check: same adAccountId + same file hash = duplicate upload.
 * When adAccountId is null we fall back to a global hash search (legacy imports).
 */
export async function findImportRunByAdAccountAndFileHash(
  adAccountId: string | null,
  sourceFileHash: string
) {
  return db.importRun.findFirst({
    where: {
      sourceFileHash,
      adAccountId: adAccountId ?? null
    },
    orderBy: { receivedAt: "desc" },
    select: importRunSummarySelect
  });
}

export async function updateImportRunStatus(input: UpdateImportRunStatusInput) {
  const statusPatch = await buildImportRunStatusPatch(input.importRunId, input.processingStatus);

  return db.importRun.update({
    where: {
      id: input.importRunId
    },
    data: {
      processingStatus: input.processingStatus,
      errorSummary: normalizeNullableText(input.errorSummary),
      errorDetails: input.errorDetails,
      rawRowsCount: input.rawRowsCount,
      normalizedRowsCount: input.normalizedRowsCount,
      ...statusPatch
    },
    select: importRunSummarySelect
  });
}

export async function getImportRunSummary(importRunId: string) {
  return db.importRun.findUnique({
    where: {
      id: importRunId
    },
    select: importRunSummarySelect
  });
}

export async function getImportRunDetails(importRunId: string) {
  const importRun = await db.importRun.findUnique({
    where: {
      id: importRunId
    },
    select: importRunDetailsSelect
  });

  if (!importRun) {
    return null;
  }

  const diagnostics = await buildImportRunDiagnostics({
    id: importRun.id,
    receivedAt: importRun.receivedAt
  });

  return {
    ...importRun,
    diagnostics
  };
}

export async function listRecentImportRuns(limit = 12) {
  return db.importRun.findMany({
    orderBy: {
      receivedAt: "desc"
    },
    take: limit,
    select: importRunListSelect
  });
}

type AnalyzerWorkspaceMetrics = {
  spend: number | null;
  results: number | null;
  costPerResult: number | null;
  outboundCtr: number | null;
  cplpv: number | null;
};

type AnalyzerWorkspaceSubject = {
  id: string;
  subjectLabel: string;
  subjectType: string | null;
  approachName: string | null;
  groupLabel: string | null;
  summary: string | null;
  score: number | null;
  rank: number | null;
  verdict: string;
  reason: string;
  metrics: AnalyzerWorkspaceMetrics;
};

type AnalyzerWorkspaceApproachSummary = {
  approachName: string;
  subjectCount: number;
  bestOutboundCtr: {
    subjectLabel: string;
    value: number;
  } | null;
  bestCplpv: {
    subjectLabel: string;
    value: number;
  } | null;
  bestCostPerResult: {
    subjectLabel: string;
    value: number;
  } | null;
};

type AnalyzerWorkspaceSelectedRun = {
  id: string;
  sourceFilename: string;
  processingStatus: ImportRunStatus;
  receivedAt: Date;
  reportingWindowStart: Date | null;
  reportingWindowEnd: Date | null;
  normalizedRowsCount: number;
  analyzerResultsCount: number;
  alertEventsCount: number;
};

export type AnalyzerWorkspaceSnapshot = {
  recentRuns: Awaited<ReturnType<typeof listRecentImportRuns>>;
  selectedRun: AnalyzerWorkspaceSelectedRun | null;
  strongSubjects: AnalyzerWorkspaceSubject[];
  weakSubjects: AnalyzerWorkspaceSubject[];
  approachSummaries: AnalyzerWorkspaceApproachSummary[];
};

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  if (value && typeof value === "object" && "toString" in value) {
    const numericValue = Number(value.toString());
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  return null;
}

function readTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function buildWeakReason(reasonCode: string | null, metrics: AnalyzerWorkspaceMetrics) {
  if (reasonCode === "spend_anomaly") {
    return `Расход ${metrics.spend ?? 0}, результатов ${metrics.results ?? 0}.`;
  }

  if (reasonCode === "result_weakness") {
    return `Цена результата ${metrics.costPerResult ?? 0}, результатов ${metrics.results ?? 0}.`;
  }

  if (reasonCode === "weak_metrics") {
    return `Outbound CTR ${metrics.outboundCtr ?? 0}% и CPLPV ${metrics.cplpv ?? 0}.`;
  }

  if (reasonCode === "mixed_signal") {
    return `Есть расход, но сигналы смешанные: CTR ${metrics.outboundCtr ?? 0}% / CPLPV ${metrics.cplpv ?? 0}.`;
  }

  return `Нужно проверить связку: расход ${metrics.spend ?? 0}, результатов ${metrics.results ?? 0}.`;
}

function extractAnalyzerWorkspaceSubject(result: {
  id: string;
  subjectLabel: string;
  summary: string | null;
  score: Prisma.Decimal | null;
  rank: number | null;
  resultPayload: Prisma.JsonValue | null;
  comparisonGroup: {
    groupLabel: string;
    approach: {
      name: string;
    } | null;
  };
  alertEvents: Array<{
    kind: string;
    reasonCode: string | null;
  }>;
}) {
  const payload = readRecord(result.resultPayload);
  const metricsRecord = readRecord(payload?.metrics);
  const subjectType = readTextValue(payload?.subjectType);
  const approachName = readTextValue(payload?.approachName) ?? result.comparisonGroup.approach?.name ?? null;
  const metrics: AnalyzerWorkspaceMetrics = {
    spend: toFiniteNumber(metricsRecord?.spend),
    results: toFiniteNumber(metricsRecord?.results),
    costPerResult: toFiniteNumber(metricsRecord?.costPerResult),
    outboundCtr: toFiniteNumber(metricsRecord?.outboundCtr),
    cplpv: toFiniteNumber(metricsRecord?.cplpv)
  };
  const positiveAlert = result.alertEvents.find((alertEvent) =>
    ["CONVERSION_ARRIVAL", "OPPORTUNITY_REVIEW"].includes(alertEvent.kind)
  );
  const negativeAlert = result.alertEvents.find((alertEvent) =>
    ["SPEND_PACING_RISK", "WEAK_PERFORMANCE"].includes(alertEvent.kind)
  );
  const score = toFiniteNumber(result.score);

  return {
    id: result.id,
    subjectLabel: result.subjectLabel,
    subjectType,
    approachName,
    groupLabel: result.comparisonGroup.groupLabel,
    summary: result.summary,
    score,
    rank: result.rank,
    verdict: positiveAlert
      ? positiveAlert.kind === "CONVERSION_ARRIVAL"
        ? "Есть результат"
        : "Сильный сигнал"
      : negativeAlert
        ? negativeAlert.kind === "SPEND_PACING_RISK"
          ? "Перерасход"
          : "Слабый сигнал"
        : metrics.results && metrics.results > 0
          ? "Есть результат"
          : score !== null && score >= 0
            ? "Нормально"
            : "Нужно проверить",
    reason: positiveAlert
      ? positiveAlert.kind === "CONVERSION_ARRIVAL"
        ? `Результатов: ${metrics.results ?? 0}, цена результата: ${metrics.costPerResult ?? 0}.`
        : `Outbound CTR ${metrics.outboundCtr ?? 0}% и CPLPV ${metrics.cplpv ?? 0}.`
      : negativeAlert
        ? buildWeakReason(negativeAlert.reasonCode, metrics)
        : metrics.results && metrics.results > 0
          ? `Результатов: ${metrics.results}, цена результата: ${metrics.costPerResult ?? 0}.`
          : `Outbound CTR ${metrics.outboundCtr ?? 0}% и CPLPV ${metrics.cplpv ?? 0}.`,
    metrics
  } satisfies AnalyzerWorkspaceSubject;
}

function buildApproachSummaries(subjects: AnalyzerWorkspaceSubject[]) {
  const groups = new Map<string, AnalyzerWorkspaceSubject[]>();

  for (const subject of subjects) {
    const approachName = subject.approachName ?? "Без подхода";
    const current = groups.get(approachName) ?? [];
    current.push(subject);
    groups.set(approachName, current);
  }

  return [...groups.entries()]
    .map(([approachName, approachSubjects]) => {
      const bestOutboundCtr = [...approachSubjects]
        .filter((subject) => subject.metrics.outboundCtr !== null)
        .sort((left, right) => (right.metrics.outboundCtr ?? 0) - (left.metrics.outboundCtr ?? 0))[0];
      const bestCplpv = [...approachSubjects]
        .filter((subject) => subject.metrics.cplpv !== null)
        .sort((left, right) => (left.metrics.cplpv ?? Number.POSITIVE_INFINITY) - (right.metrics.cplpv ?? Number.POSITIVE_INFINITY))[0];
      const bestCostPerResult = [...approachSubjects]
        .filter((subject) => (subject.metrics.results ?? 0) > 0 && subject.metrics.costPerResult !== null)
        .sort(
          (left, right) =>
            (left.metrics.costPerResult ?? Number.POSITIVE_INFINITY) - (right.metrics.costPerResult ?? Number.POSITIVE_INFINITY)
        )[0];

      return {
        approachName,
        subjectCount: approachSubjects.length,
        bestOutboundCtr: bestOutboundCtr
          ? {
              subjectLabel: bestOutboundCtr.subjectLabel,
              value: bestOutboundCtr.metrics.outboundCtr ?? 0
            }
          : null,
        bestCplpv: bestCplpv
          ? {
              subjectLabel: bestCplpv.subjectLabel,
              value: bestCplpv.metrics.cplpv ?? 0
            }
          : null,
        bestCostPerResult: bestCostPerResult
          ? {
              subjectLabel: bestCostPerResult.subjectLabel,
              value: bestCostPerResult.metrics.costPerResult ?? 0
            }
          : null
      } satisfies AnalyzerWorkspaceApproachSummary;
    })
    .sort((left, right) => left.approachName.localeCompare(right.approachName, "ru"));
}

export async function getAnalyzerWorkspaceSnapshot(selectedImportRunId?: string): Promise<AnalyzerWorkspaceSnapshot> {
  const recentRuns = await listRecentImportRuns(18);
  const defaultRun =
    recentRuns.find((importRun) => importRun.processingStatus === ImportRunStatus.COMPLETED) ?? recentRuns[0] ?? null;
  const selectedRunId = selectedImportRunId?.trim() || defaultRun?.id || null;

  if (!selectedRunId) {
    return {
      recentRuns,
      selectedRun: null,
      strongSubjects: [],
      weakSubjects: [],
      approachSummaries: []
    };
  }

  const selectedRun = await db.importRun.findUnique({
    where: {
      id: selectedRunId
    },
    select: {
      id: true,
      sourceFilename: true,
      processingStatus: true,
      receivedAt: true,
      reportingWindowStart: true,
      reportingWindowEnd: true,
      normalizedRowsCount: true,
      _count: {
        select: {
          analyzerResults: true,
          alertEvents: true
        }
      },
      analyzerResults: {
        orderBy: [{ rank: "asc" }, { score: "desc" }],
        select: {
          id: true,
          subjectLabel: true,
          summary: true,
          score: true,
          rank: true,
          resultPayload: true,
          comparisonGroup: {
            select: {
              groupLabel: true,
              approach: {
                select: {
                  name: true
                }
              }
            }
          },
          alertEvents: {
            select: {
              kind: true,
              reasonCode: true
            }
          }
        }
      }
    }
  });

  if (!selectedRun) {
    return {
      recentRuns,
      selectedRun: null,
      strongSubjects: [],
      weakSubjects: [],
      approachSummaries: []
    };
  }

  const subjects = selectedRun.analyzerResults.map(extractAnalyzerWorkspaceSubject);
  const strongSubjects = [...subjects]
    .filter((subject) => subject.verdict !== "Слабый сигнал" && subject.verdict !== "Перерасход")
    .sort((left, right) => {
      const leftResults = left.metrics.results ?? 0;
      const rightResults = right.metrics.results ?? 0;

      if (rightResults !== leftResults) {
        return rightResults - leftResults;
      }

      return (right.score ?? Number.NEGATIVE_INFINITY) - (left.score ?? Number.NEGATIVE_INFINITY);
    })
    .slice(0, 8);
  const weakSubjects = [...subjects]
    .filter(
      (subject) =>
        subject.verdict === "Слабый сигнал" ||
        subject.verdict === "Перерасход" ||
        (subject.score !== null && subject.score < 0)
    )
    .sort((left, right) => {
      const leftSpend = left.metrics.spend ?? 0;
      const rightSpend = right.metrics.spend ?? 0;

      if (rightSpend !== leftSpend) {
        return rightSpend - leftSpend;
      }

      return (left.score ?? Number.POSITIVE_INFINITY) - (right.score ?? Number.POSITIVE_INFINITY);
    })
    .slice(0, 8);
  const approachSummaries = buildApproachSummaries(subjects);

  return {
    recentRuns,
    selectedRun: {
      id: selectedRun.id,
      sourceFilename: selectedRun.sourceFilename,
      processingStatus: selectedRun.processingStatus,
      receivedAt: selectedRun.receivedAt,
      reportingWindowStart: selectedRun.reportingWindowStart,
      reportingWindowEnd: selectedRun.reportingWindowEnd,
      normalizedRowsCount: selectedRun.normalizedRowsCount,
      analyzerResultsCount: selectedRun._count.analyzerResults,
      alertEventsCount: selectedRun._count.alertEvents
    },
    strongSubjects,
    weakSubjects,
    approachSummaries
  };
}
