import Link from "next/link";
import { budgetModeOptions, type BudgetModeValue } from "@/lib/launch-taxonomy";
import { lifecycleStatusOptions, type LifecycleStatusValue } from "@/lib/creative-taxonomy";
import { resolveCreativePreview, detectCreativeMediaType } from "@/server/services/creative-media";
import { CreativePreview } from "@/components/creatives/creative-preview";
import { FlashMessage } from "@/components/workspace/flash-message";
import { SectionCard } from "@/components/workspace/section-card";
import { StatusBadge } from "@/components/workspace/status-badge";

type ApproachOption = {
  id: string;
  name: string;
};

type LaunchPlanCreativeOption = {
  id: string;
  name: string;
  currentStatus: "QUEUE" | "ACTIVE" | "STOPPED" | "SCALING";
  sourceMimeType: string | null;
  sourceFilename: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  assetUrl: string | null;
  sourceUrl: string | null;
  driveWebViewLink: string | null;
  driveDownloadUrl: string | null;
  approach: {
    id: string;
    name: string;
  } | null;
};

type LaunchPlanFormValues = {
  name: string;
  budgetMode: BudgetModeValue;
  budget: string;
  campaignsCount: string;
  adsetsCount: string;
  creativesCount: string;
  approachId: string;
  namingLabel: string;
  selectedCreativeIds: string[];
  status?: LifecycleStatusValue;
};

type LaunchPlanFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  approaches: ApproachOption[];
  creatives: LaunchPlanCreativeOption[];
  values: LaunchPlanFormValues;
  heading: string;
  description: string;
  submitLabel: string;
  cancelHref: string;
  error?: string;
  showStatus?: boolean;
};

type CreativeGroup = {
  id: string;
  label: string;
  creatives: LaunchPlanCreativeOption[];
};

function buildCreativeGroups(creatives: LaunchPlanCreativeOption[]) {
  const groups = new Map<string, CreativeGroup>();

  for (const creative of creatives) {
    const groupId = creative.approach?.id ?? "unassigned";
    const label = creative.approach?.name ?? "Без воронки";

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label,
        creatives: []
      });
    }

    groups.get(groupId)?.creatives.push(creative);
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (left.id === "unassigned") {
      return 1;
    }

    if (right.id === "unassigned") {
      return -1;
    }

    return left.label.localeCompare(right.label, "ru");
  });
}


