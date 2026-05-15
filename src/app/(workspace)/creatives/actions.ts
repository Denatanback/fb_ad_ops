"use server";

import { Buffer } from "node:buffer";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseCreativeLabelValues, parseLifecycleStatus } from "@/lib/creative-taxonomy";
import { requireAuthSession } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { getGoogleDriveConnectedIntegration, uploadFileToGoogleDrive, resolveGoogleDriveAccessToken, listDriveFolders } from "@/server/integrations/google-drive/service";
import { buildInitialCreativeNameFromFilename, detectCreativeMediaType } from "@/server/services/creative-media";

const MAX_CREATIVE_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

type ResolvedCreativePayload = {
  name: string;
  approachId: string | null;
  type: string | null;
  notes: string | null;
  assetUrl: string | null;
  previewUrl: string | null;
  sourceUrl: string | null;
  driveFileId: string | null;
  driveWebViewLink: string | null;
  driveDownloadUrl: string | null;
  driveFolderId: string | null;
  driveFolderName: string | null;
  thumbnailUrl: string | null;
  sourceFilename: string | null;
  sourceMimeType: string | null;
  sourceByteSize: number | null;
  currentStatus: "QUEUE" | "ACTIVE" | "STOPPED" | "SCALING";
  labels: Array<{
    id: string;
  }>;
};

type UploadedCreativeMedia = {
  driveFileId: string;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  filename: string;
  mimeType: string;
  byteSize: number;
} | null;

export type BulkCreativeUploadState = {
  status: "idle" | "success" | "error";
  summary: {
    totalFiles: number;
    createdCount: number;
    failedCount: number;
  };
  items: Array<{
    filename: string;
    creativeId: string | null;
    creativeName: string | null;
    mediaType: "video" | "static" | "unknown";
    outcome: "created" | "failed";
    message: string;
  }>;
  message: string | null;
};

function createInitialBulkCreativeUploadState(): BulkCreativeUploadState {
  return {
    status: "idle",
    summary: {
      totalFiles: 0,
      createdCount: 0,
      failedCount: 0
    },
    items: [],
    message: null
  };
}

function normalizeTextValue(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function normalizeOptionalUrl(value: FormDataEntryValue | null, fieldLabel: string) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    throw new Error(`Поле «${fieldLabel}» должно содержать корректный URL.`);
  }
}

