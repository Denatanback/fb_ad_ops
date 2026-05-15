import Link from "next/link";
import { OperationalCreativesTable } from "@/components/operations/operational-creatives-table";
import { OperationalFilters } from "@/components/operations/operational-filters";
import { OperationalSummaryCards } from "@/components/operations/operational-summary-cards";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import type { OperationalSortValue, OperationalViewData, OperationalViewKey } from "@/server/services/operations";

type ApproachOption = {
  id: string;
  name: string;
};

const operationalViewCopy: Record<
  OperationalViewKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    panelTitle: string;
    panelDescription: string;
    thirdStatLabel: string;
    primaryAction: {
      href: string;
      label: string;
    };
    secondaryAction: {
      href: string;
      label: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    tableTitle: string;
    tableDescription: string;
  }
> = {
  queue: {
    eyebrow: "Операционный поток",
    title: "Queue",
    description: "Компактный список креативов в очереди: что запускать следующим, где нужен первый запуск и к каким подходам стоит вернуться сегодня.",
    panelTitle: "Что важно в очереди",
    panelDescription: "Экран помогает быстро понять, какие креативы уже готовы к движению, у каких есть история запусков и где не хватает базового следующего шага.",
    thirdStatLabel: "С историей запусков",
    primaryAction: {
      href: "/creatives/new",
      label: "Добавить креатив"
    },
    secondaryAction: {
      href: "/approaches",
      label: "Открыть approaches"
    },
    emptyTitle: "Очередь сейчас пустая.",
    emptyDescription: "Добавьте новый креатив или переведите существующий в queue, чтобы планировать следующий запуск прямо отсюда.",
    tableTitle: "Креативы в очереди",
    tableDescription: "Список для ежедневного планирования: подход, метки, история запусков и базовые operational-сигналы."
  },
  active: {
    eyebrow: "Операционный поток",
    title: "Active",
    description: "Рабочий срез того, что живёт сейчас: последний запуск, бюджетный режим, лендер, свежие метрики и простые сигналы внимания без тяжёлого дашборда.",
    panelTitle: "Что важно в active",
    panelDescription: "Фокус на текущем live-контуре: виден последний запуск, свежий срез метрик и места, где команде стоит быстро перепроверить ситуацию.",
    thirdStatLabel: "Со свежими метриками",
    primaryAction: {
      href: "/imports",
      label: "Проверить импорты"
    },
    secondaryAction: {
      href: "/creatives",
      label: "Все креативы"
    },
    emptyTitle: "Сейчас нет активных креативов.",
    emptyDescription: "Когда креативы перейдут в active, здесь появится live-список с последними запусками, лендерами и метриками.",
    tableTitle: "Активные креативы",
    tableDescription: "Практичный live-список для ежедневной проверки: запуск, ABO / CBO, лендер, свежий metrics snapshot и сигналы внимания."
  },
  scaling: {
    eyebrow: "Операционный поток",
    title: "Scaling",
    description: "Фаза масштаба без декоративного шума: текущий контекст запуска, метки, свежие метрики и понятные рабочие сигналы для продолжения роста.",
    panelTitle: "Что важно в scaling",
    panelDescription: "Экран собирает креативы, уже переведённые в scaling, чтобы команда видела текущий контекст запуска и могла быстро оценить следующий шаг.",
    thirdStatLabel: "Со свежими метриками",
    primaryAction: {
      href: "/creatives",
      label: "Открыть библиотеку"
    },
    secondaryAction: {
      href: "/imports",
      label: "Последние импорты"
    },
    emptyTitle: "В scaling пока ничего нет.",
    emptyDescription: "Когда креативы перейдут в фазу масштаба, здесь появится рабочий список с последним контекстом запусков и свежими сигналами.",
    tableTitle: "Креативы в scaling",
    tableDescription: "Компактный список для контроля масштаба: метки, история запусков, ABO / CBO и последние метрики по каждому креативу."
  }
};

export function OperationalWorkspaceView({
  view,
  data,
  approaches,
  values
}: {
  view: OperationalViewKey;
  data: OperationalViewData;
  approaches: ApproachOption[];
  values: {
    query: string;
    approachId: string;
    label: string;
    sort: OperationalSortValue;
  };
}) {
  const copy = operationalViewCopy[view];
  const thirdStatValue = view === "queue" ? data.withLaunchCount : data.withMetricsCount;

  return (
    <div className="content-frame">
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <OperationalSummaryCards currentView={view} latestImport={data.latestImport} statusCounts={data.statusCounts} />

      <section className="hero-grid">
        <article className="panel">
          <div className="panel-content">
            <div className="section-card__header">
              <h3>{copy.panelTitle}</h3>
              <p>{copy.panelDescription}</p>
            </div>

            <div className="operational-stats-grid">
              <article className="stat-card">
                <span className="stat-label">Всего в этом потоке</span>
                <strong className="stat-value stat-value--compact">{data.creatives.length}</strong>
                <p className="stat-copy">Список уже учитывает выбранные фильтры.</p>
              </article>
              <article className="stat-card">
                <span className="stat-label">Требуют внимания</span>
                <strong className="stat-value stat-value--compact">{data.attentionCount}</strong>
                <p className="stat-copy">Простые operational-сигналы без отдельного BI-слоя.</p>
              </article>
              <article className="stat-card">
                <span className="stat-label">{copy.thirdStatLabel}</span>
                <strong className="stat-value stat-value--compact">{thirdStatValue}</strong>
                <p className="stat-copy">Помогает понять, сколько карточек уже готовы к следующему решению.</p>
              </article>
            </div>
          </div>
        </article>

        <SectionCard title="Быстрые действия" description="Короткие переходы для ежедневной работы без лишней навигации.">
          <div className="stack">
            <Link className="button button--primary" href={copy.primaryAction.href}>
              {copy.primaryAction.label}
            </Link>
            <Link className="button button--secondary" href={copy.secondaryAction.href}>
              {copy.secondaryAction.label}
            </Link>
            <p className="stat-copy">Архивные креативы остаются в библиотеке и учитываются в карточке `Stopped` сверху.</p>
          </div>
        </SectionCard>
      </section>

      <SectionCard title="Фильтры" description="Поиск по креативам, срез по approach и меткам, плюс рабочая сортировка без перегрузки интерфейса.">
        <OperationalFilters action={`/${view}`} approaches={approaches} values={values} />
      </SectionCard>

      <SectionCard title={copy.tableTitle} description={copy.tableDescription}>
        {data.creatives.length ? (
          <OperationalCreativesTable rows={data.creatives} view={view} />
        ) : (
          <div className="empty-inline">
            <h3>{copy.emptyTitle}</h3>
            <p>{copy.emptyDescription}</p>
            <div className="hero-actions">
              <Link className="button button--primary" href={copy.primaryAction.href}>
                {copy.primaryAction.label}
              </Link>
              <Link className="button button--secondary" href={`/${view}`}>
                Сбросить фильтры
              </Link>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
