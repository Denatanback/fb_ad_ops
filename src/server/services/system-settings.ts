import { db } from "@/server/db/client";

const TELEGRAM_DIGEST_INTERVAL_KEY = "telegram_digest_interval_minutes";
const TELEGRAM_DIGEST_LAST_CYCLE_AT_KEY = "telegram_digest_last_cycle_at";
const TELEGRAM_ACTIVE_TOPICS_KEY = "telegram_active_topics";
const ALLOWED_TELEGRAM_DIGEST_INTERVALS = [15, 30, 45, 60] as const;
const DEFAULT_TELEGRAM_DIGEST_INTERVAL_MINUTES = 30;

export type TelegramDigestIntervalMinutes = (typeof ALLOWED_TELEGRAM_DIGEST_INTERVALS)[number];

function parseTelegramDigestInterval(value: string | null | undefined): TelegramDigestIntervalMinutes {
  const numericValue = Number(value ?? "");

  if (ALLOWED_TELEGRAM_DIGEST_INTERVALS.includes(numericValue as TelegramDigestIntervalMinutes)) {
    return numericValue as TelegramDigestIntervalMinutes;
  }

  return DEFAULT_TELEGRAM_DIGEST_INTERVAL_MINUTES;
}

function parseStoredDate(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getAllowedTelegramDigestIntervals() {
  return [...ALLOWED_TELEGRAM_DIGEST_INTERVALS];
}

export async function getTelegramDigestScheduleSettings() {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: [TELEGRAM_DIGEST_INTERVAL_KEY, TELEGRAM_DIGEST_LAST_CYCLE_AT_KEY]
      }
    },
    select: {
      key: true,
      value: true
    }
  });

  const values = new Map(settings.map((setting) => [setting.key, setting.value]));
  const digestIntervalMinutes = parseTelegramDigestInterval(values.get(TELEGRAM_DIGEST_INTERVAL_KEY));
  const lastCycleAt = parseStoredDate(values.get(TELEGRAM_DIGEST_LAST_CYCLE_AT_KEY));
  const nextEligibleAt = lastCycleAt ? new Date(lastCycleAt.getTime() + digestIntervalMinutes * 60 * 1000) : null;

  return {
    digestIntervalMinutes,
    lastCycleAt,
    nextEligibleAt
  };
}

export async function updateTelegramDigestIntervalMinutes(
  digestIntervalMinutes: TelegramDigestIntervalMinutes,
  updatedById?: string | null
) {
  return db.systemSetting.upsert({
    where: {
      key: TELEGRAM_DIGEST_INTERVAL_KEY
    },
    update: {
      value: String(digestIntervalMinutes),
      updatedById: updatedById ?? null
    },
    create: {
      key: TELEGRAM_DIGEST_INTERVAL_KEY,
      value: String(digestIntervalMinutes),
      updatedById: updatedById ?? null
    }
  });
}

export async function recordTelegramDigestCycleRun(at: Date) {
  return db.systemSetting.upsert({
    where: {
      key: TELEGRAM_DIGEST_LAST_CYCLE_AT_KEY
    },
    update: {
      value: at.toISOString()
    },
    create: {
      key: TELEGRAM_DIGEST_LAST_CYCLE_AT_KEY,
      value: at.toISOString()
    }
  });
}

export async function getTelegramActiveTopics() {
  const setting = await db.systemSetting.findUnique({
    where: {
      key: TELEGRAM_ACTIVE_TOPICS_KEY
    }
  });

  if (!setting || !setting.value) {
    return null; // Null means "all defined topics are implicitly active"
  }

  try {
    const parsed = JSON.parse(setting.value);
    return Array.isArray(parsed) ? (parsed as string[]) : null;
  } catch {
    return null;
  }
}

export async function updateTelegramActiveTopics(topics: string[], updatedById?: string | null) {
  return db.systemSetting.upsert({
    where: {
      key: TELEGRAM_ACTIVE_TOPICS_KEY
    },
    update: {
      value: JSON.stringify(topics),
      updatedById: updatedById ?? null
    },
    create: {
      key: TELEGRAM_ACTIVE_TOPICS_KEY,
      value: JSON.stringify(topics),
      updatedById: updatedById ?? null
    }
  });
}
