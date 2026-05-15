import {
  AlertSeverity,
  AnalyzerAlertKind,
  AnalyzerConfidenceLevel,
  AnalyzerEvaluationMode,
  NotificationChannel,
  NotificationDigestStatus,
  NotificationDispatchMode,
  NotificationDeliveryStatus,
  Prisma
} from "@prisma/client";
import type { TelegramTopicKey } from "@/server/notifications/telegram-routing";
import { db } from "@/server/db/client";

type RecordAlertEventInput = {
  importRunId: string;
  comparisonGroupId?: string | null;
  analyzerResultId?: string | null;
  notificationDigestId?: string | null;
  kind: AnalyzerAlertKind;
  severity?: AlertSeverity;
  reasonCode?: string | null;
  dispatchMode?: NotificationDispatchMode;
  evaluationMode?: AnalyzerEvaluationMode | null;
  confidenceLevel?: AnalyzerConfidenceLevel | null;
  maturityReached?: boolean;
  cooldownKey?: string | null;
  destinationTopicKey?: TelegramTopicKey | string | null;
  title: string;
  summary: string;
  alertPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

type RecordNotificationDeliveryInput = {
  alertEventId?: string | null;
  importRunId?: string | null;
  notificationDigestId?: string | null;
  channel?: NotificationChannel;
  deliveryStatus?: NotificationDeliveryStatus;
  destinationTopicKey?: TelegramTopicKey | string | null;
  telegramChatId?: string | null;
  telegramThreadId?: number | null;
  attemptedAt?: Date | null;
  deliveredAt?: Date | null;
  failedAt?: Date | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
  providerPayload?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

type UpsertNotificationDigestInput = {
  digestKey: string;
  destinationTopicKey: TelegramTopicKey | string;
  importRunId?: string | null;
  dispatchMode?: NotificationDispatchMode;
  windowStart: Date;
  windowEnd: Date;
  status?: NotificationDigestStatus;
};

type UpdateNotificationDigestInput = {
  notificationDigestId: string;
  status?: NotificationDigestStatus;
  alertCount?: number;
  importRunCount?: number;
  messageTitle?: string | null;
  messageBody?: string | null;
  builtAt?: Date | null;
  sentAt?: Date | null;
  failedAt?: Date | null;
  retryAfterUntil?: Date | null;
  telegramChatId?: string | null;
  telegramThreadId?: number | null;
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

const alertEventSelect = {
  id: true,
  importRunId: true,
  comparisonGroupId: true,
  analyzerResultId: true,
  notificationDigestId: true,
  kind: true,
  severity: true,
  reasonCode: true,
  evaluationMode: true,
  confidenceLevel: true,
  maturityReached: true,
  destinationTopicKey: true,
  title: true,
  summary: true,
  createdAt: true
} satisfies Prisma.AlertEventSelect;

const notificationDeliverySelect = {
  id: true,
  importRunId: true,
  alertEventId: true,
  notificationDigestId: true,
  channel: true,
  deliveryStatus: true,
  destinationTopicKey: true,
  telegramChatId: true,
  telegramThreadId: true,
  attemptedAt: true,
  deliveredAt: true,
  failedAt: true,
  providerMessageId: true,
  errorMessage: true,
  createdAt: true
} satisfies Prisma.NotificationDeliverySelect;

const notificationDigestSelect = {
  id: true,
  importRunId: true,
  channel: true,
  destinationTopicKey: true,
  dispatchMode: true,
  digestKey: true,
  windowStart: true,
  windowEnd: true,
  status: true,
  alertCount: true,
  importRunCount: true,
  messageTitle: true,
  messageBody: true,
  builtAt: true,
  sentAt: true,
  failedAt: true,
  retryAfterUntil: true,
  telegramChatId: true,
  telegramThreadId: true,
  providerMessageId: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.NotificationDigestSelect;

function normalizeNullableText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export async function recordAlertEvent(input: RecordAlertEventInput) {
  return db.alertEvent.create({
    data: {
      importRunId: input.importRunId,
      comparisonGroupId: input.comparisonGroupId ?? null,
      analyzerResultId: input.analyzerResultId ?? null,
      notificationDigestId: input.notificationDigestId ?? null,
      kind: input.kind,
      severity: input.severity ?? "WARNING",
      reasonCode: normalizeNullableText(input.reasonCode),
      dispatchMode: input.dispatchMode ?? "IMMEDIATE",
      evaluationMode: input.evaluationMode ?? null,
      confidenceLevel: input.confidenceLevel ?? null,
      maturityReached: input.maturityReached ?? false,
      cooldownKey: normalizeNullableText(input.cooldownKey),
      destinationTopicKey: input.destinationTopicKey ?? null,
      title: input.title,
      summary: input.summary,
      alertPayload: input.alertPayload
    },
    select: alertEventSelect
  });
}

export async function recordNotificationDelivery(input: RecordNotificationDeliveryInput) {
  return db.notificationDelivery.create({
    data: {
      importRunId: input.importRunId ?? null,
      alertEventId: input.alertEventId ?? null,
      notificationDigestId: input.notificationDigestId ?? null,
      channel: input.channel ?? "TELEGRAM",
      deliveryStatus: input.deliveryStatus ?? "PENDING",
      destinationTopicKey: input.destinationTopicKey ?? null,
      telegramChatId: normalizeNullableText(input.telegramChatId),
      telegramThreadId: input.telegramThreadId ?? null,
      attemptedAt: input.attemptedAt ?? null,
      deliveredAt: input.deliveredAt ?? null,
      failedAt: input.failedAt ?? null,
      providerMessageId: normalizeNullableText(input.providerMessageId),
      errorMessage: normalizeNullableText(input.errorMessage),
      providerPayload: input.providerPayload
    },
    select: notificationDeliverySelect
  });
}

export async function upsertNotificationDigest(input: UpsertNotificationDigestInput) {
  return db.notificationDigest.upsert({
    where: {
      digestKey: input.digestKey
    },
    create: {
      importRunId: input.importRunId ?? null,
      channel: "TELEGRAM",
      destinationTopicKey: input.destinationTopicKey as any,
      dispatchMode: input.dispatchMode ?? "DIGEST_30M",
      digestKey: input.digestKey,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      status: input.status ?? "QUEUED"
    },
    update: {
      importRunId: input.importRunId ?? undefined,
      status: input.status ?? undefined
    },
    select: notificationDigestSelect
  });
}

export async function updateNotificationDigest(input: UpdateNotificationDigestInput) {
  return db.notificationDigest.update({
    where: {
      id: input.notificationDigestId
    },
    data: {
      status: input.status,
      alertCount: input.alertCount,
      importRunCount: input.importRunCount,
      messageTitle: normalizeNullableText(input.messageTitle),
      messageBody: normalizeNullableText(input.messageBody),
      builtAt: input.builtAt,
      sentAt: input.sentAt,
      failedAt: input.failedAt,
      retryAfterUntil: input.retryAfterUntil,
      telegramChatId: normalizeNullableText(input.telegramChatId),
      telegramThreadId: input.telegramThreadId,
      providerMessageId: normalizeNullableText(input.providerMessageId),
      errorMessage: normalizeNullableText(input.errorMessage)
    },
    select: notificationDigestSelect
  });
}

export async function assignAlertEventToNotificationDigest(alertEventId: string, notificationDigestId: string) {
  return db.alertEvent.update({
    where: {
      id: alertEventId
    },
    data: {
      notificationDigestId,
      dispatchMode: "DIGEST_30M"
    }
  });
}
