"use client";

import { useTransition } from "react";
import { resetAnalyticalDataAction } from "./actions";

export function ResetDataButton() {
  const [isPending, startTransition] = useTransition();

  function handleReset() {
    if (confirm("ВНИМАНИЕ: Это действие удалит все CSV-файлы и всю статистику (метрики, снэпшоты, логи оповещений). Настройки, пользователи и библиотека креативов не затрагиваются. Вы уверены?")) {
      startTransition(async () => {
        try {
          await resetAnalyticalDataAction();
          alert("Статистика и CSV-файлы успешно очищены.");
        } catch (error) {
          alert("Ошибка при очистке: " + (error instanceof Error ? error.message : "Неизвестная ошибка"));
        }
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      className="button"
      style={{ backgroundColor: "var(--color-status-error, #D32F2F)", color: "white" }}
      disabled={isPending}
    >
      {isPending ? "Очистка..." : "Очистить статистику и CSV"}
    </button>
  );
}
