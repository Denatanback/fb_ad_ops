"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyImportAnalyzerFailure, runImportAnalyzer } from "@/server/analyzer/execution";
import { requireRole } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { updateImportRunStatus } from "@/server/services/import-runs";

export async function rerunImportAnalyzerAction(importRunId: string) {
  await requireRole("admin");

  const importRun = await db.importRun.findUnique({
    where: {
      id: importRunId
    },
    select: {
      id: true,
      sourceFilename: true,
      rawRowsCount: true,
      normalizedRowsCount: true,
      errorDetails: true
    }
  });

  if (!importRun) {
    redirect("/imports?status=error&reason=%D0%98%D0%BC%D0%BF%D0%BE%D1%80%D1%82%20%D0%BD%D0%B5%20%D0%BD%D0%B0%D0%B9%D0%B4%D0%B5%D0%BD");
  }

  if (!importRun.normalizedRowsCount) {
    redirect(`/imports/${importRunId}?status=error&reason=${encodeURIComponent("Для analyzer нужны нормализованные строки.")}`);
  }

  try {
    await updateImportRunStatus({
      importRunId,
      processingStatus: "ANALYZING",
      errorSummary: null,
      errorDetails: {
        ...(importRun.errorDetails && typeof importRun.errorDetails === "object" && !Array.isArray(importRun.errorDetails)
          ? (importRun.errorDetails as Record<string, unknown>)
          : {}),
        analyzer: {
          stage: "rerun"
        }
      },
      rawRowsCount: importRun.rawRowsCount,
      normalizedRowsCount: importRun.normalizedRowsCount
    });

    await runImportAnalyzer(importRunId);

    await updateImportRunStatus({
      importRunId,
      processingStatus: "COMPLETED",
      errorSummary: null,
      errorDetails: {
        ...(importRun.errorDetails && typeof importRun.errorDetails === "object" && !Array.isArray(importRun.errorDetails)
          ? (importRun.errorDetails as Record<string, unknown>)
          : {}),
        analyzer: {
          stage: "rerun_completed"
        }
      },
      rawRowsCount: importRun.rawRowsCount,
      normalizedRowsCount: importRun.normalizedRowsCount
    });

    revalidatePath("/imports");
    revalidatePath(`/imports/${importRunId}`);
    redirect(`/imports/${importRunId}?status=rerun`);
  } catch (error) {
    await updateImportRunStatus({
      importRunId,
      processingStatus: "FAILED",
      errorSummary: "Analyzer rerun failed.",
      errorDetails: {
        ...(importRun.errorDetails && typeof importRun.errorDetails === "object" && !Array.isArray(importRun.errorDetails)
          ? (importRun.errorDetails as Record<string, unknown>)
          : {}),
        analyzer: {
          stage: "rerun_failed",
          message: error instanceof Error ? error.message : "Analyzer rerun failed."
        }
      },
      rawRowsCount: importRun.rawRowsCount,
      normalizedRowsCount: importRun.normalizedRowsCount
    });

    await notifyImportAnalyzerFailure({
      importRunId,
      importRunFilename: importRun.sourceFilename,
      message: error instanceof Error ? error.message : "Analyzer rerun failed."
    });

    revalidatePath("/imports");
    revalidatePath(`/imports/${importRunId}`);
    redirect(
      `/imports/${importRunId}?status=error&reason=${encodeURIComponent(error instanceof Error ? error.message : "Analyzer rerun failed.")}`
    );
  }
}
