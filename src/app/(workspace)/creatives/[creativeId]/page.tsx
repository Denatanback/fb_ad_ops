import Link from "next/link";
import { notFound } from "next/navigation";
import { FlashMessage } from "@/components/workspace/flash-message";
import { BudgetModeBadge } from "@/components/workspace/budget-mode-badge";
import { LabelChip } from "@/components/workspace/label-chip";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";
import { CreativePreview } from "@/components/creatives/creative-preview";
import { formatDate, formatDateTime, formatNumericValue, formatOptionalText } from "@/lib/formatters";
import { resolveCreativePreview } from "@/server/services/creative-media";
import { getCreativeDetail } from "@/server/services/creatives";
import { listCreativeLaunchHistory } from "@/server/services/launches";

type CreativeDetailPageProps = {
  params: {
    creativeId: string;
  };
  searchParams?: {
    created?: string;
    updated?: string;
  };
};

function getMediaSummary(creative: Awaited<ReturnType<typeof getCreativeDetail>>) {
  if (!creative) {
    return null;
  }

  const preview = resolveCreativePreview({
    name: creative.name,
    sourceFilename: creative.sourceFilename,
    sourceMimeType: creative.sourceMimeType,
    thumbnailUrl: creative.thumbnailUrl,
    previewUrl: creative.previewUrl,
    assetUrl: creative.assetUrl,
    sourceUrl: creative.sourceUrl,
    driveDownloadUrl: creative.driveDownloadUrl,
    driveWebViewLink: creative.driveWebViewLink
  });
  const hasDriveBacking = Boolean(creative.driveFileId || creative.driveWebViewLink || creative.driveDownloadUrl);
  const hasExternalOriginal = Boolean(creative.sourceUrl || creative.assetUrl);

  return {
    preview,
    storageLabel: hasDriveBacking ? "Google Drive" : hasExternalOriginal ? "Внешняя ссылка" : "Без original",
    previewLabel: preview.hasPreview ? "Есть превью" : "Нет превью",
    originalLabel: creative.sourceUrl
      ? "source_url задан"
      : creative.driveWebViewLink
        ? "original через Drive"
        : "original не указан"
  };
}

