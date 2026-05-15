import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/workspace/flash-message";
import { BudgetModeBadge } from "@/components/workspace/budget-mode-badge";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { formatDate, formatDateTime, formatNumericValue, formatOptionalText } from "@/lib/formatters";
import { getBudgetModeMeta, launchMetricFields } from "@/lib/launch-taxonomy";
import { getLaunchDetail } from "@/server/services/launches";

type LaunchDetailPageProps = {
  params: {
    launchId: string;
  };
  searchParams?: {
    created?: string;
    updated?: string;
  };
};

export default async function LaunchDetailPage({ params, searchParams }: LaunchDetailPageProps) {
  const launch = await getLaunchDetail(params.launchId);

  if (!launch) {
    notFound();
  }

  const metrics = launch.metrics[0] ?? null;
  const budgetMeta = getBudgetModeMeta(launch.budgetMode);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Детали запуска"
        title={launch.setupName}
        description="Setup, бюджет и метрики."
      />

      {searchParams?.created ? <FlashMessage message="Запуск создан." tone="success" /> : null}
      {searchParams?.updated ? <FlashMessage message="Запуск обновлён." tone="success" /> : null}

      <section className="hero-grid">
        <article className="panel">
          <div className="panel-content">
            <div className="hero-actions hero-actions--spread">
              <div className="stack">
                <div className="tag-row">
                  <StatusBadge status={launch.lifecycleStatus} />
                  <BudgetModeBadge mode={launch.budgetMode} />
                </div>

                <div className="detail-list">
                  <div>
                    <span className="detail-list__label">Креатив</span>
                    <strong>{launch.creative.name}</strong>
                  </div>
                  <div>
                    <span className="detail-list__label">Подход</span>
                    <strong>{launch.creative.approach?.name ?? "Без воронки"}</strong>
                  </div>
                  <div>
                    <span className="detail-list__label">Режим бюджета</span>
                    <strong>{budgetMeta?.label ?? launch.budgetMode}</strong>
                  </div>
                </div>
              </div>

              <div className="hero-actions">
                <Link className="button button--primary" href={`/launches/${launch.id}/edit`}>
                  Редактировать
                </Link>
                <Link className="button button--secondary" href={`/creatives/${launch.creative.id}`}>
                  К креативу
                </Link>
              </div>
            </div>
          </div>
        </article>

        <aside className="stack">
          <section className="stat-card">
            <span className="stat-label">Дата запуска</span>
            <strong className="stat-value stat-value--compact">{formatDate(launch.launchedAt)}</strong>
            <p className="stat-copy">Создан: {formatDateTime(launch.createdAt)}</p>
          </section>
          <section className="stat-card">
            <span className="stat-label">Дата остановки</span>
            <strong className="stat-value stat-value--compact">{formatDate(launch.stoppedAt)}</strong>
            <p className="stat-copy">{launch.updatedBy?.email ?? "Без явного обновившего пользователя"}</p>
          </section>
        </aside>
      </section>

      <section className="detail-grid">
        <SectionCard title="Setup" description="Поля запуска и операционный контекст.">
          <dl className="meta-list">
            <div>
              <dt>Лендинг</dt>
              <dd>
                {launch.lander ? (
                  <span className="stack">
                    <strong>{launch.lander.name}</strong>
                    <a className="detail-link" href={launch.lander.url} rel="noreferrer" target="_blank">
                      {launch.lander.url}
                    </a>
                  </span>
                ) : (
                  "Не выбран"
                )}
              </dd>
            </div>
            <div>
              <dt>Заметки</dt>
              <dd>{formatOptionalText(launch.notes, "Пока без заметок")}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Снимок метрик" description="Текущая ручная запись performance-метрик для этого запуска.">
          {metrics ? (
            <div className="metrics-read-grid">
              {launchMetricFields.map((field) => (
                <div className="metric-card" key={field.key}>
                  <span className="stat-label">{field.label}</span>
                  <strong className="stat-value stat-value--compact">{formatNumericValue(metrics[field.key])}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline empty-inline--subtle">
              <h3>Метрики пока не заполнены.</h3>
              <p>Откройте редактирование запуска и добавьте ручной snapshot performance.</p>
            </div>
          )}
        </SectionCard>
      </section>
    </div>
  );
}