function normalizeOptionalInteger(value: FormDataEntryValue | null, fieldLabel: string) {
  const normalized = normalizeTextValue(value);

  if (!normalized) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Поле «${fieldLabel}» должно содержать неотрицательное целое число.`);
  }

  return parsed;
}

async function uploadCreativeSourceFile(fileEntry: File, folderId?: string | null): Promise<UploadedCreativeMedia> {
  if (fileEntry.size > MAX_CREATIVE_FILE_SIZE) {
    throw new Error(`Файл «${fileEntry.name}» слишком большой (${(fileEntry.size / 1024 / 1024).toFixed(1)} МБ). Максимум: ${MAX_CREATIVE_FILE_SIZE / 1024 / 1024} МБ.`);
  }

  const integration = await getGoogleDriveConnectedIntegration();

  if (!integration?.refreshToken && !integration?.accessToken) {
    throw new Error("Google Drive не подключён. Сначала подключите его в админ-разделе.");
  }

  const filename = fileEntry.name.trim() || `creative-upload-${Date.now()}`;
  const mimeType = fileEntry.type.trim() || "application/octet-stream";
  const content = Buffer.from(await fileEntry.arrayBuffer());

  return uploadFileToGoogleDrive({
    filename,
    mimeType,
    content,
    folderId: folderId ?? undefined
  });
}

async function uploadCreativeFileIfPresent(formData: FormData) {
  const fileEntry = formData.get("driveUploadFile");

  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return null;
  }

  const folderId = normalizeTextValue(formData.get("driveFolderId"));
  return uploadCreativeSourceFile(fileEntry, folderId);
}

async function resolveCreativePayload(formData: FormData): Promise<ResolvedCreativePayload> {
  const name = normalizeTextValue(formData.get("name"));
  const approachId = normalizeTextValue(formData.get("approachId"));
  const type = normalizeTextValue(formData.get("type"));
  const notes = normalizeTextValue(formData.get("notes"));
  const statusOption = parseLifecycleStatus(normalizeTextValue(formData.get("currentStatus")));
  const labelKeys = parseCreativeLabelValues(formData.getAll("labels").map((value) => String(value)));
  const assetUrl = normalizeOptionalUrl(formData.get("assetUrl"), "Ссылка на asset");
  const previewUrl = normalizeOptionalUrl(formData.get("previewUrl"), "Ссылка на preview");
  const sourceUrl = normalizeOptionalUrl(formData.get("sourceUrl"), "Ссылка на original/source");
  const driveFileId = normalizeTextValue(formData.get("driveFileId"));
  const driveWebViewLink = normalizeOptionalUrl(formData.get("driveWebViewLink"), "Ссылка просмотра Google Drive");
  const driveDownloadUrl = normalizeOptionalUrl(formData.get("driveDownloadUrl"), "Ссылка скачивания Google Drive");
  const thumbnailUrl = normalizeOptionalUrl(formData.get("thumbnailUrl"), "Ссылка на thumbnail/poster");
  const sourceFilename = normalizeTextValue(formData.get("sourceFilename"));
  const sourceMimeType = normalizeTextValue(formData.get("sourceMimeType"));
  const sourceByteSize = normalizeOptionalInteger(formData.get("sourceByteSize"), "Размер файла в байтах");
  const driveFolderId = normalizeTextValue(formData.get("driveFolderId"));

  if (!name) {
    throw new Error("Укажите название креатива.");
  }

  if (!statusOption) {
    throw new Error("Укажите корректный lifecycle-статус.");
  }

  let approach = null;
  if (approachId) {
    approach = await db.approach.findUnique({
      where: {
        id: approachId
      },
      select: {
        id: true
      }
    });

    if (!approach) {
      throw new Error("Выбранный подход не найден.");
    }
  }

  const labels =
    labelKeys.length === 0
      ? []
      : await db.creativeLabel.findMany({
          where: {
            key: {
              in: labelKeys
            }
          },
          select: {
            id: true,
            key: true
          }
        });

  if (labels.length !== labelKeys.length) {
    throw new Error("Часть выбранных меток не найдена.");
  }

  // Resolve folder name if a folder ID is provided
  let driveFolderName: string | null = null;
  if (driveFolderId) {
    const folders = await listDriveFolders().catch(() => []);
    driveFolderName = folders.find((f) => f.id === driveFolderId)?.name ?? null;
  }

  return {
    name,
    approachId,
    type,
    notes,
    assetUrl,
    previewUrl,
    sourceUrl,
    driveFileId,
    driveWebViewLink,
    driveDownloadUrl,
    driveFolderId,
    driveFolderName,
    thumbnailUrl,
    sourceFilename,
    sourceMimeType,
    sourceByteSize,
    currentStatus: statusOption.dbValue,
    labels
  };
}

function applyUploadedMediaFallbacks(payload: ResolvedCreativePayload, uploadedMedia: UploadedCreativeMedia): ResolvedCreativePayload {
  if (!uploadedMedia) {
    return payload;
  }

  return {
    ...payload,
    driveFileId: uploadedMedia.driveFileId,
    driveWebViewLink: uploadedMedia.webViewLink,
    driveDownloadUrl: uploadedMedia.webContentLink,
    sourceFilename: uploadedMedia.filename,
    sourceMimeType: uploadedMedia.mimeType,
    sourceByteSize: uploadedMedia.byteSize,
    sourceUrl: payload.sourceUrl ?? uploadedMedia.webViewLink ?? uploadedMedia.webContentLink,
    assetUrl: payload.assetUrl ?? uploadedMedia.webContentLink ?? uploadedMedia.webViewLink,
    previewUrl: payload.previewUrl ?? uploadedMedia.webContentLink ?? uploadedMedia.webViewLink,
    thumbnailUrl: payload.thumbnailUrl ?? uploadedMedia.thumbnailLink
  };
}

async function createCreativeRecord(payload: ResolvedCreativePayload, userId: string) {
  return db.creative.create({
    data: {
      name: payload.name,
      approachId: payload.approachId,
      type: payload.type,
      notes: payload.notes,
      assetUrl: payload.assetUrl,
      previewUrl: payload.previewUrl,
      sourceUrl: payload.sourceUrl,
      driveFileId: payload.driveFileId,
      driveWebViewLink: payload.driveWebViewLink,
      driveDownloadUrl: payload.driveDownloadUrl,
      driveFolderId: payload.driveFolderId,
      driveFolderName: payload.driveFolderName,
      thumbnailUrl: payload.thumbnailUrl,
      sourceFilename: payload.sourceFilename,
      sourceMimeType: payload.sourceMimeType,
      sourceByteSize: payload.sourceByteSize,
      currentStatus: payload.currentStatus,
      createdById: userId,
      updatedById: userId,
      labelAssignments: payload.labels.length
        ? {
            create: payload.labels.map((label) => ({
              creativeLabelId: label.id,
              assignedById: userId
            }))
          }
        : undefined
    },
    select: {
      id: true,
      name: true
    }
  });
}

async function resolveBulkSharedContext(formData: FormData) {
  const approachId = normalizeTextValue(formData.get("approachId"));
  const statusOption = parseLifecycleStatus(normalizeTextValue(formData.get("currentStatus")));

  let approach = null;
  if (approachId) {
    approach = await db.approach.findUnique({
      where: {
        id: approachId
      },
      select: {
        id: true
      }
    });

    if (!approach) {
      throw new Error("Выбранный подход не найден.");
    }
  }

  if (!statusOption) {
    throw new Error("Укажите корректный lifecycle-статус.");
  }

  return {
    approachId: approachId || null,
    currentStatus: statusOption.dbValue
  };
}

function buildBulkCreativePayload(
  sharedContext: Awaited<ReturnType<typeof resolveBulkSharedContext>>,
  file: File,
  detectedType: "video" | "static",
  driveFolderId: string | null,
  driveFolderName: string | null
): ResolvedCreativePayload {
  return {
    name: buildInitialCreativeNameFromFilename(file.name),
    approachId: sharedContext.approachId,
    type: detectedType,
    notes: null,
    assetUrl: null,
    previewUrl: null,
    sourceUrl: null,
    driveFileId: null,
    driveWebViewLink: null,
    driveDownloadUrl: null,
    driveFolderId,
    driveFolderName,
    thumbnailUrl: null,
    sourceFilename: file.name.trim() || null,
    sourceMimeType: file.type.trim() || null,
    sourceByteSize: file.size || null,
    currentStatus: sharedContext.currentStatus,
    labels: []
  };
}

function redirectToCreateWithError(message: string): never {
  redirect(`/creatives/new?error=${encodeURIComponent(message)}`);
}

function redirectToEditWithError(creativeId: string, message: string): never {
  redirect(`/creatives/${creativeId}/edit?error=${encodeURIComponent(message)}`);
}

export async function createCreativeAction(formData: FormData) {
  const session = await requireAuthSession();

  let payload: ResolvedCreativePayload;
  let uploadedMedia: UploadedCreativeMedia;

  try {
    payload = await resolveCreativePayload(formData);
    uploadedMedia = await uploadCreativeFileIfPresent(formData);
  } catch (error) {
    redirectToCreateWithError(error instanceof Error ? error.message : "Не удалось создать креатив.");
  }

  payload = applyUploadedMediaFallbacks(payload, uploadedMedia);

  try {
    const creative = await createCreativeRecord(payload, session.user.id);

    revalidatePath("/approaches");
    revalidatePath("/creatives");
    revalidatePath(`/creatives/${creative.id}`);
    redirect(`/creatives/${creative.id}?created=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirectToCreateWithError("Не удалось сохранить связи креатива.");
    }

    throw error;
  }
}

