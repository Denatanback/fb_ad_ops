"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import {
  acceptBulkHistoricalCsvImport,
  BulkHistoricalImportValidationError
} from "@/server/imports/bulk-historical";

function optionalFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File)) return null;
  if (!value.size || !value.name.trim()) return null;
  return value;
}

export async function uploadBulkHistoricalCsvAction(formData: FormData) {
  const session = await requireRole("admin");
  const adAccountId = String(formData.get("adAccountId") ?? "").trim();

  if (!adAccountId) {
    redirect(
      `/admin/bulk-imports?status=error&reason=${encodeURIComponent("Select a cabinet before uploading bulk CSV.")}`
    );
  }

  let result: Awaited<ReturnType<typeof acceptBulkHistoricalCsvImport>>;

  try {
    result = await acceptBulkHistoricalCsvImport({
      adAccountId,
      uploadedById: session.user.id,
      campaignFile: optionalFile(formData.get("campaignFile")),
      adSetFile: optionalFile(formData.get("adSetFile")),
      adFile: optionalFile(formData.get("adFile"))
    });
  } catch (error) {
    const message =
      error instanceof BulkHistoricalImportValidationError || error instanceof Error
        ? error.message
        : "Bulk CSV upload failed.";

    redirect(`/admin/bulk-imports?status=error&reason=${encodeURIComponent(message)}`);
  }

  revalidatePath("/");
  revalidatePath("/imports");
  revalidatePath("/ad-accounts");
  revalidatePath("/admin/bulk-imports");
  revalidatePath(`/imports/${result.importRunId}`);

  redirect(
    `/admin/bulk-imports?status=uploaded&rows=${result.normalizedRowsCount}&replaced=${result.replacedRowsCount}`
  );
}
