import {
  getTelegramNeedsReviewReasonDefinition,
  getTelegramTopicDefinition,
  telegramTopicDefinitions,
  type TelegramNotificationDestination,
  type TelegramTopicKey
} from "@/server/notifications/telegram-routing";
import { getTelegramActiveTopics } from "@/server/services/system-settings";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

let sendQueueLock = Promise.resolve<unknown>(null);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TelegramSkipReason = "disabled" | "missing_config" | "missing_topic";

type TelegramTopicRouteStatus = {
  key: TelegramTopicKey;
  label: string;
  envVar: string;
  threadId: number | null;
  configured: boolean;
};

type TelegramDestinationResolution =
  | {
      configuration: ReturnType<typeof getTelegramConfiguration>;
      threadId: number;
    }
  | {
      configuration: ReturnType<typeof getTelegramConfiguration>;
      skipReason: Extract<TelegramSkipReason, "missing_config" | "missing_topic">;
    };

export type TelegramSendResult =
  | {
      ok: true;
      skipped: false;
      chatId: string;
      topic: TelegramTopicKey;
      threadId: number;
      messageId: number | null;
    }
  | {
      ok: false;
      skipped: true;
      reason: TelegramSkipReason;
    };

export type TelegramNotifierStatus = {
  enabled: boolean;
  configured: boolean;
  baseConfigured: boolean;
  chatId: string | null;
  topics: TelegramTopicRouteStatus[];
};

export class TelegramSendError extends Error {
  statusCode: number | null;
  retryAfterSeconds: number | null;
  providerPayload: unknown;

  constructor(input: {
    message: string;
    statusCode?: number | null;
    retryAfterSeconds?: number | null;
    providerPayload?: unknown;
  }) {
    super(input.message);
    this.name = "TelegramSendError";
    this.statusCode = input.statusCode ?? null;
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
    this.providerPayload = input.providerPayload ?? null;
  }
}

function parseBooleanEnvironmentFlag(value: string | undefined) {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function parseTelegramThreadId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getTelegramConfiguration() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || "";
  const enabled = parseBooleanEnvironmentFlag(process.env.TELEGRAM_ALERTS_ENABLED?.trim().toLowerCase());
  const topics = Object.fromEntries(
    telegramTopicDefinitions.map((topic) => [topic.key, parseTelegramThreadId(process.env[topic.envVar])])
  ) as Record<TelegramTopicKey, number | null>;

  return {
    enabled,
    botToken,
    chatId,
    topics
  };
}

export function getTelegramNotifierStatus(): TelegramNotifierStatus {
  const configuration = getTelegramConfiguration();
  const baseConfigured = Boolean(configuration.botToken && configuration.chatId);
  const topics = telegramTopicDefinitions.map((topic) => ({
    key: topic.key,
    label: topic.label,
    envVar: topic.envVar,
    threadId: configuration.topics[topic.key],
    configured: configuration.topics[topic.key] !== null
  }));

  return {
    enabled: configuration.enabled,
    configured: baseConfigured && topics.every((topic) => topic.configured),
    baseConfigured,
    chatId: configuration.chatId || null,
    topics
  };
}

function resolveTelegramDestination(destination: TelegramNotificationDestination): TelegramDestinationResolution {
  const configuration = getTelegramConfiguration();

  if (!configuration.botToken || !configuration.chatId) {
    return {
      configuration,
      skipReason: "missing_config"
    };
  }

  const threadId = configuration.topics[destination.topic];

  if (!threadId) {
    return {
      configuration,
      skipReason: "missing_topic"
    };
  }

  return {
    configuration,
    threadId
  };
}

