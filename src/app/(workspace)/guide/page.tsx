import Link from "next/link";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { SettingsSectionNav } from "@/components/workspace/settings-section-nav";
import { guideRelations, guideSections, guideStatuses, guideWorkflow } from "@/lib/ui-copy";

export default function GuidePage() {
  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Гид"
        title="Контекст системы"
        description="Рабочая памятка по сущностям, статусам и ежедневному потоку. Читать один раз, держать под рукой."
      />

      <SettingsSectionNav activeHref="/guide" />

      {/* Entities */}
      <SectionCard
        title="Основные сущности"
        description="Approach — верхний слой. Creative принадлежит одному Approach. Запуски и метрики живут отдельно."
      >
        <div className="guide-entities">
          {guideSections.map((item) => (
            <div className="guide-entity" key={item.title}>
              <strong className="guide-entity__name">{item.title}</strong>
              <p className="guide-entity__desc">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="settings-layout">
        {/* Workflow */}
        <div className="settings-layout__main">
          <SectionCard title="Базовый workflow" description="Путь от идеи до анализа.">
            <ol className="guide-steps">
              {guideWorkflow.map((item, i) => (
                <li key={item.title} className="guide-step">
                  <span className="guide-step__num">{i + 1}</span>
                  <div className="guide-step__body">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        {/* Statuses */}
        <div className="settings-layout__side">
          <SectionCard title="Lifecycle-статусы" description="Что означает каждая фаза.">
            <ul className="guide-status-list">
              {guideStatuses.map((item) => (
                <li key={item.title} className="guide-status-item">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      {/* Relations */}
      <SectionCard title="Связи сущностей" description="Как домен собран сейчас.">
        <div className="guide-entities">
          {guideRelations.map((item) => (
            <div className="guide-entity" key={item.title}>
              <strong className="guide-entity__name">{item.title}</strong>
              <p className="guide-entity__desc">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Quick navigation */}
      <SectionCard title="Быстрый переход">
        <nav className="settings-links">
          {[
            { href: "/approaches", label: "Воронки", hint: "Подходы и гипотезы" },
            { href: "/creatives/gallery", label: "Галерея", hint: "Все загруженные креативы" },
            { href: "/launch-plans", label: "План запусков", hint: "Нейминги для FB Ads" },
            { href: "/imports", label: "Импорты", hint: "История загруженных CSV" },
            { href: "/admin/analyzer-rules", label: "Правила анализатора", hint: "Пороги и guardrails" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="settings-link">
              <span className="settings-link__label">{l.label}</span>
              <span className="settings-link__hint">{l.hint}</span>
            </Link>
          ))}
        </nav>
      </SectionCard>
    </div>
  );
}
