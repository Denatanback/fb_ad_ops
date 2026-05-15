import {
  NotificationChannel,
  NotificationDigestStatus,
  NotificationDispatchMode,
  NotificationDeliveryStatus,
  NotificationTopicKey as PrismaNotificationTopicKey,
  Prisma
} from "@prisma/client";
import { db } from "@/server/db/client";
import { TelegramSendError, sendTelegramMessage } from "@/server/notifications/telegram";
import { getTelegramTopicDefinition, mapDbTopicKeyToAppKey, telegramNeedsReviewReasonDefinitions, type TelegramTopicKey } from "@/server/notifications/telegram-routing";
import {
  getTelegramDigestScheduleSettings,
  recordTelegramDigestCycleRun,
  getTelegramActiveTopics,
  type TelegramDigestIntervalMinutes
} from "@/server/services/system-settings";
import {
  assignAlertEventToNotificationDigest,
  recordNotificationDelivery,
  updateNotificationDigest,
  upsertNotificationDigest
} from "@/server/services/alerts";

const DIGEST_TOPIC_KEYS = new Set<TelegramTopicKey>(["conversions", "needs_review"]);

type QueueableAlertEvent = {
  id: string;
  importRunId: string;
  destinationTopicKey: string | null;
  createdAt: Date;
  notificationDigestId: string | null;
};

