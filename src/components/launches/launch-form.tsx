import Link from "next/link";
import { launchMetricFields, budgetModeOptions } from "@/lib/launch-taxonomy";
import { lifecycleStatusOptions } from "@/lib/creative-taxonomy";

type LanderOption = {
  id: string;
  name: string;
  url: string;
  approachId: string | null;
};

type LaunchFormValues = {
  setupName: string;
  landerId: string;
  budgetMode: string;
  lifecycleStatus: string;
  launchedAt: string;
  stoppedAt: string;
  notes: string;
  metrics: Record<string, string>;
};

type LaunchFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  creative: {
    id: string;
    name: string;
    approach: {
      name: string;
    } | null;
  };
  landers: LanderOption[];
  error?: string;
  heading: string;
  description: string;
  submitLabel: string;
  values: LaunchFormValues;
};

export function LaunchForm({
  action,
  cancelHref,
  creative,
  landers,
  error,
  heading,
  description,
  submitLabel,
  values
}: LaunchFormProps) {
  return (
    <section className="editor-layout">
      <article className="panel">
        <div className="panel-content">
          <div className="section-card__header">
            <h3>{heading}</h3>
            <p>{description}</p>
          </div>

          {error ? <div className="flash-message flash-message--error">{error}</div> : null}

          <form action={action} className="stack">
            <div className="stats-inline">
              <section className="stat-card">
                <span className="stat-label">Креатив</span>
                <strong className="stat-value stat-value--compact">{creative.name}</strong>
                <p className="stat-copy">{creative.approach?.name ?? "Без воронки"}</p>
              </section>
              <section className="stat-card">
                <span className="stat-label">Контур запуска</span>
                <strong className="stat-value stat-value--compact">Setup, режим бюджета и метрики</strong>
                <p className="stat-copy">Поля запуска и performance metrics редактируются отдельно, но в одной форме MVP.</p>
              </section>
            </div>

            <div className="form-grid">
              <div className="field">
                <label className="field__label" htmlFor="launch-setup-name">
                  Название setup
                </label>
                <input
                  className="auth-input"
                  defaultValue={values.setupName}
                  id="launch-setup-name"
                  name="setupName"
                  placeholder="Например, ABO Test 01"
                  required
                  type="text"
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="launch-lander">
                  Лендинг
                </label>
                <select className="auth-input" defaultValue={values.landerId} id="launch-lander" name="landerId">
                  <option value="">Без лендинга</option>
                  {landers.map((lander) => (
                    <option key={lander.id} value={lander.id}>
                      {lander.name}
                    </option>
                  ))}
                </select>
                <span className="field__hint">
                  Нужен новый лендинг? <Link href="/landers">Откройте список лендингов</Link>.
                </span>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="launch-budget-mode">
                  Режим бюджета
                </label>
                <select
                  className="auth-input"
                  defaultValue={values.budgetMode}
                  id="launch-budget-mode"
                  name="budgetMode"
                  required
                >
                  {budgetModeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="launch-status">
                  Lifecycle-статус
                </label>
                <select
                  className="auth-input"
                  defaultValue={values.lifecycleStatus}
                  id="launch-status"
                  name="lifecycleStatus"
                  required
                >
                  {lifecycleStatusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="launch-launched-at">
                  Дата запуска
                </label>
                <input
                  className="auth-input"
                  defaultValue={values.launchedAt}
                  id="launch-launched-at"
                  name="launchedAt"
                  required
                  type="date"
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="launch-stopped-at">
                  Дата остановки
                </label>
                <input
                  className="auth-input"
                  defaultValue={values.stoppedAt}
                  id="launch-stopped-at"
                  name="stoppedAt"
                  type="date"
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="launch-notes">
                Заметки по setup
              </label>
              <textarea
                className="auth-input textarea-input"
                defaultValue={values.notes}
                id="launch-notes"
                name="notes"
                placeholder="Короткие комментарии по запуску, гипотезе или setup."
                rows={5}
              />
            </div>

            <div className="section-card section-card--detailed section-card--muted">
              <div className="section-card__header">
                <h3>Ручной ввод метрик</h3>
                <p>Performance-поля отделены от setup-полей, чтобы было ясно, где находится operational-контекст, а где результат.</p>
              </div>

              <div className="metrics-grid">
                {launchMetricFields.map((field) => (
                  <div className="field" key={field.key}>
                    <label className="field__label" htmlFor={`metric-${field.key}`}>
                      {field.label}
                    </label>
                    <input
                      className="auth-input"
                      defaultValue={values.metrics[field.key] ?? ""}
                      id={`metric-${field.key}`}
                      name={field.key}
                      step={field.step}
                      type="number"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-actions">
              <button className="button button--primary" type="submit">
                {submitLabel}
              </button>
              <Link className="button button--secondary" href={cancelHref}>
                Отмена
              </Link>
            </div>
          </form>
        </div>
      </article>

      <aside className="stack">
        <section className="stat-card">
          <span className="stat-label">ABO / CBO</span>
          <strong className="stat-value stat-value--compact">Атрибут запуска</strong>
          <p className="stat-copy">Режим бюджета хранится на уровне запуска и дальше сможет участвовать в сравнении performance.</p>
        </section>
        <section className="stat-card">
          <span className="stat-label">Setup отдельно</span>
          <strong className="stat-value stat-value--compact">Название, даты, лендинг, notes</strong>
          <p className="stat-copy">Setup-поля не смешиваются с performance-метриками и не уезжают в Creative.</p>
        </section>
      </aside>
    </section>
  );
}
