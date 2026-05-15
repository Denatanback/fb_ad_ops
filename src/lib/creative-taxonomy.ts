import { CreativeLabelKey, LifecycleStatus } from "@prisma/client";

export const lifecycleStatusOptions = [
  {
    value: "queue",
    dbValue: LifecycleStatus.QUEUE,
    label: "Queue",
    description: "Ожидает следующего рабочего шага."
  },
  {
    value: "active",
    dbValue: LifecycleStatus.ACTIVE,
    label: "Active",
    description: "Находится в активной работе."
  },
  {
    value: "stopped",
    dbValue: LifecycleStatus.STOPPED,
    label: "Stopped",
    description: "Остановлен, но остаётся в библиотеке."
  },
  {
    value: "scaling",
    dbValue: LifecycleStatus.SCALING,
    label: "Scaling",
    description: "Переведён в отдельную фазу масштабирования."
  }
] as const;

export const creativeLabelOptions = [
  {
    value: "winner",
    dbValue: CreativeLabelKey.WINNER,
    label: "Winner",
    description: "Победитель по внутренней оценке."
  },
  {
    value: "loser",
    dbValue: CreativeLabelKey.LOSER,
    label: "Loser",
    description: "Проигрывающий вариант."
  },
  {
    value: "top_ctr",
    dbValue: CreativeLabelKey.TOP_CTR,
    label: "Top CTR",
    description: "Сильный CTR-сигнал без смены lifecycle-статуса."
  }
] as const;

export type LifecycleStatusValue = (typeof lifecycleStatusOptions)[number]["value"];
export type CreativeLabelValue = (typeof creativeLabelOptions)[number]["value"];

const lifecycleStatusOptionMap = new Map(lifecycleStatusOptions.map((item) => [item.value, item]));
const lifecycleStatusDbMap = new Map(lifecycleStatusOptions.map((item) => [item.dbValue, item]));
const creativeLabelOptionMap = new Map(creativeLabelOptions.map((item) => [item.value, item]));
const creativeLabelDbMap = new Map(creativeLabelOptions.map((item) => [item.dbValue, item]));

export function parseLifecycleStatus(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return lifecycleStatusOptionMap.get(value as LifecycleStatusValue) ?? null;
}

export function parseCreativeLabelValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return creativeLabelOptionMap.get(value as CreativeLabelValue) ?? null;
}

export function parseCreativeLabelValues(values: string[]) {
  const seen = new Set<CreativeLabelKey>();

  for (const value of values) {
    const option = parseCreativeLabelValue(value);

    if (option) {
      seen.add(option.dbValue);
    }
  }

  return Array.from(seen);
}

export function getLifecycleStatusMeta(value: LifecycleStatus) {
  return lifecycleStatusDbMap.get(value);
}

export function getCreativeLabelMeta(value: CreativeLabelKey) {
  return creativeLabelDbMap.get(value);
}
