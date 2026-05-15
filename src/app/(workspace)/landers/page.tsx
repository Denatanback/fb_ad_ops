import { LanderCreateForm } from "@/components/landers/lander-create-form";
import { FlashMessage } from "@/components/workspace/flash-message";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { formatDateTime, formatOptionalText } from "@/lib/formatters";
import { listLanders } from "@/server/services/landers";
import { listLanderUsageSummary } from "@/server/services/launches";

type LandersPageProps = {
  searchParams?: {
    created?: string;
    error?: string;
  };
};

export default async function LandersPage({ searchParams }: LandersPageProps) {
  const [landers, summary] = await Promise.all([listLanders(), listLanderUsageSummary()]);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Справочник Lander"
        title="Лендинги"
        description="Справочник лендингов для привязки к запускам."
      />

      {searchParams?.created ? <FlashMessage message="Лендинг создан." tone="success" /> : null}
      {searchParams?.error ? <FlashMessage message={searchParams.error} tone="error" /> : null}

      <section className="hero-grid">
        <article className="panel">
          <div className="panel-content">
            <div className="section-card__header">
              <h3>Текущий каталог</h3>
              <p>Лендинги остаются отдельной сущностью: Launch ссылается на них напрямую и не дублирует базовые данные.</p>
            </div>

            <div className="stats-inline">
              <div className="stat-card">
                <span className="stat-label">Лендингов</span>
                <strong className="stat-value stat-value--compact">{summary.count}</strong>
              </div>
              <div className="stat-card">
                <span className="stat-label">Связанных запусков</span>
                <strong className="stat-value stat-value--compact">{summary.launchCount}</strong>
              </div>
            </div>
          </div>
        </article>

        <SectionCard title="Добавить лендинг" description="Нужен только URL и понятное внутреннее название.">
          <LanderCreateForm />
        </SectionCard>
      </section>

      <SectionCard title="Список лендингов" description="Компактный operational-справочник для выбора при создании и редактировании запусков.">
        {landers.length ? (
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Лендинг</th>
                  <th>URL</th>
                  <th>Запусков</th>
                  <th>Заметки</th>
                  <th>Обновлён</th>
                </tr>
              </thead>
              <tbody>
                {landers.map((lander) => (
                  <tr key={lander.id}>
                    <td>
                      <div className="table-primary">
                        <strong>{lander.name}</strong>
                        <span className="table-subcopy">{lander.approach?.name ?? "Без привязки к Approach"}</span>
                      </div>
                    </td>
                    <td className="table-muted">
                      <a className="detail-link" href={lander.url} rel="noreferrer" target="_blank">
                        {lander.url}
                      </a>
                    </td>
                    <td>{lander._count.launches}</td>
                    <td className="table-muted">{formatOptionalText(lander.notes, "Без заметки")}</td>
                    <td className="table-muted">
                      {formatDateTime(lander.updatedAt)}
                      {lander.updatedBy?.email ? <span className="table-subcopy">{lander.updatedBy.email}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <h3>Лендингов пока нет.</h3>
            <p>Добавьте первый лендинг, чтобы затем выбирать его в Launch creation.</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