export function LaunchPlanForm({
  action,
  approaches,
  creatives,
  values,
  heading,
  description,
  submitLabel,
  cancelHref,
  error,
  showStatus = false
}: LaunchPlanFormProps) {
  const selectedCreativeIds = new Set(values.selectedCreativeIds);
  const selectedCount = selectedCreativeIds.size;
  const capacity =
    Math.max(Number(values.campaignsCount) || 1, 1) *
    Math.max(Number(values.adsetsCount) || 1, 1) *
    Math.max(Number(values.creativesCount) || 1, 1);
  const groups = buildCreativeGroups(creatives);

  return (
    <form action={action} className="stack stack--launch-plan">
      {error ? <FlashMessage message={error} tone="error" /> : null}

      <SectionCard title={heading} description={description}>
        <div className="launch-plan-meta-grid">
          <label className="field">
            <span className="field__label">Название плана</span>
            <input
              className="auth-input"
              defaultValue={values.name}
              name="name"
              placeholder={`План от ${new Date().toISOString().split("T")[0]}`}
              type="text"
            />
          </label>

          {showStatus ? (
            <label className="field">
              <span className="field__label">Статус плана</span>
              <select className="auth-input" defaultValue={values.status} name="status" required>
                {lifecycleStatusOptions.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span className="field__label">Воронка</span>
            <select className="auth-input" defaultValue={values.approachId} name="approachId">
              <option value="">Не выбрана</option>
              {approaches.map((approach) => (
                <option key={approach.id} value={approach.id}>
                  {approach.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Метка нейминга</span>
            <input
              className="auth-input"
              defaultValue={values.namingLabel}
              name="namingLabel"
              placeholder="Например: ladder, ghost_ladder"
              type="text"
            />
          </label>

          <label className="field">
            <span className="field__label">Тип бюджета</span>
            <select className="auth-input" defaultValue={values.budgetMode} name="budgetMode" required>
              {budgetModeOptions.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.shortLabel} · {mode.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Бюджет ($)</span>
            <input
              className="auth-input"
              defaultValue={values.budget}
              min={1}
              name="budget"
              required
              step="0.01"
              type="number"
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Структура запусков"
        description="X-Y-Z = кампании, адсеты и количество креативов в одном адсете. Нейминг внутри плана строится по этой структуре."
      >
        <div className="launch-plan-structure-grid">
          <label className="field">
            <span className="field__label">Кампаний (X)</span>
            <input className="auth-input" defaultValue={values.campaignsCount} min={1} name="campaignsCount" required type="number" />
          </label>
          <label className="field">
            <span className="field__label">Адсетов (Y)</span>
            <input className="auth-input" defaultValue={values.adsetsCount} min={1} name="adsetsCount" required type="number" />
          </label>
          <label className="field">
            <span className="field__label">Креативов в адсете (Z)</span>
            <input className="auth-input" defaultValue={values.creativesCount} min={1} name="creativesCount" required type="number" />
          </label>
        </div>

        <section className="summary-strip summary-strip--compact">
          <article className="summary-stat">
            <span className="summary-stat__label">Слотов</span>
            <strong className="summary-stat__value">{capacity}</strong>
            <span className="summary-stat__hint">Максимум креативов в текущей структуре</span>
          </article>
          <article className="summary-stat">
            <span className="summary-stat__label">Выбрано</span>
            <strong className="summary-stat__value">{selectedCount}</strong>
            <span className="summary-stat__hint">Креативов попадет в план</span>
          </article>
        </section>
      </SectionCard>

      <SectionCard
        title="Креативы из галереи"
        description="Сначала дизайнер загружает исходники, затем команда распределяет креативы по воронкам и формирует запуск из уже связанных креативов."
      >
        {creatives.length === 0 ? (
          <div className="empty-inline">
            <h3>Креативов пока нет</h3>
            <p>Сначала загрузите креативы в галерею или распределите их по воронкам.</p>
            <div className="hero-actions">
              <Link className="button button--secondary" href="/creatives/bulk">
                Загрузить набор
              </Link>
            </div>
          </div>
        ) : (
          <div className="launch-plan-picker">
            {groups.map((group) => (
              <div key={group.id} className="launch-plan-picker__group">
                <div className="launch-plan-picker__header">
                  <div className="launch-plan-picker__title">
                    <strong>{group.label}</strong>
                    <span>{group.creatives.length} креативов</span>
                  </div>
                  {group.id !== "unassigned" ? (
                    <div className="hero-actions">
                      <Link className="toolbar-link" href={`/approaches/${group.id}`}>
                        Открыть воронку
                      </Link>
                    </div>
                  ) : (
                    <span className="table-muted">Сначала распределите эти креативы по воронкам.</span>
                  )}
                </div>

                <div className="launch-plan-picker__grid">
                  {group.creatives.map((creative) => {
                    const preview = resolveCreativePreview({
                      name: creative.name,
                      sourceFilename: creative.sourceFilename,
                      sourceMimeType: creative.sourceMimeType,
                      thumbnailUrl: creative.thumbnailUrl,
                      previewUrl: creative.previewUrl,
                      assetUrl: creative.assetUrl,
                      sourceUrl: creative.sourceUrl,
                      driveWebViewLink: creative.driveWebViewLink,
                      driveDownloadUrl: creative.driveDownloadUrl
                    });
                    const mediaType = detectCreativeMediaType({
                      name: creative.sourceFilename ?? creative.name,
                      type: creative.sourceMimeType
                    });
                    const isVideo = mediaType === "video";

                    return (
                      <label key={creative.id} className="lp-picker-card">
                        <input
                          defaultChecked={selectedCreativeIds.has(creative.id)}
                          name="creativeId"
                          type="checkbox"
                          value={creative.id}
                        />
                        <div className="lp-picker-card__thumb">
                          <span className="lp-picker-card__indicator" />
                          <CreativePreview
                            alt={creative.name}
                            fallbackClassName="lp-picker-card__placeholder"
                            fallbackLabel="нет превью"
                            imageClassName="lp-picker-card__img"
                            videoClassName="lp-picker-card__video"
                            sources={preview.sources}
                          />
                          {isVideo ? <span className="gallery-card__video-badge">vid</span> : null}
                        </div>
                        <div className="lp-picker-card__body">
                          <span className="lp-picker-card__name">{creative.name}</span>
                          <div className="lp-picker-card__meta">
                            <StatusBadge status={creative.currentStatus} />
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="hero-actions">
        <button className="button button--primary" type="submit">
          {submitLabel}
        </button>
        <Link className="button button--secondary" href={cancelHref}>
          Отмена
        </Link>
      </div>
    </form>
  );
}
