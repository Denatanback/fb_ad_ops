import type { PlaceholderPageCopy } from "@/lib/ui-copy";
import { EmptyState } from "@/components/workspace/empty-state";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";

export function PlaceholderPage({ copy }: { copy: PlaceholderPageCopy }) {
  return (
    <div className="content-frame">
      <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />

      <section className="section-grid">
        {copy.stats.map((item) => (
          <article className="stat-card" key={item.label}>
            <span className="stat-label">{item.label}</span>
            <strong className="stat-value stat-value--compact">{item.value}</strong>
            <p className="stat-copy">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="list-layout">
        <SectionCard title="Что важно в этом разделе" description="Основные принципы будущего operational-экрана.">
          <ul className="signal-list">
            {copy.focus.map((item) => (
              <li key={item.title}>
                <div className="item-title">
                  <span>{item.title}</span>
                </div>
                <span className="item-copy">{item.description}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Следом в реализации" description="Что органично добавится сюда на следующих шагах.">
          <ul className="check-list">
            {copy.nextSteps.map((item) => (
              <li key={item.title}>
                <div className="item-title">
                  <span>{item.title}</span>
                  <span className="pill pill--pending">дальше</span>
                </div>
                <span className="item-copy">{item.description}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </section>

      <EmptyState
        title={copy.emptyStateTitle}
        description={copy.emptyStateDescription}
        items={copy.emptyStateItems}
      />
    </div>
  );
}
