"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuthSession } from "@/server/auth/session";
import { acceptCsvImportUpload, DuplicateImportUploadError } from "@/server/imports/intake";

export async function uploadImportCsvAction(formData: FormData) {
  const session = await requireAuthSession();
  const adFile = formData.get("adFile") ?? formData.get("file");
  const adSetFile = formData.get("adSetFile");
  const campaignFile = formData.get("campaignFile");

  if (!(adFile instanceof File)) {
    redirect("/imports?status=error&reason=" + encodeURIComponent("Выберите CSV-файл объявлений (Ad level) для загрузки."));
  }

  try {
    const acceptedImport = await acceptCsvImportUpload({
      file: adFile,
      adSetFile: adSetFile instanceof File ? adSetFile : null,
      campaignFile: campaignFile instanceof File ? campaignFile : null,
      uploadedById: session.user.id
    });

    revalidatePath("/imports");
    revalidatePath(`/imports/${acceptedImport.importRun.id}`);
    redirect(`/imports/${acceptedImport.importRun.id}?status=uploaded`);
  } catch (error) {
    if (error instanceof DuplicateImportUploadError) {
      revalidatePath("/imports");
      revalidatePath(`/imports/${error.existingImportRun.id}`);
      redirect(
        `/imports/${error.existingImportRun.id}?status=duplicate&reason=${encodeURIComponent(
          "Этот CSV уже был импортирован ранее по совпадающему file hash. Повторный import, analyzer и Telegram не запускались."
        )}`
      );
    }

    redirect(
      `/imports?status=error&reason=${encodeURIComponent(
        error instanceof Error ? error.message : "Не удалось загрузить CSV-файл."
      )}`
    );
  }
}
