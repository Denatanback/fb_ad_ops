import Link from "next/link";
import { ApproachCreateForm } from "@/components/approaches/approach-create-form";
import { ApproachCard } from "@/components/approaches/approach-card";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { listApproaches, getApproachBudgetTotals } from "@/server/services/approaches";

type ApproachesPageProps = {
  searchParams?: {
    created?: string;
    error?: string;
  };
};

export default async function ApproachesPage({ searchParams }: ApproachesPageProps) {
  const [approaches, budgetTotals] = await Promise.all([
    listApproaches(),
    getApproachBudgetTotals()
  ]);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Управление воронками"
        title="Воронки"
        description="Выберите воронку, чтобы открыть блок-схему гипотез."
      />

      {searchParams?.created ? <FlashMessage message="Воронка создана." tone="success" /> : null}
      {searchParams?.error ? <FlashMessage message={searchParams.error} tone="error" /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Воронок</span>
          <strong className="summary-stat__value">{approaches.length}</strong>
          <span className="summary-stat__hint">Всего в системе</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет гипотез</span>
          <strong className="summary-stat__value">${budgetTotals.hypothesesBudget.toFixed(2)}</strong>
          <span className="summary-stat__hint">Сумма по всем гипотезам</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет планов</span>
          <strong className="summary-stat__value">${budgetTotals.launchPlansBudget.toFixed(2)}</strong>
          <span className="summary-stat__hint">Сумма по всем планам запусков</span>
        </article>
      </section>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "24px",
        marginTop: "32px"
      }}>
        {approaches.map(approach => (
          <ApproachCard key={approach.id} approach={approach} />
        ))}

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "140px",
          padding: "24px",
          backgroundColor: "var(--color-bg-subtle)",
          border: "2px dashed var(--color-border-subtle)",
          borderRadius: "12px",
          transition: "all 0.2s ease"
        }}>
          <ApproachCreateForm />
        </div>
      </div>
    </div>
  );
}
