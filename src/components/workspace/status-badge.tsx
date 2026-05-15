import type { LifecycleStatus } from "@prisma/client";
import { getLifecycleStatusMeta } from "@/lib/creative-taxonomy";

export function StatusBadge({ status }: { status: LifecycleStatus }) {
  const meta = getLifecycleStatusMeta(status);

  if (!meta) {
    return null;
  }

  return <span className={`status-badge status-badge--${meta.value}`}>{meta.label}</span>;
}
