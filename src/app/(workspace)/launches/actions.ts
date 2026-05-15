"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { parseBudgetMode, launchMetricFields } from "@/lib/launch-taxonomy";
import { requireAuthSession } from "@/server/auth/session";
import { db } from "@/server/db/client";

function normalizeTextValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseDateValue(value: FormDataEntryValue | null, label: string) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Поле «${label}» содержит некорректную дату.`);
  }

  return parsed;
}

function parseDecimalValue(value: FormDataEntryValue | null, label: string) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new Error(`Поле «${label}» должно быть числом.`);
  }

  return parsed;
}

function parseIntegerValue(value: FormDataEntryValue | null, label: string) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isInteger(parsed)) {
    throw new Error(`Поле «${label}» должно быть целым числом.`);
  }

  return parsed;
}

async function resolveLaunchPayload(formData: FormData) {
  const setupName = normalizeTextValue(formData.get("setupName"));
  const notes = normalizeTextValue(formData.get("notes"));
  const landerId = normalizeTextValue(formData.get("landerId"));
  const lifecycleStatus = parseLifecycleStatus(normalizeTextValue(formData.get("lifecycleStatus")));
  const budgetMode = parseBudgetMode(normalizeTextValue(formData.get("budgetMode")));
  const launchedAt = parseDateValue(formData.get("launchedAt"), "Дата запуска");
  const stoppedAt = parseDateValue(formData.get("stoppedAt"), "Дата остановки");

  if (!setupName) {
    throw new Error("Укажите название setup.");
  }

  if (!lifecycleStatus) {
    throw new Error("Выберите корректный lifecycle-статус.");
  }

  if (!budgetMode) {
    throw new Error("Выберите корректный режим бюджета.");
  }

  if (!launchedAt) {
    throw new Error("Укажите дату запуска.");
  }

  if (stoppedAt && stoppedAt < launchedAt) {
    throw new Error("Дата остановки не может быть раньше даты запуска.");
  }

  if (landerId) {
    const lander = await db.lander.findUnique({
      where: {
        id: landerId
      },
      select: {
        id: true
      }
    });

    if (!lander) {
      throw new Error("Выбранный лендинг не найден.");
    }
  }

  const metricsEntries = await Promise.all(
    launchMetricFields.map(async (field) => {
      const rawValue = formData.get(field.key);
      const parsedValue =
        field.type === "int"
          ? parseIntegerValue(rawValue, field.label)
          : parseDecimalValue(rawValue, field.label);

      return [field.key, parsedValue] as const;
    })
  );

  const metrics = Object.fromEntries(metricsEntries);
  const hasMetrics = Object.values(metrics).some((value) => value !== null);

  return {
    setupName,
    notes,
    landerId,
    lifecycleStatus: lifecycleStatus.dbValue,
    budgetMode: budgetMode.dbValue,
    launchedAt,
    stoppedAt,
    metrics,
    hasMetrics
  };
}

function redirectCreateError(creativeId: string, message: string): never {
  redirect(`/creatives/${creativeId}/launches/new?error=${encodeURIComponent(message)}`);
}

function redirectEditError(launchId: string, message: string): never {
  redirect(`/launches/${launchId}/edit?error=${encodeURIComponent(message)}`);
}

export async function createLaunchAction(creativeId: string, formData: FormData) {
  const session = await requireAuthSession();

  const creative = await db.creative.findUnique({
    where: {
      id: creativeId
    },
    select: {
      id: true
    }
  });

  if (!creative) {
    redirect("/creatives?error=Креатив%20не%20найден");
  }

  let payload: Awaited<ReturnType<typeof resolveLaunchPayload>>;

  try {
    payload = await resolveLaunchPayload(formData);
  } catch (error) {
    redirectCreateError(creativeId, error instanceof Error ? error.message : "Не удалось создать запуск.");
  }

  const launch = await db.launch.create({
    data: {
      creativeId,
      landerId: payload.landerId,
      setupName: payload.setupName,
      budgetMode: payload.budgetMode,
      lifecycleStatus: payload.lifecycleStatus,
      launchedAt: payload.launchedAt,
      stoppedAt: payload.stoppedAt,
      notes: payload.notes,
      createdById: session.user.id,
      updatedById: session.user.id,
      metrics: payload.hasMetrics
        ? {
            create: {
              ...payload.metrics,
              createdById: session.user.id,
              updatedById: session.user.id
            }
          }
        : undefined
    },
    select: {
      id: true
    }
  });

  revalidatePath("/creatives");
  revalidatePath(`/creatives/${creativeId}`);
  revalidatePath(`/launches/${launch.id}`);
  revalidatePath("/landers");
  redirect(`/launches/${launch.id}?created=1`);
}

export async function updateLaunchAction(launchId: string, formData: FormData) {
  const session = await requireAuthSession();
  const existingLaunch = await db.launch.findUnique({
    where: {
      id: launchId
    },
    select: {
      id: true,
      creativeId: true
    }
  });

  if (!existingLaunch) {
    redirect("/creatives?error=Запуск%20не%20найден");
  }

  let payload: Awaited<ReturnType<typeof resolveLaunchPayload>>;

  try {
    payload = await resolveLaunchPayload(formData);
  } catch (error) {
    redirectEditError(launchId, error instanceof Error ? error.message : "Не удалось обновить запуск.");
  }

  await db.$transaction(async (tx) => {
    await tx.launch.update({
      where: {
        id: launchId
      },
      data: {
        landerId: payload.landerId,
        setupName: payload.setupName,
        budgetMode: payload.budgetMode,
        lifecycleStatus: payload.lifecycleStatus,
        launchedAt: payload.launchedAt,
        stoppedAt: payload.stoppedAt,
        notes: payload.notes,
        updatedById: session.user.id
      }
    });

    await tx.launchMetrics.deleteMany({
      where: {
        launchId
      }
    });

    if (payload.hasMetrics) {
      await tx.launchMetrics.create({
        data: {
          launchId,
          ...payload.metrics,
          createdById: session.user.id,
          updatedById: session.user.id
        }
      });
    }
  });

  revalidatePath("/creatives");
  revalidatePath(`/creatives/${existingLaunch.creativeId}`);
  revalidatePath(`/launches/${launchId}`);
  revalidatePath(`/launches/${launchId}/edit`);
  revalidatePath("/landers");
  redirect(`/launches/${launchId}?updated=1`);
}
