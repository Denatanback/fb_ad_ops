import Link from "next/link";
import { notFound } from "next/navigation";
import { LaunchPlanForm } from "@/components/launch-plans/launch-plan-form";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { getBudgetModeMeta } from "@/lib/launch-taxonomy";
import { getLifecycleStatusMeta } from "@/lib/creative-taxonomy";
import { listApproachOptions } from "@/server/services/approaches";
import { listCreativesForGallery } from "@/server/services/creatives";
import { getLaunchPlanDetails } from "@/server/services/launch-plans";
import { updateLaunchPlanAction } from "../actions";
import { DeleteLaunchPlanButton } from "@/components/launch-plans/delete-launch-plan-button";

type LaunchPlanDetailsPageProps = {
  params: {
    planId: string;
  };
  searchParams?: {
    created?: string;
    updated?: string;
    error?: string;
  };
};

export default async function LaunchPlanDetailsPage({ params, searchParams }: LaunchPlanDetailsPageProps) {
  const [plan, approaches, creatives] = await Promise.all([
    getLaunchPlanDetails(params.planId),
    listApproachOptions(),
    listCreativesForGallery({})
  ]);

  if (!plan) {
    notFound();
  }

  const action = updateLaunchPlanAction.bind(null, plan.id);
  const budgetModeMeta = getBudgetModeMeta(plan.budgetMode);
  const statusMeta = getLifecycleStatusMeta(plan.status);
  const structure = `${plan.campaignsCount}-${plan.adsetsCount}-${plan.creativesCount}`;
  const uniqueCampaignNamings = [...new Set(plan.items.map((item) => item.campaignNaming))];

  return (
    <div className="content-frame">
      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group">
            <Link className="toolbar-link" href="/launch-plans">
              К планам запусков
            </Link>
            {plan.approach ? (
              <Link className="toolbar-link" href={`/approaches/${plan.approach.id}`}>
                К воронке
              </Link>
            ) : null}
          </div>
          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <DeleteLaunchPlanButton planId={plan.id} />
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="План запусков"
        title={plan.name}
        description="Здесь можно скорректировать бюджет, структуру, статус и состав креативов, а затем сразу увидеть итоговые нейминги."
      />

      {searchParams?.created ? <FlashMessage message="План запусков создан." tone="success" /> : null}
      {searchParams?.updated ? <FlashMessage message="План запусков обновлен." tone="success" /> : null}
      {searchParams?.error ? <FlashMessage message={searchParams.error} tone="error" /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Статус</span>
          <strong className="summary-stat__value">{statusMeta?.label ?? plan.status}</strong>
          <span className="summary-stat__hint">Текущая рабочая фаза плана</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет</span>
          <strong className="summary-stat__value">${plan.budget.toString()}</strong>
          <span className="summary-stat__hint">{budgetModeMeta?.shortLabel ?? plan.budgetMode}</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Структура</span>
          <strong className="summary-stat__value">{structure}</strong>
          <span className="summary-stat__hint">Кампании · адсеты · креативы</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Выбрано</span>
          <strong className="summary-stat__value">{plan.items.length}</strong>
          <span className="summary-stat__hint">Креативов внутри плана</span>
        </article>
      </section>

      <LaunchPlanForm
        action={action}
        approaches={approaches}
        cancelHref="/launch-plans"
        creatives={creatives}
        description="Сохранение пересоберет нейминги под новую структуру и актуальный набор креативов."
        error={undefined}
        heading="Редактирование параметров"
        showStatus
        submitLabel="Сохранить изменения"
        values={{
          name: plan.name,
          budgetMode: budgetModeMeta?.value ?? "campaign",
          budget: plan.budget.toString(),
          campaignsCount: String(plan.campaignsCount),
          adsetsCount: String(plan.adsetsCount),
          creativesCount: String(plan.creativesCount),
          approachId: plan.approachId ?? "",
          namingLabel: plan.namingLabel ?? "",
          selectedCreativeIds: plan.items.map((item) => item.creativeId),
          status: statusMeta?.value ?? "queue"
        }}
      />

      {uniqueCampaignNamings.length > 0 ? (
        <SectionCard title="Нейминги кампаний" description="Сформированы автоматически на основе воронки, метки и структуры плана.">
          <div className="launch-plan-naming-list">
            {uniqueCampaignNamings.map((naming) => (
              <div key={naming} className="launch-plan-naming-list__item">
                <code>{naming}</code>
                <span className="table-muted">Campaign</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Детали по креативам" description="Итоговый набор для передачи в запуск с готовыми неймингами ad set и creative.">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Креатив</th>
                <th>Campaign</th>
                <th>Ad set</th>
                <th>Creative</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="table-primary">
                      <Link href={`/creatives/${item.creative.id}`}>
                        <strong>{item.creative.name}</strong>
                      </Link>
                      <span className="table-subcopy">{item.creative.approach?.name ?? "Без воронки"}</span>
                    </div>
                  </td>
                  <td>
                    <code>{item.campaignNaming}</code>
                  </td>
                  <td>
                    <code>{item.adsetNaming}</code>
                  </td>
                  <td>
                    <code>{item.creativeNaming}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Служебно" description="Кто и когда создавал этот план.">
        <ul className="signal-list">
          <li>
            <div className="item-title">
              <span>Создан</span>
              <StatusBadge status={plan.status} />
            </div>
            <span className="item-copy">
              {formatDateTime(plan.createdAt)} · {plan.createdBy?.name ?? plan.createdBy?.email ?? "без автора"}
            </span>
          </li>
          <li>
            <div className="item-title">
              <span>Обновлен</span>
            </div>
            <span className="item-copy">
              {formatDateTime(plan.updatedAt)} · {plan.updatedBy?.name ?? plan.updatedBy?.email ?? "без автора"}
            </span>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}
