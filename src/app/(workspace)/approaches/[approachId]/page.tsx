import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDateTime } from "@/lib/formatters";
import { listCreativesForGallery } from "@/server/services/creatives";
import { getApproachWithHypotheses } from "@/server/services/approaches";
import { listLaunchPlans } from "@/server/services/launch-plans";
import { assignCreativesToApproachAction } from "../actions";
import { FunnelTree } from "./funnel-tree";

type ApproachDetailPageProps = {
  params: {
    approachId: string;
  };
  searchParams?: {
    assigned?: string;
    error?: string;
  };
};

function buildLaunchPlanHref(approachId: string, creativeIds: string[]) {
  const params = new URLSearchParams();
  params.set("approachId", approachId);

  for (const creativeId of creativeIds) {
    params.append("creativeId", creativeId);
  }

  return `/launch-plans/new?${params.toString()}`;
}

export default async function ApproachDetailPage({ params, searchParams }: ApproachDetailPageProps) {
  const [approach, unassignedCreatives, approachPlans] = await Promise.all([
    getApproachWithHypotheses(params.approachId),
    listCreativesForGallery({ approachId: "unassigned" }),
    listLaunchPlans({ approachId: params.approachId })
  ]);

  if (!approach) {
    notFound();
  }

  const createPlanHref = buildLaunchPlanHref(
    approach.id,
    approach.creatives.map((creative) => creative.id)
  );
  const assignCreativesAction = assignCreativesToApproachAction.bind(null, approach.id);

  return (
    <div className="content-frame">
      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group">
            <Link className="toolbar-link" href="/approaches">
              К воронкам
            </Link>
            <Link className="toolbar-link" href={`/creatives/gallery?approachId=${approach.id}`}>
              Галерея этой воронки
            </Link>
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href={createPlanHref}>
              Новый план запусков
            </Link>
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow="Воронка"
        title={approach.name}
        description="Сначала креативы попадают в галерею, затем распределяются по воронкам, после чего из этой же воронки собирается план запусков с готовыми неймингами."
      />

      {searchParams?.assigned ? (
        <FlashMessage message={`В воронку добавлено креативов: ${searchParams.assigned}.`} tone="success" />
      ) : null}
      {searchParams?.error ? <FlashMessage message={searchParams.error} tone="error" /> : null}

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Гипотез</span>
          <strong className="summary-stat__value">{approach.hypotheses.length}</strong>
          <span className="summary-stat__hint">Внутри этой воронки</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет гипотез</span>
          <strong className="summary-stat__value">
            ${approach.hypotheses.reduce((sum, h) => sum + (h.budget ? Number(h.budget) : 0), 0).toFixed(2)}
          </strong>
          <span className="summary-stat__hint">Сумма по гипотезам</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Креативов</span>
          <strong className="summary-stat__value">{approach.creatives.length}</strong>
          <span className="summary-stat__hint">Уже распределены в воронку</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Планов</span>
          <strong className="summary-stat__value">{approachPlans.length}</strong>
          <span className="summary-stat__hint">Связаны с этой воронкой</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Бюджет планов</span>
          <strong className="summary-stat__value">
            ${approachPlans.reduce((sum, p) => sum + Number(p.budget), 0).toFixed(2)}
          </strong>
          <span className="summary-stat__hint">Сумма по планам запусков</span>
        </article>
      </section>

      <div style={{ width: "100%" }}>
        <FunnelTree approach={{
          ...approach,
          hypotheses: approach.hypotheses.map((h) => ({ ...h, budget: h.budget?.toString() ?? null }))
        }} />
      </div>

      <section className="dashboard-shell-grid">
        <SectionCard
          title={`Креативы воронки · ${approach.creatives.length}`}
          description="Именно эти креативы можно отправить в план запусков без дополнительного ручного связывания."
        >
          {approach.creatives.length === 0 ? (
            <div className="empty-inline">
              <h3>В этой воронке пока нет креативов</h3>
              <p>Сначала заберите их из галереи, затем сформируйте план запусков уже из распределенного набора.</p>
              <div className="hero-actions">
                <Link className="button button--secondary" href="/creatives/gallery?approachId=unassigned">
                  Открыть новые креативы
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="workspace-toolbar__row">
                <div className="workspace-toolbar__meta">
                  <span className="pill pill--neutral">Готово для launch plan</span>
                </div>
                <div className="workspace-toolbar__group workspace-toolbar__group--links">
                  <Link className="toolbar-link" href={`/creatives/gallery?approachId=${approach.id}`}>
                    Открыть в галерее
                  </Link>
                  <Link className="toolbar-link" href={createPlanHref}>
                    Сформировать план запусков
                  </Link>
                </div>
              </div>

              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Креатив</th>
                      <th>Тип</th>
                      <th>Статус</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {approach.creatives.map((creative) => (
                      <tr key={creative.id}>
                        <td>
                          <Link href={`/creatives/${creative.id}`}>
                            <strong>{creative.name}</strong>
                          </Link>
                        </td>
                        <td className="table-muted">{creative.type ?? creative.sourceMimeType ?? "—"}</td>
                        <td>
                          <StatusBadge status={creative.currentStatus} />
                        </td>
                        <td className="table-actions">
                          <Link className="button button--secondary button--compact" href={`/creatives/${creative.id}`}>
                            Детали
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Последние планы запусков"
          description="Отсюда удобно перейти к уже собранным планам и поправить бюджет, структуру или статус."
        >
          {approachPlans.length === 0 ? (
            <div className="empty-inline empty-inline--subtle">
              <h3>Планов пока нет</h3>
              <p>Когда набор креативов по воронке готов, можно сразу открыть форму нового плана запусков.</p>
            </div>
          ) : (
            <ul className="signal-list">
              {approachPlans.slice(0, 4).map((plan) => (
                <li key={plan.id}>
                  <div className="item-title">
                    <Link href={`/launch-plans/${plan.id}`}>{plan.name}</Link>
                    <StatusBadge status={plan.status} />
                  </div>
                  <span className="item-copy">
                    {plan.budgetMode === "CAMPAIGN" ? "CBO" : "ABO"} · ${plan.budget.toString()} · {plan.items.length} креативов
                  </span>
                  <span className="table-muted">{formatDateTime(plan.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="hero-actions">
            <Link className="button button--secondary button--compact" href="/launch-plans">
              Все планы запусков
            </Link>
            <Link className="button button--primary button--compact" href={createPlanHref}>
              Новый план
            </Link>
          </div>
        </SectionCard>
      </section>

      <SectionCard
        title={`Добавить креативы из галереи · ${unassignedCreatives.length}`}
        description="Этот блок связывает галерею и воронки: новые креативы без воронки можно сразу забрать в текущую воронку."
      >
        {unassignedCreatives.length === 0 ? (
          <div className="empty-inline">
            <h3>Свободных креативов нет</h3>
            <p>Все новые креативы уже распределены по воронкам или еще не загружены в галерею.</p>
            <div className="hero-actions">
              <Link className="button button--secondary" href="/creatives/bulk">
                Загрузить новый набор
              </Link>
            </div>
          </div>
        ) : (
          <form action={assignCreativesAction} className="stack stack--tight">
            <div className="launch-plan-picker__grid">
              {unassignedCreatives.map((creative) => (
                <label key={creative.id} className="checkbox-card launch-plan-picker__card">
                  <input name="creativeId" type="checkbox" value={creative.id} />
                  <div className="checkbox-card__copy">
                    <strong>{creative.name}</strong>
                    <div className="launch-plan-picker__meta">
                      <span className="gallery-chip">
                        {creative.sourceMimeType?.startsWith("video/") ? "vid" : creative.sourceMimeType?.startsWith("image/") ? "img" : "file"}
                      </span>
                      <StatusBadge status={creative.currentStatus} />
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="hero-actions">
              <button className="button button--primary" type="submit">
                Добавить в эту воронку
              </button>
              <Link className="button button--secondary" href="/creatives/gallery?approachId=unassigned">
                Открыть в галерее
              </Link>
            </div>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
