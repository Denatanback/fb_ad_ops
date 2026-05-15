import Link from "next/link";
import { CreativeFilters } from "@/components/creatives/creative-filters";
import { FlashMessage } from "@/components/workspace/flash-message";
import { LabelChip } from "@/components/workspace/label-chip";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { parseCreativeLabelValue, parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { formatDateTime, formatOptionalText } from "@/lib/formatters";
import { listApproachOptions } from "@/server/services/approaches";
import { getCreativeListSummary, listCreatives } from "@/server/services/creatives";

type CreativesPageProps = {
  searchParams?: {
    q?: string;
    approachId?: string;
    status?: string;
    label?: string;
    error?: string;
  };
};

export default async function CreativesPage({ searchParams }: CreativesPageProps) {
  const filters = {
    query: searchParams?.q?.trim() || "",
    approachId: searchParams?.approachId?.trim() || "",
    status: parseLifecycleStatus(searchParams?.status ?? null)?.dbValue,
    label: parseCreativeLabelValue(searchParams?.label ?? null)?.dbValue
  };

  const [creatives, approaches, summary] = await Promise.all([
    listCreatives(filters),
    listApproachOptions(),
    getCreativeListSummary(filters)
  ]);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Креативы"
        title="Список креативов"
        description="Рабочая таблица для поиска, фильтров и перехода в детали. Визуальный просмотр вынесен в галерею."
      />

      {searchParams?.error ? <FlashMessage message={searchParams.error} tone="error" /> : null}

      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group" role="tablist" aria-label="Вид раздела">
            <span className="toolbar-chip toolbar-chip--active" aria-current="page">
              Список
            </span>
            <Link className="toolbar-chip" href="/creatives/gallery">
              Галерея
            </Link>
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href="/creatives/new">
              Новый
            </Link>
            <Link className="toolbar-link" href="/creatives/bulk">
              Массовая загрузка
            </Link>
            <Link className="toolbar-link" href="/approaches">
              Воронки
            </Link>
          </div>
        </div>
      </section>

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Найдено</span>
          <strong className="summary-stat__value">{summary.count}</strong>
          <span className="summary-stat__hint">Креативов по текущим фильтрам</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Подходы</span>
          <strong className="summary-stat__value">{summary.approachCount}</strong>
          <span className="summary-stat__hint">Доступно в библиотеке</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Режим</span>
          <strong className="summary-stat__value">Таблица</strong>
          <span className="summary-stat__hint">Табличный просмотр для быстрых правок</span>
        </article>
      </section>

      <SectionCard title="Фильтры" description="Поиск по названию, подходу, статусу и меткам без перегруженного интерфейса.">
        <CreativeFilters
          approaches={approaches}
          values={{
            query: searchParams?.q ?? "",
            approachId: searchParams?.approachId ?? "",
            status: searchParams?.status ?? "",
            label: searchParams?.label ?? ""
          }}
        />
      </SectionCard>

      <SectionCard
        title="Рабочая таблица"
        description="Lifecycle-статусы и labels остаются разделёнными, чтобы рабочая фаза не смешивалась с оценкой результата."
      >
        {creatives.length ? (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Креатив</th>
                  <th>Подход</th>
                  <th>Статус</th>
                  <th>Метки</th>
                  <th>Запуски</th>
                  <th>Обновлён</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {creatives.map((creative) => (
                  <tr key={creative.id}>
                    <td>
                      <div className="table-primary">
                        <strong>{creative.name}</strong>
                        <span className="table-subcopy">{formatOptionalText(creative.type, "Тип не указан")}</span>
                      </div>
                    </td>
                    <td>{creative.approach?.name ?? "Без воронки"}</td>
                    <td>
                      <StatusBadge status={creative.currentStatus} />
                    </td>
                    <td>
                      <div className="tag-row">
                        {creative.labelAssignments.length ? (
                          creative.labelAssignments.map((assignment) => (
                            <LabelChip key={assignment.creativeLabel.id} label={assignment.creativeLabel.key} />
                          ))
                        ) : (
                          <span className="table-muted">Без меток</span>
                        )}
                      </div>
                    </td>
                    <td>{creative._count.launches}</td>
                    <td className="table-muted">
                      {formatDateTime(creative.updatedAt)}
                      {creative.updatedBy?.email ? <span className="table-subcopy">{creative.updatedBy.email}</span> : null}
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
        ) : (
          <div className="empty-inline">
            <h3>Креативы не найдены.</h3>
            <p>Смените фильтры или добавьте первый креатив в библиотеку.</p>
            <div className="hero-actions">
              <Link className="button button--primary" href="/creatives/new">
                Создать креатив
              </Link>
              <Link className="button button--secondary" href="/creatives">
                Сбросить фильтры
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
