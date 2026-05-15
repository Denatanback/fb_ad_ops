"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import { runTelegramDigestQueueCycle } from "@/server/notifications/digests";
import { parseTelegramDestination } from "@/server/notifications/telegram-routing";
import { buildTelegramTestMessage, sendTelegramMessage } from "@/server/notifications/telegram";
import { sendDailyReport } from "@/server/notifications/daily-report";
import { sendFunnelReports } from "@/server/notifications/funnel-report";
import {
  getAllowedTelegramDigestIntervals,
  updateTelegramDigestIntervalMinutes,
  updateTelegramActiveTopics,
  type TelegramDigestIntervalMinutes
} from "@/server/services/system-settings";

function parseDigestIntervalMinutes(value: FormDataEntryValue | null): TelegramDigestIntervalMinutes | null {
  const numericValue = Number(String(value ?? ""));

  if (getAllowedTelegramDigestIntervals().includes(numericValue as TelegramDigestIntervalMinutes)) {
    return numericValue as TelegramDigestIntervalMinutes;
  }

  return null;
}

export async function sendTelegramTestAction(formData: FormData) {
  const session = await requireRole("admin");
  const actor = session.user.email ?? session.user.name ?? "admin";
  const destination = parseTelegramDestination(
    String(formData.get("destination") ?? ""),
    String(formData.get("needsReviewReasonCode") ?? "")
  );

  if (!destination) {
    redirect("/admin/notifications?status=error&reason=invalid_destination");
  }

  let redirectUrl: string;

  try {
    const result = await sendTelegramMessage({
      text: buildTelegramTestMessage(actor, destination),
      destination
    });

    if (result.skipped) {
      redirectUrl = `/admin/notifications?status=skipped&reason=${encodeURIComponent(result.reason)}&destination=${encodeURIComponent(destination.topic)}`;
    } else {
      const searchParams = new URLSearchParams({
        status: "sent",
        destination: destination.topic
      });

      if (destination.topic === "needs_review" && destination.reasonCode) {
        searchParams.set("reasonCode", destination.reasonCode);
      }

      redirectUrl = `/admin/notifications?${searchParams.toString()}`;
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Не удалось отправить тестовое уведомление.";
    redirectUrl = `/admin/notifications?status=error&reason=${encodeURIComponent(reason)}&destination=${encodeURIComponent(destination.topic)}`;
  }

  redirect(redirectUrl);
}

export async function updateTelegramDigestIntervalAction(formData: FormData) {
  const session = await requireRole("admin");
  const digestIntervalMinutes = parseDigestIntervalMinutes(formData.get("digestIntervalMinutes"));

  if (!digestIntervalMinutes) {
    redirect("/admin/notifications?status=error&reason=" + encodeURIComponent("Выберите корректный digest interval."));
  }

  await updateTelegramDigestIntervalMinutes(digestIntervalMinutes, session.user.id);
  revalidatePath("/admin/notifications");
  redirect(`/admin/notifications?status=interval_updated&interval=${digestIntervalMinutes}`);
}

export async function sendTelegramDigestsNowAction() {
  await requireRole("admin");

  let redirectUrl: string;

  try {
    const result = await runTelegramDigestQueueCycle(new Date(), { force: true });

    // Also send the daily report and funnel reports
    let reportSent = false;
    try {
      const [reportResult, funnelResults] = await Promise.allSettled([
        sendDailyReport(),
        sendFunnelReports()
      ]);
      reportSent = reportResult.status === "fulfilled" && reportResult.value.ok === true;
      const funnelSentCount = funnelResults.status === "fulfilled"
        ? funnelResults.value.filter(r => r.ok).length
        : 0;
      reportSent = reportSent || funnelSentCount > 0;
    } catch {
      // Report sending is best-effort, don't fail the whole action
    }

    revalidatePath("/admin/notifications");
    const totalSent = result.sentCount + (reportSent ? 1 : 0);
    redirectUrl = `/admin/notifications?status=cycle_sent&sent=${totalSent}&built=${result.builtCount}&queued=${result.queuedAlertsCount}`;
  } catch (error) {
    redirectUrl = `/admin/notifications?status=error&reason=${encodeURIComponent(
      error instanceof Error ? error.message : "Не удалось запустить digest cycle."
    )}`;
  }

  redirect(redirectUrl);
}

export async function updateTelegramActiveTopicsAction(formData: FormData) {
  const session = await requireRole("admin");
  const topics = formData.getAll("activeTopics").map(String);

  await updateTelegramActiveTopics(topics, session.user.id);
  revalidatePath("/admin/notifications");
  redirect("/admin/notifications?status=topics_updated");
}
