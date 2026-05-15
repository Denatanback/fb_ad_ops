import { BudgetMode } from "@prisma/client";

export const budgetModeOptions = [
  {
    value: "adset",
    dbValue: BudgetMode.ADSET,
    label: "Бюджет ad set (ABO)",
    shortLabel: "ABO",
    description: "Бюджет задаётся на уровне ad set."
  },
  {
    value: "campaign",
    dbValue: BudgetMode.CAMPAIGN,
    label: "Бюджет campaign (CBO)",
    shortLabel: "CBO",
    description: "Бюджет задаётся на уровне campaign."
  }
] as const;

export type BudgetModeValue = (typeof budgetModeOptions)[number]["value"];

const budgetModeByValue = new Map(budgetModeOptions.map((item) => [item.value, item]));
const budgetModeByDbValue = new Map(budgetModeOptions.map((item) => [item.dbValue, item]));

export const launchMetricFields = [
  { key: "cpc", label: "CPC", type: "decimal", step: "0.0001" },
  { key: "ctr", label: "CTR", type: "decimal", step: "0.0001" },
  { key: "cplpv", label: "CPLPV", type: "decimal", step: "0.0001" },
  { key: "outboundCtr", label: "Outbound CTR", type: "decimal", step: "0.0001" },
  { key: "cpm", label: "CPM", type: "decimal", step: "0.0001" },
  { key: "clicks", label: "Clicks", type: "int", step: "1" },
  { key: "cr", label: "CR", type: "decimal", step: "0.0001" },
  { key: "results", label: "Results", type: "int", step: "1" },
  { key: "costPerResult", label: "Cost per result", type: "decimal", step: "0.0001" }
] as const;

export type LaunchMetricFieldKey = (typeof launchMetricFields)[number]["key"];

export function parseBudgetMode(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return budgetModeByValue.get(value as BudgetModeValue) ?? null;
}

export function getBudgetModeMeta(value: BudgetMode) {
  return budgetModeByDbValue.get(value);
}