export async function updateCreativeAction(creativeId: string, formData: FormData) {
  const session = await requireAuthSession();

  const existingCreative = await db.creative.findUnique({
    where: {
      id: creativeId
    },
    select: {
      id: true
    }
  });

  if (!existingCreative) {
    redirect("/creatives?error=Креатив%20не%20найден");
  }

  let payload: ResolvedCreativePayload;
  let uploadedMedia: UploadedCreativeMedia;

  try {
    payload = await resolveCreativePayload(formData);
    uploadedMedia = await uploadCreativeFileIfPresent(formData);
  } catch (error) {
    redirectToEditWithError(creativeId, error instanceof Error ? error.message : "Не удалось обновить креатив.");
  }

  payload = applyUploadedMediaFallbacks(payload, uploadedMedia);

  await db.$transaction(async (tx) => {
    await tx.creative.update({
      where: {
        id: creativeId
      },
      data: {
        name: payload.name,
        approachId: payload.approachId,
        type: payload.type,
        notes: payload.notes,
        assetUrl: payload.assetUrl,
        previewUrl: payload.previewUrl,
        sourceUrl: payload.sourceUrl,
        driveFileId: payload.driveFileId,
        driveWebViewLink: payload.driveWebViewLink,
        driveDownloadUrl: payload.driveDownloadUrl,
        thumbnailUrl: payload.thumbnailUrl,
        sourceFilename: payload.sourceFilename,
        sourceMimeType: payload.sourceMimeType,
        sourceByteSize: payload.sourceByteSize,
        currentStatus: payload.currentStatus,
        updatedById: session.user.id
      }
    });

    await tx.creativeLabelAssignment.deleteMany({
      where: {
        creativeId
      }
    });

    if (payload.labels.length) {
      await tx.creativeLabelAssignment.createMany({
        data: payload.labels.map((label) => ({
          creativeId,
          creativeLabelId: label.id,
          assignedById: session.user.id
        }))
      });
    }
  });

  revalidatePath("/approaches");
  revalidatePath("/creatives");
  revalidatePath(`/creatives/${creativeId}`);
  revalidatePath(`/creatives/${creativeId}/edit`);
  redirect(`/creatives/${creativeId}?updated=1`);
}

