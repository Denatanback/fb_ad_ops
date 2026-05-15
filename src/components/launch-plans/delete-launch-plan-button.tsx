"use client";

import { useTransition } from "react";
import { deleteLaunchPlanAction } from "@/app/(workspace)/launch-plans/actions";

export function DeleteLaunchPlanButton({ planId }: { planId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Удалить план запусков? Это действие необратимо.")) return;
    startTransition(() => deleteLaunchPlanAction(planId));
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="button button--secondary button--compact"
      style={{ color: "#ff4d4f", borderColor: "rgba(255,77,79,0.3)" }}
    >
      {isPending ? "Удаление..." : "Удалить план"}
    </button>
  );
}