type DigestAlertRecord = {
  id: string;
  importRunId: string;
  kind: string;
  severity: string;
  reasonCode: string | null;
  title: string;
  summary: string;
  createdAt: Date;
  comparisonGroup: {
    groupLabel: string;
    approach: {
      name: string;
    } | null;
  } | null;
  analyzerResult: {
    subjectLabel: string;
  } | null;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isDigestTopicKey(topicKey: string | null | undefined): topicKey is TelegramTopicKey {
  return Boolean(topicKey && DIGEST_TOPIC_KEYS.has(topicKey as TelegramTopicKey));
}

export function getDispatchModeForTopic(topicKey: string | null | undefined) {
  return isDigestTopicKey(topicKey) ? NotificationDispatchMode.DIGEST_30M : NotificationDispatchMode.IMMEDIATE;
}

function floorDateToDigestWindow(value: Date, digestIntervalMinutes: TelegramDigestIntervalMinutes) {
  const windowDate = new Date(value);
  const minutes = windowDate.getUTCMinutes();
  const flooredMinutes = Math.floor(minutes / digestIntervalMinutes) * digestIntervalMinutes;

  windowDate.setUTCMinutes(flooredMinutes, 0, 0);

  return windowDate;
}

function buildDigestWindow(value: Date, digestIntervalMinutes: TelegramDigestIntervalMinutes) {
  const windowStart = floorDateToDigestWindow(value, digestIntervalMinutes);
  const windowEnd = new Date(windowStart);

  windowEnd.setUTCMinutes(windowEnd.getUTCMinutes() + digestIntervalMinutes);

  return {
    windowStart,
    windowEnd
  };
}

function buildDigestKey(topicKey: TelegramTopicKey, windowStart: Date, digestIntervalMinutes: TelegramDigestIntervalMinutes) {
  return `telegram:${topicKey}:${digestIntervalMinutes}:${windowStart.toISOString()}`;
}

async function syncNotificationDigestCounters(notificationDigestId: string) {
  const [alertCount, importRuns] = await Promise.all([
    db.alertEvent.count({
      where: {
        notificationDigestId
      }
    }),
    db.alertEvent.findMany({
      where: {
        notificationDigestId
      },
      select: {
        importRunId: true
      },
      distinct: ["importRunId"]
    })
  ]);

  return updateNotificationDigest({
    notificationDigestId,
    alertCount,
    importRunCount: importRuns.length
  });
}

export async function enqueueAlertEventsForDigest(
  alertEvents: QueueableAlertEvent[],
  digestIntervalMinutes?: TelegramDigestIntervalMinutes
) {
  const resolvedDigestIntervalMinutes =
    digestIntervalMinutes ?? (await getTelegramDigestScheduleSettings()).digestIntervalMinutes;
  const affectedDigestIds = new Set<string>();
  let queuedAlertsCount = 0;

  for (const alertEvent of alertEvents) {
    if (!isDigestTopicKey(alertEvent.destinationTopicKey) || alertEvent.notificationDigestId) {
      continue;
    }

    const digestWindow = buildDigestWindow(alertEvent.createdAt, resolvedDigestIntervalMinutes);
    const notificationDigest = await upsertNotificationDigest({
      digestKey: buildDigestKey(alertEvent.destinationTopicKey, digestWindow.windowStart, resolvedDigestIntervalMinutes),
      destinationTopicKey: alertEvent.destinationTopicKey,
      windowStart: digestWindow.windowStart,
      windowEnd: digestWindow.windowEnd
    });

    await assignAlertEventToNotificationDigest(alertEvent.id, notificationDigest.id);

    affectedDigestIds.add(notificationDigest.id);
    queuedAlertsCount += 1;
  }

  for (const notificationDigestId of affectedDigestIds) {
    await syncNotificationDigestCounters(notificationDigestId);
  }

  return {
    queuedAlertsCount,
    digestCount: affectedDigestIds.size
  };
}

async function enqueueUngroupedDigestAlerts() {
  const alerts = await db.alertEvent.findMany({
    where: {
      notificationDigestId: null,
      destinationTopicKey: {
        in: [...DIGEST_TOPIC_KEYS]
      }
    },
    select: {
      id: true,
      importRunId: true,
      destinationTopicKey: true,
      createdAt: true,
      notificationDigestId: true
    }
  });

  return enqueueAlertEventsForDigest(alerts);
}

function formatDigestWindowLabel(windowStart: Date, windowEnd: Date) {
  return `${new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(windowStart)} — ${new Intl.DateTimeFormat("ru-RU", {
    timeStyle: "short"
  }).format(windowEnd)}`;
}

function summarizeCountsByLabel(values: Array<string | null | undefined>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = normalizeText(value) ?? "Без группы";
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function buildDigestMessage(input: {
  topicKey: TelegramTopicKey;
  windowStart: Date;
  windowEnd: Date;
  alerts: DigestAlertRecord[];
}) {
  const topic = getTelegramTopicDefinition(input.topicKey);
  const approachLines = summarizeCountsByLabel(
    input.alerts.map((alert) => alert.comparisonGroup?.approach?.name ?? null)
  )
    .slice(0, 5)
    .map(([label, count]) => `• ${label}: ${count}`);
  const reasonLines = summarizeCountsByLabel(
    input.alerts.map((alert) => {
      if (!alert.reasonCode) return null;
      const def = telegramNeedsReviewReasonDefinitions.find((r) => r.code === alert.reasonCode);
      return def ? def.label : alert.reasonCode;
    })
  )
    .filter(([label]) => label !== "Без группы")
    .slice(0, 5)
    .map(([label, count]) => `• ${label}: ${count}`);
  const exampleLines = input.alerts.slice(0, 6).map((alert) => {
    const subjectLabel = alert.analyzerResult?.subjectLabel ?? alert.comparisonGroup?.groupLabel ?? alert.title;
    return `• ${subjectLabel} — ${alert.summary}`;
  });

  return [
    "FB Ads Ops",
    "",
    `${topic.label} · digest`,
    `Период: ${formatDigestWindowLabel(input.windowStart, input.windowEnd)}`,
    `Сигналов: ${input.alerts.length}`,
    "",
    approachLines.length ? "По подходам:" : null,
    ...approachLines,
    reasonLines.length ? "" : null,
    reasonLines.length ? "По причинам:" : null,
    ...reasonLines,
    exampleLines.length ? "" : null,
    exampleLines.length ? "Ключевые примеры:" : null,
    ...exampleLines
  ]
    .filter((value) => value !== null)
    .join("\n");
}

async function claimDigestForProcessing(notificationDigestId: string, now: Date) {
  const result = await db.notificationDigest.updateMany({
    where: {
      id: notificationDigestId,
      sentAt: null,
      OR: [
        { status: NotificationDigestStatus.QUEUED },
        { status: NotificationDigestStatus.BUILT },
        { status: NotificationDigestStatus.FAILED },
        {
          status: NotificationDigestStatus.DEFERRED,
          retryAfterUntil: {
            lte: now
          }
        }
      ]
    },
    data: {
      status: NotificationDigestStatus.BUILT,
      builtAt: now,
      failedAt: null,
      errorMessage: null
    }
  });

  return result.count > 0;
}

async function sendNotificationDigest(notificationDigestId: string, now: Date) {
  const notificationDigest = await db.notificationDigest.findUnique({
    where: {
      id: notificationDigestId
    },
    select: {
      id: true,
      importRunId: true,
      destinationTopicKey: true,
      digestKey: true,
      windowStart: true,
      windowEnd: true,
      status: true,
      alertCount: true,
      importRunCount: true,
      alertEvents: {
        orderBy: {
          createdAt: "asc"
        },
        select: {
          id: true,
          importRunId: true,
          kind: true,
          severity: true,
          reasonCode: true,
          title: true,
          summary: true,
          createdAt: true,
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
          analyzerResult: {
            select: {
              subjectLabel: true
            }
          }
        }
      }
    }
  });

  if (!notificationDigest) {
    return null;
  }

  const topicKey = mapDbTopicKeyToAppKey(notificationDigest.destinationTopicKey);

  const messageBody = buildDigestMessage({
    topicKey,
    windowStart: notificationDigest.windowStart,
    windowEnd: notificationDigest.windowEnd,
    alerts: notificationDigest.alertEvents
  });

  await updateNotificationDigest({
    notificationDigestId,
    messageTitle: `${getTelegramTopicDefinition(topicKey).label} · digest`,
    messageBody,
    builtAt: now,
    errorMessage: null
  });

  try {
    const result = await sendTelegramMessage({
      text: messageBody,
      destination: {
        topic: topicKey
      }
    });

    if (result.skipped) {
      await updateNotificationDigest({
        notificationDigestId,
        status: NotificationDigestStatus.FAILED,
        failedAt: now,
        errorMessage: result.reason
      });

      await recordNotificationDelivery({
        importRunId: null,
        notificationDigestId,
        deliveryStatus: NotificationDeliveryStatus.SKIPPED,
        destinationTopicKey: topicKey,
        attemptedAt: now,
        errorMessage: result.reason
      });

      return {
        sent: 0,
        failed: 0,
        skipped: 1,
        deferred: 0
      };
    }

    await updateNotificationDigest({
      notificationDigestId,
      status: NotificationDigestStatus.SENT,
      sentAt: now,
      telegramChatId: result.chatId,
      telegramThreadId: result.threadId,
      providerMessageId: result.messageId ? String(result.messageId) : null,
      errorMessage: null
    });

    await recordNotificationDelivery({
      importRunId: null,
      notificationDigestId,
      deliveryStatus: NotificationDeliveryStatus.SENT,
      destinationTopicKey: result.topic,
      telegramChatId: result.chatId,
      telegramThreadId: result.threadId,
      attemptedAt: now,
      deliveredAt: now,
      providerMessageId: result.messageId ? String(result.messageId) : null
    });

    return {
      sent: 1,
      failed: 0,
      skipped: 0,
      deferred: 0
    };
  } catch (error) {
    if (error instanceof TelegramSendError && error.retryAfterSeconds) {
      const retryAfterUntil = new Date(now.getTime() + error.retryAfterSeconds * 1000);

      await updateNotificationDigest({
        notificationDigestId,
        status: NotificationDigestStatus.DEFERRED,
        failedAt: now,
        retryAfterUntil,
        errorMessage: error.message
      });

      await recordNotificationDelivery({
        importRunId: null,
        notificationDigestId,
        deliveryStatus: NotificationDeliveryStatus.FAILED,
        destinationTopicKey: topicKey,
        attemptedAt: now,
        failedAt: now,
        errorMessage: error.message,
        providerPayload: {
          retryAfterSeconds: error.retryAfterSeconds,
          statusCode: error.statusCode
        } satisfies Prisma.InputJsonValue
      });

      return {
        sent: 0,
        failed: 0,
        skipped: 0,
        deferred: 1
      };
    }

    await updateNotificationDigest({
      notificationDigestId,
      status: NotificationDigestStatus.FAILED,
      failedAt: now,
      errorMessage: error instanceof Error ? error.message : "Telegram digest delivery failed."
    });

    await recordNotificationDelivery({
      importRunId: null,
      notificationDigestId,
      deliveryStatus: NotificationDeliveryStatus.FAILED,
      destinationTopicKey: topicKey,
      attemptedAt: now,
      failedAt: now,
      errorMessage: error instanceof Error ? error.message : "Telegram digest delivery failed."
    });

    return {
      sent: 0,
      failed: 1,
      skipped: 0,
      deferred: 0
    };
  }
}

export async function runTelegramDigestQueueCycle(
  now = new Date(),
  options: {
    force?: boolean;
  } = {}
) {
  const scheduleSettings = await getTelegramDigestScheduleSettings();
  const queued = await enqueueUngroupedDigestAlerts();
  const shouldDeferByInterval =
    !options.force &&
    scheduleSettings.nextEligibleAt !== null &&
    scheduleSettings.nextEligibleAt.getTime() > now.getTime();

  if (shouldDeferByInterval) {
    return {
      digestIntervalMinutes: scheduleSettings.digestIntervalMinutes,
      queuedAlertsCount: queued.queuedAlertsCount,
      queuedDigestCount: queued.digestCount,
      builtCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      deferredCount: 0,
      cycleSkipped: true,
      nextEligibleAt: scheduleSettings.nextEligibleAt
    };
  }

  const dueDigests = await db.notificationDigest.findMany({
    where: {
      channel: NotificationChannel.TELEGRAM,
      dispatchMode: NotificationDispatchMode.DIGEST_30M,
      destinationTopicKey: {
        in: [...DIGEST_TOPIC_KEYS] as unknown as PrismaNotificationTopicKey[]
      },
      sentAt: null,
      ...(options.force
        ? {}
        : {
            windowEnd: {
              lte: now
            }
          }),
      OR: [
        { status: NotificationDigestStatus.QUEUED },
        { status: NotificationDigestStatus.BUILT },
        { status: NotificationDigestStatus.FAILED },
        {
          status: NotificationDigestStatus.DEFERRED,
          retryAfterUntil: {
            lte: now
          }
        }
      ]
    },
    orderBy: [{ windowStart: "asc" }, { createdAt: "asc" }],
    select: {
      id: true
    }
  });

  let builtCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let deferredCount = 0;

  for (const dueDigest of dueDigests) {
    const claimed = await claimDigestForProcessing(dueDigest.id, now);

    if (!claimed) {
      continue;
    }

    builtCount += 1;

    const result = await sendNotificationDigest(dueDigest.id, now);

    if (!result) {
      continue;
    }

    sentCount += result.sent;
    failedCount += result.failed;
    skippedCount += result.skipped;
    deferredCount += result.deferred;
  }

  if (options.force && builtCount === 0) {
    const activeTopics = await getTelegramActiveTopics();
    const targetTopics = activeTopics ?? [...DIGEST_TOPIC_KEYS];

    for (const topicKey of targetTopics) {
      if (!isDigestTopicKey(topicKey)) continue;

      const lastDigest = await db.notificationDigest.findFirst({
        where: {
          channel: NotificationChannel.TELEGRAM,
          destinationTopicKey: topicKey as PrismaNotificationTopicKey,
          messageBody: { not: null }
        },
        orderBy: { createdAt: "desc" }
      });

      if (lastDigest?.messageBody) {
        try {
          const result = await sendTelegramMessage({
            text: `[ПОВТОР]\n${lastDigest.messageBody}`,
            destination: { topic: mapDbTopicKeyToAppKey(lastDigest.destinationTopicKey) }
          });
          
          if (result.ok) {
            sentCount++;
          } else if (result.skipped) {
            skippedCount++;
          }
        } catch (error) {
          failedCount++;
        }
      }
    }
  }

  await recordTelegramDigestCycleRun(now);

  return {
    digestIntervalMinutes: scheduleSettings.digestIntervalMinutes,
    queuedAlertsCount: queued.queuedAlertsCount,
    queuedDigestCount: queued.digestCount,
    builtCount,
    sentCount,
    failedCount,
    skippedCount,
    deferredCount,
    cycleSkipped: false,
    nextEligibleAt: null
  };
}

export async function listRecentTelegramDigests(limit = 20) {
  return db.notificationDigest.findMany({
    where: {
      channel: NotificationChannel.TELEGRAM
    },
    orderBy: [{ windowStart: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      destinationTopicKey: true,
      dispatchMode: true,
      digestKey: true,
      windowStart: true,
      windowEnd: true,
      status: true,
      alertCount: true,
      importRunCount: true,
      builtAt: true,
      sentAt: true,
      failedAt: true,
      retryAfterUntil: true,
      telegramThreadId: true,
      providerMessageId: true,
      errorMessage: true,
      _count: {
        select: {
          alertEvents: true,
          notificationDeliveries: true
        }
      }
    }
  });
}