export async function bulkUploadCreativesAction(
  _previousState: BulkCreativeUploadState,
  formData: FormData
): Promise<BulkCreativeUploadState> {
  const session = await requireAuthSession();

  let sharedContext: Awaited<ReturnType<typeof resolveBulkSharedContext>>;

  try {
    sharedContext = await resolveBulkSharedContext(formData);
  } catch (error) {
    return {
      ...createInitialBulkCreativeUploadState(),
      status: "error",
      message: error instanceof Error ? error.message : "Не удалось подготовить batch upload."
    };
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!files.length) {
    return {
      ...createInitialBulkCreativeUploadState(),
      status: "error",
      message: "Выберите хотя бы один файл для batch upload."
    };
  }

  const integration = await getGoogleDriveConnectedIntegration();

  if (!integration?.refreshToken && !integration?.accessToken) {
    return {
      ...createInitialBulkCreativeUploadState(),
      status: "error",
      message: "Для batch upload файлов сначала подключите Google Drive в админ-разделе."
    };
  }

  const items: BulkCreativeUploadState["items"] = [];
  const driveFolderId = normalizeTextValue(formData.get("driveFolderId"));

  // Resolve folder name once for all files in this batch
  let driveFolderName: string | null = null;
  if (driveFolderId) {
    const folders = await listDriveFolders().catch(() => []);
    driveFolderName = folders.find((f) => f.id === driveFolderId)?.name ?? null;
  }

  for (const file of files) {
    const detectedType = detectCreativeMediaType(file);

    if (!detectedType) {
      items.push({
        filename: file.name,
        creativeId: null,
        creativeName: null,
        mediaType: "unknown",
        outcome: "failed",
        message: "Неподдерживаемый тип файла."
      });
      continue;
    }

    try {
      const uploadedMedia = await uploadCreativeSourceFile(file, driveFolderId);
      const payload = applyUploadedMediaFallbacks(buildBulkCreativePayload(sharedContext, file, detectedType, driveFolderId, driveFolderName), uploadedMedia);
      const creative = await createCreativeRecord(payload, session.user.id);

      items.push({
        filename: file.name,
        creativeId: creative.id,
        creativeName: creative.name,
        mediaType: detectedType,
        outcome: "created",
        message: "Creative создан, оригинал отправлен в Google Drive."
      });
    } catch (error) {
      items.push({
        filename: file.name,
        creativeId: null,
        creativeName: buildInitialCreativeNameFromFilename(file.name),
        mediaType: detectedType,
        outcome: "failed",
        message: error instanceof Error ? error.message : "Не удалось обработать файл."
      });
    }
  }

  const createdCount = items.filter((item) => item.outcome === "created").length;
  const failedCount = items.length - createdCount;

  if (createdCount) {
    revalidatePath("/creatives");
    revalidatePath("/queue");
    revalidatePath("/active");
    revalidatePath("/scaling");
  }

  return {
    status: createdCount ? "success" : "error",
    summary: {
      totalFiles: items.length,
      createdCount,
      failedCount
    },
    items,
    message: createdCount
      ? `Обработано файлов: ${items.length}. Создано креативов: ${createdCount}.`
      : "Не удалось создать ни одного креатива из выбранного набора."
  };
}

