import Link from "next/link";
import { LifecycleStatus } from "@prisma/client";
import { DriveSyncTrigger } from "@/components/creatives/drive-sync-trigger";
import { CreativeGalleryCard } from "@/components/creatives/creative-gallery-card";
import { GalleryManagerProvider } from "@/components/creatives/gallery-manager";
import { GalleryBulkBar } from "@/components/creatives/gallery-bulk-bar";
import { PageHeader } from "@/components/workspace/page-header";
import { StatusBadge } from "@/components/workspace/status-badge";
import { parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { listApproachOptions } from "@/server/services/approaches";
import { detectCreativeMediaType } from "@/server/services/creative-media";
import {
  listCreativesForGallery,
  listCreativeFolders,
  type GalleryCreative,
  type FolderSummary
} from "@/server/services/creatives";

const STATUS_ORDER: LifecycleStatus[] = [
  LifecycleStatus.ACTIVE,
  LifecycleStatus.QUEUE,
  LifecycleStatus.SCALING,
  LifecycleStatus.STOPPED
];

type ApproachGroup = {
  approachId: string;
  approachName: string;
  video: GalleryCreative[];
  image: GalleryCreative[];
};

type StatusGroup = {
  status: LifecycleStatus;
  approaches: ApproachGroup[];
  total: number;
};

type GalleryPageProps = {
  searchParams?: {
    q?: string;
    approachId?: string;
    status?: string;
    media?: string;
    folderId?: string; // "none" = no folder, UUID = specific folder
  };
};

function buildGalleryGroups(creatives: GalleryCreative[]): StatusGroup[] {
  const byStatus = new Map<LifecycleStatus, Map<string, ApproachGroup>>();

  for (const creative of creatives) {
    const status = creative.currentStatus;

    if (!byStatus.has(status)) {
      byStatus.set(status, new Map());
    }

    const approachMap = byStatus.get(status)!;
    const approachId = creative.approach?.id ?? "unassigned";
    const approachName = creative.approach?.name ?? "Без воронки";

    if (!approachMap.has(approachId)) {
      approachMap.set(approachId, {
        approachId,
        approachName,
        video: [],
        image: []
      });
    }

    const group = approachMap.get(approachId)!;
    const mediaKind = detectCreativeMediaType({ name: creative.name, type: creative.sourceMimeType }) ?? "static";

    if (mediaKind === "video") {
      group.video.push(creative);
    } else {
      group.image.push(creative);
    }
  }

  const result: StatusGroup[] = [];

  for (const status of STATUS_ORDER) {
    const approachMap = byStatus.get(status);

    if (!approachMap || approachMap.size === 0) {
      continue;
    }

    const approaches = Array.from(approachMap.values()).sort((left, right) =>
      left.approachName.localeCompare(right.approachName, "ru")
    );
    const total = approaches.reduce((sum, approach) => sum + approach.video.length + approach.image.length, 0);

    result.push({
      status,
      approaches,
      total
    });
  }

  return result;
}

function filterByMedia(creatives: GalleryCreative[], mediaValue: string) {
  if (mediaValue !== "image" && mediaValue !== "video") {
    return creatives;
  }

  return creatives.filter((creative) => {
    const mediaKind = detectCreativeMediaType({ name: creative.name, type: creative.sourceMimeType }) ?? "static";
    return mediaValue === "video" ? mediaKind === "video" : mediaKind !== "video";
  });
}

function buildLaunchPlanHref(approachId: string, creatives: GalleryCreative[]) {
  const params = new URLSearchParams();
  params.set("approachId", approachId);

  for (const creative of creatives) {
    params.append("creativeId", creative.id);
  }

  return `/launch-plans/new?${params.toString()}`;
}

function FolderBrowser({ folders }: { folders: FolderSummary[] }) {
  const named = folders.filter((f) => f.folderId !== null);
  const unorganized = folders.find((f) => f.folderId === null);

  return (
    <div className="folder-browser">
      {named.map((folder) => (
        <Link
          key={folder.folderId}
          className="folder-tile"
          href={`/creatives/gallery?folderId=${folder.folderId}`}
        >
          <span className="folder-tile__icon">📁</span>
          <span className="folder-tile__name">{folder.folderName ?? folder.folderId}</span>
          <span className="folder-tile__count">{folder.count} крео</span>
        </Link>
      ))}

      {unorganized ? (
        <Link className="folder-tile folder-tile--muted" href="/creatives/gallery?folderId=none">
          <span className="folder-tile__icon">📂</span>
          <span className="folder-tile__name">Без папки</span>
          <span className="folder-tile__count">{unorganized.count} крео</span>
        </Link>
      ) : null}

      {folders.length === 0 ? (
        <div className="empty-inline">
          <h3>Папки не найдены</h3>
          <p>Загрузите первый набор креативов, указав папку при загрузке, и она появится здесь.</p>
          <div className="hero-actions">
            <Link className="button button--primary" href="/creatives/bulk">
              Загрузить набор
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default async function CreativesGalleryPage({ searchParams }: GalleryPageProps) {
  const rawFolderId = searchParams?.folderId?.trim() ?? "";
  const isInFolder = rawFolderId !== "";

  // Resolve actual driveFolderId filter value
  const driveFolderFilter: string | null | undefined = isInFolder
    ? rawFolderId === "none"
      ? null
      : rawFolderId
    : undefined;

  const values = {
    query: searchParams?.q?.trim() ?? "",
    approachId: searchParams?.approachId?.trim() ?? "",
    status: searchParams?.status?.trim() ?? "",
    media: searchParams?.media?.trim() ?? ""
  };

  const status = parseLifecycleStatus(values.status)?.dbValue;

  if (!isInFolder) {
    // Folder browser mode — list distinct folders from DB
    const folders = await listCreativeFolders();

    return (
      <div className="content-frame">
        <DriveSyncTrigger />

        <PageHeader
          eyebrow="Креативы"
          title="Галерея"
          description="Выберите папку, чтобы просмотреть её содержимое."
        />

        <section className="workspace-toolbar workspace-toolbar--stacked">
          <div className="workspace-toolbar__row">
            <div className="workspace-toolbar__group" aria-label="Вид раздела" role="tablist">
              <Link className="toolbar-chip" href="/creatives">
                Список
              </Link>
              <span aria-current="page" className="toolbar-chip toolbar-chip--active">
                Галерея
              </span>
            </div>

            <div className="workspace-toolbar__group workspace-toolbar__group--links">
              <Link className="toolbar-link" href="/creatives/new">
                Новый
              </Link>
              <Link className="toolbar-link" href="/creatives/bulk">
                Массовая загрузка
              </Link>
              <Link className="toolbar-link" href="/admin/google-drive/folders">
                Папки Drive
              </Link>
              <Link className="toolbar-link" href="/approaches">
                Воронки
              </Link>
              <Link className="toolbar-link" href="/launch-plans">
                План запусков
              </Link>
            </div>
          </div>
        </section>

        <div className="gallery-folder-header">
          <span className="gallery-folder-breadcrumb">
            <span className="gallery-folder-breadcrumb__root">FB creatives</span>
          </span>
        </div>

        <FolderBrowser folders={folders} />
      </div>
    );
  }

  // Folder content mode
  const currentFolderName =
    rawFolderId === "none"
      ? "Без папки"
      : null; // will be resolved from first creative below

  const [approaches, rawCreatives] = await Promise.all([
    listApproachOptions(),
    listCreativesForGallery({
      query: values.query || undefined,
      approachId: values.approachId || undefined,
      status,
      driveFolderId: driveFolderFilter
    })
  ]);

  const folderDisplayName =
    rawFolderId === "none"
      ? "Без папки"
      : (rawCreatives[0]?.driveFolderName ?? rawFolderId);

  const creatives = filterByMedia(rawCreatives, values.media);
  const groups = buildGalleryGroups(creatives);
  const imageCount = creatives.filter((creative) => {
    const mediaKind = detectCreativeMediaType({ name: creative.name, type: creative.sourceMimeType }) ?? "static";
    return mediaKind !== "video";
  }).length;
  const videoCount = creatives.length - imageCount;
  const unassignedCount = creatives.filter((creative) => !creative.approach).length;

  // Build filter href preserving folderId
  const buildFilterHref = (extra: Record<string, string>) => {
    const params = new URLSearchParams({ folderId: rawFolderId, ...extra });
    return `/creatives/gallery?${params.toString()}`;
  };

  return (
    <div className="content-frame">
      <DriveSyncTrigger />

      <PageHeader
        eyebrow="Креативы"
        title="Галерея"
        description="Здесь начинается поток: дизайнер загружает креативы, система сохраняет оригиналы в Google Drive, а дальше команда распределяет их по воронкам и собирает планы запусков."
      />

      <section className="workspace-toolbar workspace-toolbar--stacked">
        <div className="workspace-toolbar__row">
          <div className="workspace-toolbar__group" aria-label="Вид раздела" role="tablist">
            <Link className="toolbar-chip" href="/creatives">
              Список
            </Link>
            <span aria-current="page" className="toolbar-chip toolbar-chip--active">
              Галерея
            </span>
          </div>

          <div className="workspace-toolbar__group workspace-toolbar__group--links">
            <Link className="toolbar-link" href="/creatives/new">
              Новый
            </Link>
            <Link className="toolbar-link" href="/creatives/bulk">
              Массовая загрузка
            </Link>
            <Link className="toolbar-link" href="/admin/google-drive/folders">
              Папки Drive
            </Link>
            <Link className="toolbar-link" href="/approaches">
              Воронки
            </Link>
            <Link className="toolbar-link" href="/launch-plans">
              План запусков
            </Link>
          </div>
        </div>

        <form action="/creatives/gallery" className="compact-filter-form" method="get">
          <input type="hidden" name="folderId" value={rawFolderId} />

          <label className="field field--compact">
            <span className="field__label">Поиск</span>
            <input
              className="auth-input"
              defaultValue={values.query}
              name="q"
              placeholder="Название, тип или заметка"
              type="search"
            />
          </label>

          <label className="field field--compact">
            <span className="field__label">Воронка</span>
            <select className="auth-input" defaultValue={values.approachId} name="approachId">
              <option value="">Все воронки</option>
              <option value="unassigned">Без воронки</option>
              {approaches.map((approach) => (
                <option key={approach.id} value={approach.id}>
                  {approach.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--compact">
            <span className="field__label">Статус</span>
            <select className="auth-input" defaultValue={values.status} name="status">
              <option value="">Все статусы</option>
              <option value="active">active</option>
              <option value="queue">queue</option>
              <option value="scaling">scaling</option>
              <option value="stopped">stopped</option>
            </select>
          </label>

          <label className="field field--compact">
            <span className="field__label">Медиа</span>
            <select className="auth-input" defaultValue={values.media} name="media">
              <option value="">Все</option>
              <option value="image">img</option>
              <option value="video">vid</option>
            </select>
          </label>

          <div className="compact-filter-form__actions">
            <button className="button button--primary button--compact" type="submit">
              Применить
            </button>
            <Link className="button button--secondary button--compact" href={`/creatives/gallery?folderId=${rawFolderId}`}>
              Сбросить
            </Link>
          </div>
        </form>
      </section>

      <div className="gallery-folder-header">
        <span className="gallery-folder-breadcrumb">
          <Link className="gallery-folder-breadcrumb__root" href="/creatives/gallery">
            FB creatives
          </Link>
          <span className="gallery-folder-breadcrumb__sep">/</span>
          <span className="gallery-folder-breadcrumb__current">{folderDisplayName}</span>
        </span>
      </div>

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Всего</span>
          <strong className="summary-stat__value">{creatives.length}</strong>
          <span className="summary-stat__hint">Креативов в текущем срезе</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Img</span>
          <strong className="summary-stat__value">{imageCount}</strong>
          <span className="summary-stat__hint">Статичные креативы</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Vid</span>
          <strong className="summary-stat__value">{videoCount}</strong>
          <span className="summary-stat__hint">Видео и motion-креативы</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Без воронки</span>
          <strong className="summary-stat__value">{unassignedCount}</strong>
          <span className="summary-stat__hint">Их нужно распределить через раздел воронок</span>
        </article>
      </section>

      {creatives.length === 0 ? (
        <div className="empty-inline">
          <h3>Креативы не найдены</h3>
          <p>Смените фильтры или загрузите новый набор, чтобы он появился в галерее и дальше пошел в работу.</p>
          <div className="hero-actions">
            <Link className="button button--primary" href="/creatives/bulk">
              Загрузить набор
            </Link>
          </div>
        </div>
      ) : (
        <GalleryManagerProvider allCreatives={creatives}>
        <GalleryBulkBar allCreatives={creatives} />
        <div className="gallery-content">
          {groups.map(({ status, approaches: groupedApproaches, total }) => (
            <section key={status} className="gallery-status-section">
              <div className="gallery-status-heading">
                <div className="gallery-status-heading__main">
                  <StatusBadge status={status} />
                  <span className="gallery-status-count">{total}</span>
                </div>
              </div>

              <div className="gallery-approaches">
                {groupedApproaches.map(({ approachId, approachName, video, image }) => {
                  const groupCreatives = [...video, ...image];
                  const hasApproach = approachId !== "unassigned";

                  return (
                    <div key={approachId} className="gallery-approach-block">
                      <div className="gallery-approach-heading-row">
                        <div className="gallery-approach-heading-group">
                          <p className="gallery-approach-heading">{approachName}</p>
                          <span className="table-muted">
                            {hasApproach
                              ? "Эта подборка уже связана с воронкой и готова к плану запусков."
                              : "Эти креативы еще не распределены по воронкам."}
                          </span>
                        </div>

                        <div className="workspace-toolbar__group workspace-toolbar__group--links">
                          {hasApproach ? (
                            <>
                              <Link className="toolbar-link" href={`/approaches/${approachId}`}>
                                Открыть воронку
                              </Link>
                              <Link className="toolbar-link" href={buildLaunchPlanHref(approachId, groupCreatives)}>
                                Сформировать план
                              </Link>
                            </>
                          ) : (
                            <Link className="toolbar-link" href="/approaches">
                              Распределить по воронкам
                            </Link>
                          )}
                          <Link className="toolbar-link" href={`/creatives?approachId=${approachId}`}>
                            Открыть список
                          </Link>
                        </div>
                      </div>

                      {video.length > 0 ? (
                        <div className="gallery-type-section">
                          <span className="gallery-type-label">Vid · {video.length}</span>
                          <div className="gallery-grid">
                            {video.map((creative) => (
                              <CreativeGalleryCard key={creative.id} creative={creative} />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {image.length > 0 ? (
                        <div className="gallery-type-section">
                          <span className="gallery-type-label">Img · {image.length}</span>
                          <div className="gallery-grid">
                            {image.map((creative) => (
                              <CreativeGalleryCard key={creative.id} creative={creative} />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        </GalleryManagerProvider>
      )}
    </div>
  );
}
