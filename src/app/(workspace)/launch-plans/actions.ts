"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { parseBudgetMode } from "@/lib/launch-taxonomy";
import { createLaunchPlan, updateLaunchPlan, deleteLaunchPlan } from "@/server/services/launch-plans";
import { requireAuthSession } from "@/server/auth/session";

function parseRequiredInteger(value: string, fieldLabel: string) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${fieldLabel} должно быть целым числом больше нуля.`);
  }

  return parsed;
}

function parseRequiredBudget(value: string) {
  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Бюджет должен быть больше нуля.");
  }

  return parsed;
}

function parseLaunchPlanPayload(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const budgetModeRaw = (formData.get("budgetMode") as string)?.trim();
  const budgetRaw = (formData.get("budget") as string)?.trim();
  const campaignsCountRaw = (formData.get("campaignsCount") as string)?.trim();
  const adsetsCountRaw = (formData.get("adsetsCount") as string)?.trim();
  const creativesCountRaw = (formData.get("creativesCount") as string)?.trim();
  const approachId = ((formData.get("approachId") as string) ?? "").trim() || undefined;
  const namingLabel = ((formData.get("namingLabel") as string) ?? "").trim() || undefined;
  const selectedCreativeIds = formData.getAll("creativeId").map((value) => String(value));

  const budgetMode = parseBudgetMode(budgetModeRaw)?.dbValue;

  if (!budgetMode) {
    throw new Error("Нужно выбрать тип бюджета.");
  }

  return {
    name: name || `План от ${new Date().toISOString().split("T")[0]}`,
    budgetMode,
    budget: parseRequiredBudget(budgetRaw),
    campaignsCount: parseRequiredInteger(campaignsCountRaw, "Количество кампаний"),
    adsetsCount: parseRequiredInteger(adsetsCountRaw, "Количество адсетов"),
    creativesCount: parseRequiredInteger(creativesCountRaw, "Количество креативов в адсете"),
    approachId,
    namingLabel,
    selectedCreativeIds
  };
}

function buildCreateErrorRedirect(formData: FormData, message: string) {
  const params = new URLSearchParams();
  const approachId = ((formData.get("approachId") as string) ?? "").trim();
  const namingLabel = ((formData.get("namingLabel") as string) ?? "").trim();

  params.set("error", message);

  if (approachId) {
    params.set("approachId", approachId);
  }

  if (namingLabel) {
    params.set("namingLabel", namingLabel);
  }

  for (const creativeId of formData.getAll("creativeId")) {
    params.append("creativeId", String(creativeId));
  }

  return `/launch-plans/new?${params.toString()}`;
}

function revalidateLaunchPlanFlow(approachId?: string) {
  revalidatePath("/launch-plans");
  revalidatePath("/creatives/gallery");
  revalidatePath("/approaches");

  if (approachId) {
    revalidatePath(`/approaches/${approachId}`);
  }
}

export async function createLaunchPlanAction(formData: FormData) {
  try {
    const payload = parseLaunchPlanPayload(formData);
    const plan = await createLaunchPlan(payload);

    revalidateLaunchPlanFlow(payload.approachId);
    redirect(`/launch-plans/${plan.id}?created=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать план запусков.";
    redirect(buildCreateErrorRedirect(formData, message));
  }
}

export async function deleteLaunchPlanAction(planId: string) {
  await requireAuthSession();

  const plan = await deleteLaunchPlan(planId);
  revalidateLaunchPlanFlow(plan.approachId ?? undefined);
  redirect("/launch-plans");
}

export async function updateLaunchPlanAction(planId: string, formData: FormData) {
  const statusRaw = (formData.get("status") as string)?.trim();
  const status = parseLifecycleStatus(statusRaw)?.dbValue;

  if (!status) {
    redirect(`/launch-plans/${planId}?error=${encodeURIComponent("Нужно выбрать статус плана.")}`);
  }

  try {
    const payload = parseLaunchPlanPayload(formData);
    await updateLaunchPlan(planId, {
      ...payload,
      status
    });

    revalidateLaunchPlanFlow(payload.approachId);
    revalidatePath(`/launch-plans/${planId}`);
    redirect(`/launch-plans/${planId}?updated=1`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось обновить план запусков.";
    redirect(`/launch-plans/${planId}?error=${encodeURIComponent(message)}`);
  }
}
