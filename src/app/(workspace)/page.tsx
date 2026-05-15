import { CampaignHierarchyTable } from "@/components/dashboard/campaign-hierarchy-table";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { PageHeader } from "@/components/workspace/page-header";
import { SectionCard } from "@/components/workspace/section-card";
import { getCampaignHierarchySnapshot } from "@/server/services/campaign-hierarchy";
import { listAdAccounts } from "@/server/services/ad-accounts";
import { db } from "@/server/db/client";

type DashboardPageProps = {
  searchParams?: {
    from?: string;
    to?: string;
    cabinetId?: string;
    ownerId?: string;
  };
};

function parseDateParam(param: string | undefined): Date | undefined {
  if (!param) return undefined;
  const d = new Date(param + "T00:00:00.000Z");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toEndOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function fmt(value: number | null | undefined, decimals = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
  }).format(value);
}

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  // ── Resolve date range (default: last 7 days including today) ──────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6);

  const fromDate = parseDateParam(searchParams?.from) ?? defaultFrom;
  const toDate = parseDateParam(searchParams?.to) ?? today;
  const cabinetId = searchParams?.cabinetId ?? "";
  const ownerId = searchParams?.ownerId ?? "";

  // ── Load filter options ────────────────────────────────────────────────────
  const [adAccounts, ownerRows] = await Promise.all([
    listAdAccounts(),
    db.adAccount.findMany({
      where: { ownerId: { not: null }, isActive: true },
      select: { ownerId: true },
      distinct: ["ownerId"],
      orderBy: { ownerId: "asc" },
    }),
  ]);

  const owners = (ownerRows as Array<{ ownerId: string | null }>).map((r) => r.ownerId as string);
  const activeAdAccounts = adAccounts.filter((a: { isActive: boolean }) => a.isActive);

  // ── Load dashboard data ────────────────────────────────────────────────────
  const snapshot = await getCampaignHierarchySnapshot({
    from: fromDate,
    to: toEndOfDay(toDate),
    adAccountId: cabinetId || undefined,
    ownerId: ownerId || undefined,
  });

  // ── Aggregate summary metrics from totals (not averages) ──────────────────
  const totalSpend = snapshot.campaigns.reduce((s, c) => s + c.spend, 0);
  const totalResults = snapshot.campaigns.reduce((s, c) => s + c.results, 0);
  const totalImpressions = snapshot.campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = snapshot.campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalCpa = totalResults > 0 ? totalSpend / totalResults : null;
  const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
  const totalCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : null;
  const campaignCount = snapshot.campaigns.length;

  // ── Date range label ───────────────────────────────────────────────────────
  const fromLabel = formatDateLabel(fromDate);
  const toLabel = formatDateLabel(toDate);
  const dateRangeLabel =
    fromDate.getTime() === toDate.getTime()
      ? fromLabel
      : `${fromLabel} — ${toLabel}`;

  const fromParam = fromDate.toISOString().slice(0, 10);
  const toParam = toDate.toISOString().slice(0, 10);

  return (
    <div className="content-frame">
      <PageHeader
        eyebrow="Дашборд"
        title="Кампании"
        description={`Период: ${dateRangeLabel}`}
      />

      <DashboardFilters
        adAccounts={activeAdAccounts}
        owners={owners}
        currentFrom={fromParam}
        currentTo={toParam}
        currentAdAccountId={cabinetId}
        currentOwnerId={ownerId}
      />

      <section className="summary-strip summary-strip--compact">
        <article className="summary-stat">
          <span className="summary-stat__label">Расход</span>
          <strong className="summary-stat__value">{fmt(totalSpend)}</strong>
          <span className="summary-stat__hint">За период</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">Результаты</span>
          <strong className="summary-stat__value">{totalResults}</strong>
          <span className="summary-stat__hint">Кампаний: {campaignCount}</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">CPA</span>
          <strong className="summary-stat__value">{fmt(totalCpa)}</strong>
          <span className="summary-stat__hint">Spend / Results</span>
        </article>
        <article className="summary-stat">
          <span className="summary-stat__label">CTR</span>
          <strong className="summary-stat__value">{fmtPct(totalCtr)}</strong>
          <span className="summary-stat__hint">CPM: {fmt(totalCpm)}</span>
        </article>
      </section>

      {snapshot.campaigns.length === 0 ? (
        <SectionCard title="Нет данных">
          <div className="empty-inline">
            <h3>Нет данных за выбранный период</h3>
            <p>
              Попробуйте выбрать другой диапазон дат или загрузите CSV через раздел{" "}
              <a href="/ad-accounts?tab=upload">Ad Accounts</a>.
            </p>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Иерархия кампаний"
          description="Campaign → Ad Set → Ad. Нажмите ▶ чтобы раскрыть уровень."
        >
          <CampaignHierarchyTable campaigns={snapshot.campaigns} />
        </SectionCard>
      )}
    </div>
  );
}