export default async function CreativeDetailPage({ params, searchParams }: CreativeDetailPageProps) {
  const [creative, launches] = await Promise.all([getCreativeDetail(params.creativeId), listCreativeLaunchHistory(params.creativeId)]);

  if (!creative) {
    notFound();
  }

  const media = getMediaSummary(creative);
  const latestLaunch = launches[0] ?? null;
  const latestMetrics = latestLaunch?.metrics[0] ?? null;

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Креатив"
        title={creative.name}
        description="Медиа, статус, метки, запуски и последние метрики в одной рабочей карточке."
      />

      {searchParams?.created ? <FlashMessage message="Креатив создан." tone="success" /> : null}
      {searchParams?.updated ? <FlashMessage message="Креатив обновлён." tone="success" /> : null}

      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group">
            <Link className="toolbar-link" href="/creatives/gallery">
              К галерее
            </Link>
            <Link className="toolbar-link" href="/creatives">
              К списку
            </Link>
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href={`/creatives/${creative.id}/edit`}>
              Редактировать
            </Link>
            <Link className="toolbar-link" href={`/creatives/${creative.id}/launches/new`}>
              Новый запуск
            </Link>
          </div>
        </div>
      </section>

      <section className="creative-detail-hero">
        <article className="creative-hero-card">
          <div className="creative-hero-card__header">
            <div className="stack stack--tight">
              <div className="tag-row">
                <StatusBadge status={creative.currentStatus} />
                {creative.labelAssignments.length ? (
                  creative.labelAssignments.map((assignment) => (
                    <LabelChip key={assignment.creativeLabel.id} label={assignment.creativeLabel.key} />
                  ))
                ) : (
                  <span className="gallery-chip">без меток</span>
                )}
              </div>

              <div className="creative-hero-card__meta">
                <span>Подход: {creative.approach?.name ?? "Без воронки"}</span>
                <span>Тип: {formatOptionalText(creative.type, "не указан")}</span>
                <span>Запусков: {creative._count.launches}</span>
              </div>
            </div>

            <div className="hero-actions">
              <Link className="button button--primary button--compact" href={`/creatives/${creative.id}/edit`}>
                Изменить статус и метки
              </Link>
              <Link className="button button--secondary button--compact" href={`/creatives/${creative.id}/launches/new`}>
                Создать запуск
              </Link>
            </div>
          </div>

          {media?.preview.hasPreview ? (
            <div className="creative-preview-stage">
              <CreativePreview
                alt={`Превью ${creative.name}`}
                fallbackClassName="gallery-card__thumb-placeholder"
                fallbackLabel="Нет доступного превью"
                imageClassName="media-preview-image"
                sources={media.preview.sources}
                videoClassName="media-preview-video"
                videoControls
              />
            </div>
          ) : (
            <div className="creative-preview-stage creative-preview-stage--empty">
              <div className="gallery-card__thumb-placeholder">Нет poster / preview</div>
            </div>
          )}

          <div className="workspace-toolbar__row">
            <div className="workspace-toolbar__meta">
              <span className="pill pill--neutral">Хранение: {media?.storageLabel}</span>
              <span className="pill pill--neutral">Превью: {media?.previewLabel}</span>
              <span className="pill pill--neutral">{media?.originalLabel}</span>
            </div>

            <div className="workspace-toolbar__group workspace-toolbar__group--links">
              {media?.preview.openOriginalUrl ? (
                <a className="toolbar-link" href={media.preview.openOriginalUrl} rel="noreferrer" target="_blank">
                  Оригинал
                </a>
              ) : null}
              {media?.preview.sources[0] ? (
                <a className="toolbar-link" href={media.preview.sources[0].url} rel="noreferrer" target="_blank">
                  Превью
                </a>
              ) : null}
              {creative.driveWebViewLink ? (
                <a className="toolbar-link" href={creative.driveWebViewLink} rel="noreferrer" target="_blank">
                  Google Drive
                </a>
              ) : null}
            </div>
          </div>
        </article>

        <aside className="creative-side-rail">
          <SectionCard title="Оперативно" description="Что важно увидеть сразу.">
            <div className="summary-strip summary-strip--single">
              <article className="summary-stat">
                <span className="summary-stat__label">Статус</span>
                <strong className="summary-stat__value">{creative.currentStatus.toLowerCase()}</strong>
                <span className="summary-stat__hint">Текущая фаза креатива</span>
              </article>
              <article className="summary-stat">
                <span className="summary-stat__label">Последний запуск</span>
                <strong className="summary-stat__value">{latestLaunch ? latestLaunch.setupName : "—"}</strong>
                <span className="summary-stat__hint">
                  {latestLaunch ? formatDateTime(latestLaunch.launchedAt ?? latestLaunch.createdAt) : "Запусков пока нет"}
                </span>
              </article>
              <article className="summary-stat">
                <span className="summary-stat__label">Последние результаты</span>
                <strong className="summary-stat__value">{latestMetrics ? formatNumericValue(latestMetrics.results) : "—"}</strong>
                <span className="summary-stat__hint">По последнему доступному срезу</span>
              </article>
            </div>
          </SectionCard>

          <SectionCard title="Системный след" description="Кто и когда обновлял карточку.">
            <ul className="signal-list">
              <li>
                <div className="item-title">
                  <span>Создан</span>
                </div>
                <span className="item-copy">
                  {formatDateTime(creative.createdAt)} · {creative.createdBy?.email ?? "системный пользователь"}
                </span>
              </li>
              <li>
                <div className="item-title">
                  <span>Обновлён</span>
                </div>
                <span className="item-copy">
                  {formatDateTime(creative.updatedAt)} · {creative.updatedBy?.email ?? "без явного автора"}
                </span>
              </li>
              <li>
                <div className="item-title">
                  <span>Заметки</span>
                </div>
                <span className="item-copy">{formatOptionalText(creative.notes, "Пока без заметок")}</span>
              </li>
            </ul>
          </SectionCard>
        </aside>
      </section>

      <section className="dashboard-shell-grid">
        <SectionCard
          title="Медиа и ссылки"
          description="Preview-first / link-first: original живёт во внешнем хранилище, в системе остаются references и metadata."
        >
          <dl className="details-grid">
            <div>
              <dt>source_url</dt>
              <dd>
                {creative.sourceUrl ? (
                  <a className="detail-link" href={creative.sourceUrl} rel="noreferrer" target="_blank">
                    {creative.sourceUrl}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>asset_url</dt>
              <dd>
                {creative.assetUrl ? (
                  <a className="detail-link" href={creative.assetUrl} rel="noreferrer" target="_blank">
                    {creative.assetUrl}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>preview_url</dt>
              <dd>
                {creative.previewUrl ? (
                  <a className="detail-link" href={creative.previewUrl} rel="noreferrer" target="_blank">
                    {creative.previewUrl}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>thumbnail_url</dt>
              <dd>
                {creative.thumbnailUrl ? (
                  <a className="detail-link" href={creative.thumbnailUrl} rel="noreferrer" target="_blank">
                    {creative.thumbnailUrl}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>Drive file ID</dt>
              <dd>{formatOptionalText(creative.driveFileId, "Не указан")}</dd>
            </div>
            <div>
              <dt>Drive view link</dt>
              <dd>
                {creative.driveWebViewLink ? (
                  <a className="detail-link" href={creative.driveWebViewLink} rel="noreferrer" target="_blank">
                    {creative.driveWebViewLink}
                  </a>
                ) : (
                  "Не указан"
                )}
              </dd>
            </div>
            <div>
              <dt>Имя файла</dt>
              <dd>{formatOptionalText(creative.sourceFilename, "Не указано")}</dd>
            </div>
            <div>
              <dt>MIME type</dt>
              <dd>{formatOptionalText(creative.sourceMimeType, "Не указан")}</dd>
            </div>
            <div>
              <dt>Размер</dt>
              <dd>{creative.sourceByteSize ?? "Не указан"}</dd>
            </div>
            <div>
              <dt>Метки</dt>
              <dd>
                {creative.labelAssignments.length
                  ? creative.labelAssignments.map((item) => item.creativeLabel.name).join(", ")
                  : "Без меток"}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Последние метрики"
          description="Срез из существующего launch flow без выдуманной inline-логики."
        >
          {latestMetrics ? (
            <div className="summary-strip summary-strip--single">
              <article className="summary-stat">
                <span className="summary-stat__label">CTR</span>
                <strong className="summary-stat__value">{formatNumericValue(latestMetrics.ctr)}</strong>
                <span className="summary-stat__hint">По последнему срезу</span>
              </article>
              <article className="summary-stat">
                <span className="summary-stat__label">CPC</span>
                <strong className="summary-stat__value">{formatNumericValue(latestMetrics.cpc)}</strong>
                <span className="summary-stat__hint">Из связанного запуска</span>
              </article>
              <article className="summary-stat">
                <span className="summary-stat__label">Results</span>
                <strong className="summary-stat__value">{formatNumericValue(latestMetrics.results)}</strong>
                <span className="summary-stat__hint">Последний доступный результат</span>
              </article>
            </div>
          ) : (
            <div className="empty-inline empty-inline--subtle">
              <h3>Метрик пока нет</h3>
              <p>Как только у запуска появится metrics snapshot, он отобразится здесь без отдельного mock UI.</p>
            </div>
          )}

          <div className="hero-actions">
            {latestLaunch ? (
              <Link className="button button--secondary button--compact" href={`/launches/${latestLaunch.id}`}>
                Открыть последний запуск
              </Link>
            ) : null}
            <Link className="button button--primary button--compact" href={`/creatives/${creative.id}/edit`}>
              Обновить карточку
            </Link>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="История запусков" description="Запуски, budget mode и текущие метрики живут отдельно от полей Creative.">
        {launches.length ? (
          <div className="table-shell">
            <table className="data-table data-table--dense">
              <thead>
                <tr>
                  <th>Setup</th>
                  <th>Статус</th>
                  <th>Budget mode</th>
                  <th>Лендер</th>
                  <th>Дата запуска</th>
                  <th>Метрики</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {launches.map((launch) => {
                  const metrics = launch.metrics[0] ?? null;

                  return (
                    <tr key={launch.id}>
                      <td>
                        <div className="table-primary">
                          <strong>{launch.setupName}</strong>
                          <span className="table-subcopy">{formatOptionalText(launch.notes, "Без заметки")}</span>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={launch.lifecycleStatus} />
                      </td>
                      <td>
                        <BudgetModeBadge mode={launch.budgetMode} />
                      </td>
                      <td className="table-muted">
                        {launch.lander ? (
                          <>
                            {launch.lander.name}
                            <span className="table-subcopy">{launch.lander.url}</span>
                          </>
                        ) : (
                          "Не выбран"
                        )}
                      </td>
                      <td className="table-muted">
                        {formatDate(launch.launchedAt)}
                        <span className="table-subcopy">Создан: {formatDateTime(launch.createdAt)}</span>
                      </td>
                      <td className="table-muted">
                        {metrics ? (
                          <>
                            CTR: {formatNumericValue(metrics.ctr)} · CPC: {formatNumericValue(metrics.cpc)}
                            <span className="table-subcopy">Results: {formatNumericValue(metrics.results)}</span>
                          </>
                        ) : (
                          "Без metrics"
                        )}
                      </td>
                      <td className="table-actions">
                        <Link className="button button--secondary button--compact" href={`/launches/${launch.id}`}>
                          Открыть
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Запусков пока нет.</h3>
            <p>Добавьте первый запуск, чтобы зафиксировать setup, budget mode и metrics.</p>
            <div className="hero-actions">
              <Link className="button button--primary" href={`/creatives/${creative.id}/launches/new`}>
                Создать запуск
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