export async function syncGoogleDriveCreativesAction() {
  const session = await requireAuthSession();
  
  const tokenData = await resolveGoogleDriveAccessToken().catch(() => null);
  if (!tokenData?.accessToken) return;

  const creativesToCheck = await db.creative.findMany({
    where: { 
      driveFileId: { not: null }, 
      currentStatus: { in: ["QUEUE", "ACTIVE"] } 
    },
    select: { 
      id: true, 
      driveFileId: true, 
      _count: { select: { launches: true } } 
    }
  });

  if (!creativesToCheck.length) return;

  const missingIds: Array<{ id: string; count: number }> = [];

  const chunkSize = 10;
  for (let i = 0; i < creativesToCheck.length; i += chunkSize) {
    const chunk = creativesToCheck.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (c) => {
        try {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${c.driveFileId}?fields=id,trashed`, {
            headers: { Authorization: `Bearer ${tokenData.accessToken}` }
          });
          if (res.status === 404) {
            missingIds.push({ id: c.id, count: c._count.launches });
          } else if (res.ok) {
            const data = await res.json();
            if (data.trashed) {
              missingIds.push({ id: c.id, count: c._count.launches });
            }
          }
        } catch (e) {
          // Ignore network errors, skip deletion if uncertain
        }
      })
    );
  }

  if (missingIds.length > 0) {
    const toDelete = missingIds.filter(c => c.count === 0).map(c => c.id);
    const toStop = missingIds.filter(c => c.count > 0).map(c => c.id);

    if (toDelete.length > 0) {
      await db.creative.deleteMany({ where: { id: { in: toDelete } } });
    }
    if (toStop.length > 0) {
      await db.creative.updateMany({
        where: { id: { in: toStop } },
        data: {
          currentStatus: "STOPPED",
          driveFileId: null,
          driveWebViewLink: null,
          driveDownloadUrl: null,
          thumbnailUrl: null,
          assetUrl: null,
          previewUrl: null,
          updatedById: session.user.id
        }
      });
    }

    revalidatePath("/creatives");
    revalidatePath("/creatives/gallery");
  }
}

export async function assignApproachToCreativeAction(creativeId: string, approachId: string) {
  const session = await requireAuthSession();

  await db.creative.update({
    where: { id: creativeId },
    data: { approachId, updatedById: session.user.id }
  });

  revalidatePath("/creatives");
  revalidatePath("/creatives/gallery");
  revalidatePath("/approaches");
}

export async function deleteCreativeAction(creativeId: string): Promise<{ ok: boolean; message: string }> {
  const session = await requireAuthSession();

  const creative = await db.creative.findUnique({
    where: { id: creativeId },
    select: { id: true, driveFileId: true, _count: { select: { launches: true } } }
  });

  if (!creative) {
    return { ok: false, message: "Креатив не найден." };
  }

  // Try to delete from Drive
  if (creative.driveFileId) {
    try {
      const { deleteDriveFile: deleteDriveFileFromDrive } = await import("@/server/integrations/google-drive/service");
      await deleteDriveFileFromDrive(creative.driveFileId);
    } catch {
      // Log but don't block DB deletion
    }
  }

  if (creative._count.launches > 0) {
    // Has launches — keep record but clear Drive metadata and stop
    await db.creative.update({
      where: { id: creativeId },
      data: {
        currentStatus: "STOPPED",
        driveFileId: null,
        driveWebViewLink: null,
        driveDownloadUrl: null,
        thumbnailUrl: null,
        previewData: null,
        updatedById: session.user.id
      }
    });
  } else {
    await db.creative.delete({ where: { id: creativeId } });
  }

  revalidatePath("/creatives");
  revalidatePath("/creatives/gallery");

  return { ok: true, message: creative._count.launches > 0 ? "Файл удалён из Drive, запись переведена в STOPPED." : "Креатив удалён." };
}

export async function bulkSetStatusAction(
  creativeIds: string[],
  status: "QUEUE" | "ACTIVE" | "STOPPED"
): Promise<{ ok: boolean; message: string }> {
  const session = await requireAuthSession();

  const ids = creativeIds.filter(Boolean);
  if (!ids.length) {
    return { ok: false, message: "Нет выбранных креативов." };
  }

  await db.creative.updateMany({
    where: { id: { in: ids } },
    data: { currentStatus: status, updatedById: session.user.id }
  });

  revalidatePath("/creatives");
  revalidatePath("/creatives/gallery");

  return { ok: true, message: `Статус обновлён для ${ids.length} крео.` };
}

export async function renameCreativeAction(creativeId: string, newName: string): Promise<{ ok: boolean; message: string }> {
  const session = await requireAuthSession();

  const trimmed = newName.trim();
  if (!trimmed) {
    return { ok: false, message: "Название не может быть пустым." };
  }

  const creative = await db.creative.findUnique({
    where: { id: creativeId },
    select: { id: true, driveFileId: true, sourceFilename: true }
  });

  if (!creative) {
    return { ok: false, message: "Креатив не найден." };
  }

  // Rename in Drive if we have a file ID
  if (creative.driveFileId) {
    try {
      const { renameDriveFile: renameDriveFileInDrive } = await import("@/server/integrations/google-drive/service");
      await renameDriveFileInDrive(creative.driveFileId, trimmed);
    } catch {
      // Non-fatal
    }
  }

  await db.creative.update({
    where: { id: creativeId },
    data: {
      name: trimmed,
      sourceFilename: creative.sourceFilename ? trimmed : undefined,
      updatedById: session.user.id
    }
  });

  revalidatePath("/creatives");
  revalidatePath("/creatives/gallery");
  revalidatePath(`/creatives/${creativeId}`);

  return { ok: true, message: "Переименовано." };
}