export function buildTelegramTestMessage(actor: string, destination: TelegramNotificationDestination) {
  const topic = getTelegramTopicDefinition(destination.topic);
  const reasonLine =
    destination.topic === "needs_review" && destination.reasonCode
      ? `Код причины: ${destination.reasonCode} (${getTelegramNeedsReviewReasonDefinition(destination.reasonCode).label})`
      : null;

  return [
    "FB Ads Ops",
    "",
    "Проверка Telegram forum-topic уведомлений для внутреннего сервиса.",
    `Инициатор: ${actor}`,
    `Тема: ${topic.label} (${topic.key})`,
    reasonLine,
    `Время: ${new Date().toISOString()}`,
    "",
    "Это тестовый сигнал. CSV analyzer, import records и автоматические alert routes используют тот же notifier."
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendTelegramMessageToThread(input: {
  text: string;
  threadId: number;
}): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const configuration = getTelegramConfiguration();

  if (!configuration.enabled) {
    return { ok: false, skipped: true, reason: "disabled" };
  }

  if (!configuration.botToken || !configuration.chatId) {
    return { ok: false, skipped: true, reason: "missing_config" };
  }

  const operation = async () => {
    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${configuration.botToken}/sendMessage`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: configuration.chatId,
        message_thread_id: input.threadId,
        text: input.text,
        disable_notification: false
      })
    });

    const payload = (await response.json()) as { ok: boolean; description?: string };

    if (!response.ok || !payload.ok) {
      throw new TelegramSendError({
        message: `Ошибка отправки в тред ${input.threadId}.` + (payload.description ? ` ${payload.description}` : ""),
        statusCode: response.status
      });
    }

    await delay(3000);
    return { ok: true };
  };

  try {
    const resultPromise = sendQueueLock.then(operation, operation);
    sendQueueLock = resultPromise.catch(() => {});
    return await resultPromise;
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "send failed" };
  }
}

export async function sendTelegramMessage(input: {
  text: string;
  destination: TelegramNotificationDestination;
}): Promise<TelegramSendResult> {
  const configuration = getTelegramConfiguration();

  if (!configuration.enabled) {
    return {
      ok: false,
      skipped: true,
      reason: "disabled"
    };
  }

  const activeTopics = await getTelegramActiveTopics();
  if (activeTopics !== null && !activeTopics.includes(input.destination.topic)) {
    return {
      ok: false,
      skipped: true,
      reason: "disabled"
    };
  }

  const resolvedDestination = resolveTelegramDestination(input.destination);

  if ("skipReason" in resolvedDestination) {
    return {
      ok: false,
      skipped: true,
      reason: resolvedDestination.skipReason
    };
  }

  const operation = async (): Promise<TelegramSendResult> => {
    let lastError: unknown = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${configuration.botToken}/sendMessage`, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: configuration.chatId,
            message_thread_id: resolvedDestination.threadId,
            text: input.text,
            disable_notification: false
          })
        });

        const payload = (await response.json()) as
          | {
              ok: true;
              result?: { message_id?: number };
              parameters?: { retry_after?: number };
            }
          | {
              ok: false;
              description?: string;
              parameters?: { retry_after?: number };
            };

        if (!response.ok || !payload.ok) {
          throw new TelegramSendError({
            message:
              "Не удалось отправить сообщение в Telegram." +
              (payload && "description" in payload && payload.description ? ` ${payload.description}` : ""),
            statusCode: response.status,
            retryAfterSeconds:
              payload && typeof payload === "object" && "parameters" in payload && payload.parameters?.retry_after
                ? payload.parameters.retry_after
                : null,
            providerPayload: payload
          });
        }

        // Apply mandatory 3-second delay after successful send to prevent 429 errors
        await delay(3000);

        return {
          ok: true,
          skipped: false,
          chatId: configuration.chatId,
          topic: input.destination.topic,
          threadId: resolvedDestination.threadId,
          messageId: payload.result?.message_id ?? null
        };
      } catch (error) {
        lastError = error;
        // Apply 3-second delay before retrying
        await delay(3000);
      }
    }

    throw lastError;
  };

  const resultPromise = sendQueueLock.then(operation, operation) as Promise<TelegramSendResult>;
  sendQueueLock = resultPromise.catch(() => {});

  return resultPromise;
}
