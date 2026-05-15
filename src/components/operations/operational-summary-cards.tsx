import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import type { OperationalStatusCounts, OperationalViewKey } from "@/server/services/operations";

const importStatusLabels: Record<string, string> = {
  RECEIVED: "Получен",
  PARSING: "Парсинг",
  NORMALIZING: "Нормализация",
  ANALYZING: "Analyzer",
  COMPLETED: "Готово",
  FAILED: "Ошибка"
};

export function OperationalSummaryCards({
  currentView,
  statusCounts,
  latestImport
}: {
  currentView: OperationalViewKey;
  statusCounts: OperationalStatusCounts;
  latestImport: {
    id: string;
    sourceFilename: string;
    processingStatus: string;
    receivedAt: Date;
    alertCount: number;
    analyzerResultCount: number;
  } | null;
}) {
  const cards = [
    {
      href: "/queue",
      title: "Queue",
      value: String(statusCounts.queue),
      description: "Очередь креативов к запуску.",
      isActive: currentView === "queue"
    },
    {
      href: "/active",
      title: "Active",
      value: String(statusCounts.active),
      description: "Сейчас в работе.",
      isActive: currentView === "active"
    },
    {
      href: "/scaling",
      title: "Scaling",
      value: String(statusCounts.scaling),
      description: "Текущая фаза масштаба.",
      isActive: currentView === "scaling"
    }
  ];

  return (
    <section className="operational-summary-grid">
      {cards.map((card) => (
        <Link
          className={`summary-link-card ${card.isActive ? "summary-link-card--active" : ""}`}
          href={card.href}
          key={card.href}
        >
          <span className="summary-link-card__label">{card.title}</span>
          <strong className="summary-link-card__value">{card.value}</strong>
          <span className="summary-link-card__description">{card.description}</span>
        </Link>
      ))}

      <article className="summary-link-card">
        <span className="summary-link-card__label">Архив / Stopped</span>
        <strong className="summary-link-card__value">{statusCounts.stopped}</strong>
        <span className="summary-link-card__description">Остановленные креативы остаются в библиотеке.</span>
      </article>

      <Link className="summary-link-card" href={latestImport ? `/imports/${latestImport.id}` : "/imports"}>
        <span className="summary-link-card__label">Последний импорт</span>
        <strong className="summary-link-card__value">
          {latestImport ? importStatusLabels[latestImport.processingStatus] ?? latestImport.processingStatus : "Нет данных"}
        </strong>
        <span className="summary-link-card__description">
          {latestImport
            ? `${latestImport.sourceFilename} · alerts ${latestImport.alertCount} · ${formatDateTime(latestImport.receivedAt)}`
            : "После первой загрузки здесь появится сводка analyzer и alerts."}
        </span>
      </Link>
    </section>
  );
}
