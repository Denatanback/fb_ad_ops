"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { upsertTargetCostConfig } from "@/server/services/target-costs";
import type { AnalyzerRuleScope } from "@/server/analyzer/foundation";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value ? value : null;
}

function translateTargetCostError(message: string) {
  const translations: Record<string, string> = {
    "Approach override requires an approach.": "Для override по подходу нужно выбрать подход.",
    "Funnel override requires a funnel key.": "Для override по funnel нужно указать funnel key.",
    "Target cost is required.": "Поле target cost обязательно.",
    "Target cost must be a valid decimal number.": "Поле target cost должно содержать корректное число.",
    "Target cost must be greater than zero.": "Target cost должен быть больше нуля."
  };

  return translations[message] ?? message;
}

export async function saveTargetCostConfigAction(formData: FormData) {
  await requireRole("admin");

  const scope = readText(formData, "scope") as AnalyzerRuleScope;

  try {
    await upsertTargetCostConfig({
      scope,
      approachId: readOptionalText(formData, "approachId"),
      funnelKey: readOptionalText(formData, "funnelKey"),
      targetCostUsd: readText(formData, "targetCostUsd"),
      notes: readOptionalText(formData, "notes")
    });

    redirect(`/admin/target-costs?status=saved&scope=${encodeURIComponent(scope)}`);
  } catch (error) {
    const reason = error instanceof Error ? translateTargetCostError(error.message) : "Не удалось сохранить target cost.";
    redirect(`/admin/target-costs?status=error&reason=${encodeURIComponent(reason)}&scope=${encodeURIComponent(scope)}`);
  }
}
