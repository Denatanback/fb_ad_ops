import { NextResponse } from "next/server";
import { sendDailyReport } from "@/server/notifications/daily-report";
import { sendFunnelReports } from "@/server/notifications/funnel-report";

export async function POST() {
  try {
    const [dailyResult, funnelResults] = await Promise.allSettled([
      sendDailyReport(),
      sendFunnelReports()
    ]);

    return NextResponse.json({
      ok: true,
      daily: dailyResult.status === "fulfilled" ? dailyResult.value : { error: String(dailyResult.reason) },
      funnels: funnelResults.status === "fulfilled" ? funnelResults.value : { error: String(funnelResults.reason) }
    });
  } catch (error) {
    console.error("Daily report send error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
