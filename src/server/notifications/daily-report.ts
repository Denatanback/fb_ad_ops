import { db } from "@/server/db/client";
import { sendTelegramMessage } from "@/server/notifications/telegram";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "$0.00";
  return `$${Number(value).toFixed(2)}`;
}

const toNum = (v: unknown): number => {
  if (v == null) return 0;
  const n = typeof v === "object" && v !== null && "toNumber" in v
    ? (v as { toNumber(): number }).toNumber()
    : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function buildDailyReportMessage() {
  const now = new Date();

  let activeCampaignsCount = 0;
  let activeCreativesCount = 0;
  let dailyConversions = 0;
  let dailySpend = 0;

  const latestEntry = await db.statsEntityDaily.findFirst({
    orderBy: { date: "desc" },
    select: { date: true }
  });

  if (latestEntry) {
    const latestDate = latestEntry.date;

    const [campaignEntities, adEntities] = await Promise.all([
      db.statsEntityDaily.findMany({
        where: { importLevel: "CAMPAIGN", date: latestDate, campaignName: { not: null } },
        select: { campaignName: true, spend: true, results: true }
      }),
      db.statsEntityDaily.findMany({
        where: { importLevel: "AD", date: latestDate, adName: { not: null } },
        select: { adName: true, spend: true }
      })
    ]);

    const activeCampaigns = campaignEntities.filter(e => toNum(e.spend) > 0);
    const activeCreatives = adEntities.filter(e => toNum(e.spend) > 0);

    activeCampaignsCount = new Set(activeCampaigns.map(e => e.campaignName)).size;
    activeCreativesCount = new Set(activeCreatives.map(e => e.adName)).size;
    dailyConversions = activeCampaigns.reduce((s, e) => s + (e.results ?? 0), 0);
    dailySpend = activeCampaigns.reduce((s, e) => s + toNum(e.spend), 0);
  }

  const dateLabel = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Moscow"
  }).format(now);

  return [
    "📊 FB Ads Ops — Ежедневный отчёт",
    "",
    `📅 ${dateLabel}`,
    "",
    `▸ Активных кампаний: ${activeCampaignsCount}`,
    `▸ Активных креативов: ${activeCreativesCount}`,
    `▸ Конверсий (день): ${dailyConversions}`,
    `▸ Текущий спенд (день): ${formatCurrency(dailySpend)}`,
  ].join("\n");
}

export async function sendDailyReport() {
  const messageText = await buildDailyReportMessage();

  return sendTelegramMessage({
    text: messageText,
    destination: {
      topic: "reports"
    }
  });
}
