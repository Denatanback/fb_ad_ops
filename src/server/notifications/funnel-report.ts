import { db } from "@/server/db/client";
import { sendTelegramMessageToThread } from "@/server/notifications/telegram";

type FunnelConfig = {
  key: string;
  label: string;
  envVar: string;
};

const FUNNEL_CONFIGS: FunnelConfig[] = [
  { key: "pastlife", label: "Pastlife", envVar: "TELEGRAM_TOPIC_PASTLIFE_ID" },
  { key: "soulmate", label: "Soulmate", envVar: "TELEGRAM_TOPIC_SOULMATE_ID" },
  { key: "iqtest", label: "IQTest", envVar: "TELEGRAM_TOPIC_IQTEST_ID" }
];

function parseFunnelThreadId(envVar: string): number | null {
  const value = process.env[envVar]?.trim();
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

async function buildFunnelStats(funnelKey: string) {
  const latestEntry = await db.statsEntityDaily.findFirst({
    orderBy: { date: "desc" },
    select: { date: true }
  });

  if (!latestEntry) {
    return { activeCampaignsCount: 0, activeCreativesCount: 0, totalSpend: 0, totalResults: 0 };
  }

  const latestDate = latestEntry.date;

  const [campaignEntities, adEntities] = await Promise.all([
    db.statsEntityDaily.findMany({
      where: {
        importLevel: "CAMPAIGN",
        approachName: { contains: funnelKey, mode: "insensitive" },
        date: latestDate
      },
      select: { spend: true, results: true }
    }),
    db.statsEntityDaily.findMany({
      where: {
        importLevel: "AD",
        approachName: { contains: funnelKey, mode: "insensitive" },
        date: latestDate
      },
      select: { spend: true }
    })
  ]);

  const toNum = (v: unknown) => {
    if (v == null) return 0;
    const n = typeof v === "object" && v !== null && "toNumber" in v
      ? (v as { toNumber(): number }).toNumber()
      : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const activeCampaigns = campaignEntities.filter(e => toNum(e.spend) > 0);
  const activeCreatives = adEntities.filter(e => toNum(e.spend) > 0);
  const totalSpend = activeCampaigns.reduce((s, e) => s + toNum(e.spend), 0);
  const totalResults = activeCampaigns.reduce((s, e) => s + (e.results ?? 0), 0);

  return {
    activeCampaignsCount: activeCampaigns.length,
    activeCreativesCount: activeCreatives.length,
    totalSpend,
    totalResults
  };
}

function buildFunnelMessage(label: string, stats: Awaited<ReturnType<typeof buildFunnelStats>>) {
  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Moscow"
  }).format(now);

  return [
    `📊 ${label} — сводка дня`,
    "",
    `📅 ${dateLabel}`,
    "",
    `🎯 Конверсий: ${stats.totalResults}`,
    `📢 Активных кампаний: ${stats.activeCampaignsCount}`,
    `🖼 Активных креативов: ${stats.activeCreativesCount}`,
    `💰 Спенд: ${formatCurrency(stats.totalSpend)}`
  ].join("\n");
}

export async function sendFunnelReports(): Promise<{ funnel: string; ok: boolean; skipped?: boolean }[]> {
  const results = [];

  for (const config of FUNNEL_CONFIGS) {
    const threadId = parseFunnelThreadId(config.envVar);

    if (!threadId) {
      results.push({ funnel: config.key, ok: false, skipped: true });
      continue;
    }

    const stats = await buildFunnelStats(config.key);
    const text = buildFunnelMessage(config.label, stats);
    const result = await sendTelegramMessageToThread({ text, threadId });
    results.push({ funnel: config.key, ok: result.ok });
  }

  return results;
}
