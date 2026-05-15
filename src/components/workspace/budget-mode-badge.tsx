import type { BudgetMode } from "@prisma/client";
import { getBudgetModeMeta } from "@/lib/launch-taxonomy";

export function BudgetModeBadge({ mode }: { mode: BudgetMode }) {
  const meta = getBudgetModeMeta(mode);

  if (!meta) {
    return null;
  }

  return <span className={`budget-badge budget-badge--${meta.value}`}>{meta.shortLabel}</span>;
}
