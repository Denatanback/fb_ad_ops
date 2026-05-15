import type { CreativeLabelKey } from "@prisma/client";
import { getCreativeLabelMeta } from "@/lib/creative-taxonomy";

export function LabelChip({ label }: { label: CreativeLabelKey }) {
  const meta = getCreativeLabelMeta(label);

  if (!meta) {
    return null;
  }

  return <span className={`tag tag--${meta.value}`}>{meta.label}</span>;
}
