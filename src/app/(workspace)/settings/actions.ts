"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db/client";
import { requireAuthSession } from "@/server/auth/session";
import { removeAllStoredImportFiles } from "@/server/imports/storage";

export async function resetAnalyticalDataAction() {
  const session = await requireAuthSession();

  if (session.user.role !== "admin") {
    throw new Error("Only administrators can perform a hard reset on imported data.");
  }

  // Wipe physical CSV files
  await removeAllStoredImportFiles();

  // Wipe ImportRun, which relies on Prisma Cascade to clear all:
  // - ImportRawRow
  // - ImportNormalizedRow
  // - AnalyzerComparisonGroup
  // - AnalyzerResult
  // - AlertEvent
  // - NotificationDigest
  // - NotificationDelivery
  await db.importRun.deleteMany({});

  revalidatePath("/", "layout");
}
