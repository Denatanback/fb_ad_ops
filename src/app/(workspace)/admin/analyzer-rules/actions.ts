"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { upsertAnalyzerRuleConfig } from "@/server/services/analyzer-rules";
import type {
  AnalyzerAlertSeverity,
  AnalyzerRuleKey,
  AnalyzerRuleReasonCode,
  AnalyzerRuleScope,
  NotificationTopicKey
} from "@/server/analyzer/foundation";

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalText(formData: FormData, key: string) {
  const value = readText(formData, key);
  return value ? value : null;
}

function readOptionalInteger(formData: FormData, key: string) {
  const value = readText(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function translateAnalyzerRuleError(message: string) {
  const translations: Record<string, string> = {
    "Approach override requires an approach.": "Для override по подходу нужно выбрать подход.",
    "Funnel override requires a funnel key.": "Для override по funnel нужно указать funnel key.",
    "Min value must be a valid decimal number.": "Поле «Минимум» должно содержать корректное число.",
    "Max value must be a valid decimal number.": "Поле «Максимум» должно содержать корректное число.",
    "Spend threshold must be a valid decimal number.": "Поле «Порог расхода» должно содержать корректное число.",
    "Max results must be a non-negative integer.": "Поле «Макс. результатов» должно быть неотрицательным целым числом."
  };

  return translations[message] ?? message;
}

export async function saveAnalyzerRuleConfigAction(formData: FormData) {
  await requireRole("admin");

  const scope = readText(formData, "scope") as AnalyzerRuleScope;
  const ruleKey = readText(formData, "ruleKey") as AnalyzerRuleKey;

  try {
    await upsertAnalyzerRuleConfig({
      ruleKey,
      scope,
      approachId: readOptionalText(formData, "approachId"),
      funnelKey: readOptionalText(formData, "funnelKey"),
      enabled: formData.get("enabled") === "on",
      severity: readText(formData, "severity") as AnalyzerAlertSeverity,
      destinationTopicKey: readText(formData, "destinationTopicKey") as NotificationTopicKey,
      reasonCode: readOptionalText(formData, "reasonCode") as AnalyzerRuleReasonCode | null,
      minValue: readOptionalText(formData, "minValue"),
      maxValue: readOptionalText(formData, "maxValue"),
      spendThreshold: readOptionalText(formData, "spendThreshold"),
      maxResults: readOptionalInteger(formData, "maxResults"),
      notes: readOptionalText(formData, "notes")
    });

    redirect(`/admin/analyzer-rules?status=saved&scope=${encodeURIComponent(scope)}&ruleKey=${encodeURIComponent(ruleKey)}`);
  } catch (error) {
    const reason = error instanceof Error ? translateAnalyzerRuleError(error.message) : "Не удалось сохранить правило.";
    redirect(
      `/admin/analyzer-rules?status=error&reason=${encodeURIComponent(reason)}&scope=${encodeURIComponent(scope)}&ruleKey=${encodeURIComponent(ruleKey)}`
    );
  }
}
