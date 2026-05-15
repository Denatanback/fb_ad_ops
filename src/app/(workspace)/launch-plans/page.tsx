import Link from "next/link";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { listLaunchPlans } from "@/server/services/launch-plans";
import { DeleteLaunchPlanButton } from "@/components/launch-plans/delete-launch-plan-button";

type LaunchPlansPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
  };
};

export default async function LaunchPlansPage({ searchParams }: LaunchPlansPageProps) {
  const status = parseLifecycleStatus(searchParams?.status)?.dbValue;
  const plans = await listLaunchPlans({
    query: searchParams?.q?.trim() || undefined,
    status
  });
  const queueCount = plans.filter((plan) => plan.status === "QUEUE").length;
  const activeCount = plans.filter((plan) => plan.status === "ACTIVE").length;
  const stoppedCount = plans.filter((plan) => plan.status === "STOPPED").length;
  const totalBudget = plans.reduce((sum, p) => sum + Number(p.budget), 0);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Запуски"
        title="План запусков"
        description="Финальный шаг после галереи и воронок: выбираем креативы, задаем структуру и получаем готовые нейминги для Facebook Ads."
      />

      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group" role="tablist">
            <span className="toolbar-chip toolbar-chip--active">Планы</span>
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href="/creatives/gallery">
              Галерея
            </Link>
            <Link className="toolbar-link" href="/approaches">
              Воронки
            </Link>
            <Link className="button button--primary button--compact" href="/launch-plans/new">
              Новый план запусков
            </Link>
          </div>
        </div>
      </section>

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Всего</span>
          <strong className="summary-stat__value">{plans.length}</strong>
          <span className="summary-stat__hint">Планов в системе</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Queue</span>
          <strong className="summary-stat__value">{queueCount}</strong>
          <span className="summary-stat__hint">Ожидают запуска</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Active</span>
          <strong className="summary-stat__value">{activeCount}</strong>
          <span className="summary-stat__hint">Уже в работе</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Stopped</span>
          <strong className="summary-stat__value">{stoppedCount}</strong>
          <span className="summary-stat__hint">Остановлены</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет</span>
          <strong className="summary-stat__value">${totalBudget.toFixed(2)}</strong>
          <span className="summary-stat__hint">Сумма по всем планам</span>
        </article>
      </section>

      <SectionCard title="Список планов запусков" description="У каждого плана есть статус, бюджетный режим, бюджет и структура запуска.">
        {plans.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>План</th>
                  <th>Статус</th>
                  <th>Воронка / метка</th>
                  <th>Бюджет</th>
                  <th>Структура</th>
                  <th>Создан</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => {
                  const budgetModeLabel = plan.budgetMode === "CAMPAIGN" ? "CBO" : "ABO";
                  const structure = `${plan.campaignsCount}-${plan.adsetsCount}-${plan.creativesCount}`;

                  return (
                    <tr key={plan.id}>
                      <td>
                        <div className="table-primary">
                          <Link href={`/launch-plans/${plan.id}`}>
                            <strong>{plan.name}</strong>
                          </Link>
                          <span className="table-subcopy">{plan.items.length} креативов внутри плана</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={plan.status} />
                      </td>
                      <td>
                        <div className="table-primary">
                          <span>{plan.approach?.name ?? "Без воронки"}</span>
                          <span className="table-subcopy">{plan.namingLabel || "Без метки"}</span>
                        </div>
                      </td>
                      <td>${plan.budget.toString()} / {budgetModeLabel}</td>
                      <td>
                        <code>{structure}</code>
                      </td>
                      <td className="table-muted">{formatDateTime(plan.createdAt)}</td>
                      <td className="table-actions">
                        <Link className="button button--secondary button--compact" href={`/launch-plans/${plan.id}`}>
                          Открыть
                        </Link>
                        <DeleteLaunchPlanButton planId={plan.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Планов пока нет</h3>
            <p>После распределения креативов по воронкам можно создать первый план запусков и получить готовые нейминги.</p>
            <div className="hero-actions">
              <Link className="button button--secondary" href="/approaches">
                Открыть воронки
              </Link>
              <Link className="button button--primary" href="/launch-plans/new">
                Новый план
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
