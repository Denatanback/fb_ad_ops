"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthSession } from "@/server/auth/session";
import { acceptCsvImportUpload, DuplicateImportUploadError } from "@/server/imports/intake";
import {
  createAdAccount,
  updateAdAccount,
  setAdAccountActive,
  normalizeAccountId,
  validateAccountId,
  validateTag,
} from "@/server/services/ad-accounts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as Record<string, unknown>).code === "P2002"
  );
}

function redirectToTab(tab: string, params?: Record<string, string>): never {
  const base = `/ad-accounts?tab=${tab}`;
  if (!params) redirect(base);
  const qs = new URLSearchParams(params).toString();
  redirect(`${base}&${qs}`);
}

// ---------------------------------------------------------------------------
// CSV upload (existing, re-routed from Ad Accounts)
// ---------------------------------------------------------------------------

export async function uploadImportCsvFromAdAccountsAction(formData: FormData) {
  const session = await requireAuthSession();
  const adAccountId = String(formData.get("adAccountId") ?? "").trim() || null;
  const adFile = formData.get("adFile") ?? formData.get("file");
  const adSetFile = formData.get("adSetFile");
  const campaignFile = formData.get("campaignFile");

  if (!adAccountId) {
    redirect(
      "/ad-accounts?tab=upload&status=error&reason=" +
        encodeURIComponent("Выберите рекламный кабинет перед загрузкой CSV.")
    );
  }

  if (!(adFile instanceof File)) {
    redirect(
      "/ad-accounts?tab=upload&status=error&reason=" +
        encodeURIComponent("Выберите CSV-файл объявлений (Ad level) для загрузки.")
    );
  }

  try {
    const acceptedImport = await acceptCsvImportUpload({
      file: adFile,
      adSetFile: adSetFile instanceof File ? adSetFile : null,
      campaignFile: campaignFile instanceof File ? campaignFile : null,
      uploadedById: session.user.id,
      adAccountId,
    });

    revalidatePath("/ad-accounts");
    revalidatePath("/imports");
    revalidatePath(`/imports/${acceptedImport.importRun.id}`);
    redirect(`/imports/${acceptedImport.importRun.id}?status=uploaded`);
  } catch (error) {
    if (error instanceof DuplicateImportUploadError) {
      revalidatePath("/ad-accounts");
      revalidatePath("/imports");
      revalidatePath(`/imports/${error.existingImportRun.id}`);
      redirect(
        `/imports/${error.existingImportRun.id}?status=duplicate&reason=${encodeURIComponent(
          "Этот CSV уже был импортирован ранее по совпадающему file hash. Повторный import, analyzer и Telegram не запускались."
        )}`
      );
    }

    redirect(
      `/ad-accounts?tab=upload&status=error&reason=${encodeURIComponent(
        error instanceof Error ? error.message : "Не удалось загрузить CSV-файл."
      )}`
    );
  }
}

// ---------------------------------------------------------------------------
// Ad Account CRUD
// ---------------------------------------------------------------------------

export async function createAdAccountAction(formData: FormData) {
  await requireAuthSession();

  const rawAccountId = String(formData.get("accountId") ?? "");
  const tag = String(formData.get("tag") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;

  const normalizedAccountId = normalizeAccountId(rawAccountId);

  const accountIdError = validateAccountId(normalizedAccountId);
  if (accountIdError) {
    redirectToTab("cabinets", { error: accountIdError });
  }

  const tagError = validateTag(tag);
  if (tagError) {
    redirectToTab("cabinets", { error: tagError });
  }

  try {
    await createAdAccount({ accountId: normalizedAccountId, tag, ownerId });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      redirectToTab("cabinets", {
        error: `Аккаунт с ID "${normalizedAccountId}" уже существует.`,
      });
    }
    throw error;
  }

  revalidatePath("/ad-accounts");
  redirectToTab("cabinets", { created: normalizedAccountId });
}

export async function updateAdAccountAction(formData: FormData) {
  await requireAuthSession();

  const id = String(formData.get("id") ?? "");
  const tag = String(formData.get("tag") ?? "").trim();
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null;

  if (!id) redirectToTab("cabinets", { error: "Не указан ID кабинета." });

  const tagError = validateTag(tag);
  if (tagError) {
    redirectToTab("cabinets", { edit: id, error: tagError });
  }

  await updateAdAccount(id, { tag, ownerId });

  revalidatePath("/ad-accounts");
  redirectToTab("cabinets", { updated: id });
}

export async function activateAdAccountAction(formData: FormData) {
  await requireAuthSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirectToTab("cabinets", { error: "Не указан ID кабинета." });

  await setAdAccountActive(id, true);
  revalidatePath("/ad-accounts");
  redirectToTab("cabinets");
}

export async function deactivateAdAccountAction(formData: FormData) {
  await requireAuthSession();
  const id = String(formData.get("id") ?? "");
  if (!id) redirectToTab("cabinets", { error: "Не указан ID кабинета." });

  await setAdAccountActive(id, false);
  revalidatePath("/ad-accounts");
  redirectToTab("cabinets");
}
