export const telegramTopicDefinitions = [
  {
    key: "conversions",
    label: "Конверсии",
    description: "Сигналы о поступлении результатов и подтверждённых конверсиях.",
    envVar: "TELEGRAM_TOPIC_CONVERSIONS_ID"
  },
  {
    key: "needs_review",
    label: "Нужно проверить",
    description: "Action bucket для случаев, когда запуск или группа требуют ручного просмотра.",
    envVar: "TELEGRAM_TOPIC_NEEDS_REVIEW_ID"
  },
  {
    key: "reports",
    label: "Отчёты",
    description: "Ежедневные сводки: активные кампании, креативы, конверсии и расход.",
    envVar: "TELEGRAM_TOPIC_STRONG_SIGNALS_ID"
  },
  {
    key: "import_errors_tech",
    label: "Ошибки импорта",
    description: "Технические сбои CSV import/analyzer контура.",
    envVar: "TELEGRAM_TOPIC_IMPORT_ERRORS_TECH_ID"
  },
  {
    key: "bot_test",
    label: "Тест бота",
    description: "Служебная тема для проверки доставки и конфигурации Telegram-бота.",
    envVar: "TELEGRAM_TOPIC_BOT_TEST_ID"
  }
] as const;

export const telegramNeedsReviewReasonDefinitions = [
  {
    code: "spend_anomaly",
    label: "Аномалия расхода",
    description: "Слишком быстрый расход или подозрительный pacing."
  },
  {
    code: "weak_metrics",
    label: "Слабые метрики",
    description: "Слабые proxy-метрики после прохождения maturity gates."
  },
  {
    code: "result_weakness",
    label: "Слабость по результатам",
    description: "Результаты есть, но итоговая эффективность слабая."
  },
  {
    code: "mixed_signal",
    label: "Смешанный сигнал",
    description: "Нужен ручной разбор из-за неоднозначного набора сигналов."
  }
] as const;

export type TelegramTopicKey = (typeof telegramTopicDefinitions)[number]["key"];
export type TelegramNeedsReviewReasonCode = (typeof telegramNeedsReviewReasonDefinitions)[number]["code"];

const DB_TOPIC_KEY_TO_APP_KEY: Record<string, TelegramTopicKey> = {
  conversions: "conversions",
  needs_review: "needs_review",
  strong_signals: "reports",
  import_errors_tech: "import_errors_tech",
  bot_test: "bot_test",
  reports: "reports"
};

export function mapDbTopicKeyToAppKey(dbKey: string): TelegramTopicKey {
  return DB_TOPIC_KEY_TO_APP_KEY[dbKey] ?? (dbKey as TelegramTopicKey);
}

export type TelegramNotificationDestination =
  | {
      topic: Exclude<TelegramTopicKey, "needs_review">;
      reasonCode?: never;
    }
  | {
      topic: "needs_review";
      reasonCode?: TelegramNeedsReviewReasonCode;
    };

export function isTelegramTopicKey(value: string): value is TelegramTopicKey {
  return telegramTopicDefinitions.some((topic) => topic.key === value);
}

export function isTelegramNeedsReviewReasonCode(value: string): value is TelegramNeedsReviewReasonCode {
  return telegramNeedsReviewReasonDefinitions.some((reason) => reason.code === value);
}

export function getTelegramTopicDefinition(topicKey: TelegramTopicKey) {
  return telegramTopicDefinitions.find((topic) => topic.key === topicKey)!;
}

export function getTelegramNeedsReviewReasonDefinition(reasonCode: TelegramNeedsReviewReasonCode) {
  return telegramNeedsReviewReasonDefinitions.find((reason) => reason.code === reasonCode)!;
}

export function parseTelegramDestination(
  topicValue: string | null | undefined,
  reasonCodeValue: string | null | undefined
): TelegramNotificationDestination | null {
  if (!topicValue || !isTelegramTopicKey(topicValue)) {
    return null;
  }

  if (topicValue !== "needs_review") {
    return {
      topic: topicValue
    };
  }

  if (!reasonCodeValue || !isTelegramNeedsReviewReasonCode(reasonCodeValue)) {
    return null;
  }

  return {
    topic: "needs_review",
    reasonCode: reasonCodeValue
  };
}
