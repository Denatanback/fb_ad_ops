"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/session";
import { createDriveFolder, deleteDriveFile } from "@/server/integrations/google-drive/service";

export async function createDriveFolderAction(name: string, parentFolderId?: string | null): Promise<{ ok: boolean; message: string; folderId?: string }> {
  await requireRole("admin");

  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, message: "Название папки не может быть пустым." };
  }

  const folder = await createDriveFolder(trimmed, parentFolderId);

  if (!folder) {
    return { ok: false, message: "Не удалось создать папку в Google Drive." };
  }

  revalidatePath("/admin/google-drive/folders");
  return { ok: true, message: `Папка «${folder.name}» создана.`, folderId: folder.id };
}

export async function deleteDriveFolderAction(folderId: string): Promise<{ ok: boolean; message: string }> {
  await requireRole("admin");

  if (!folderId) {
    return { ok: false, message: "Не указан ID папки." };
  }

  const ok = await deleteDriveFile(folderId);

  if (!ok) {
    return { ok: false, message: "Не удалось удалить папку из Google Drive." };
  }

  revalidatePath("/admin/google-drive/folders");
  return { ok: true, message: "Папка удалена." };
}
