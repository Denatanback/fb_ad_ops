import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_IMPORT_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

type StoreUploadedImportFileInput = {
  file: File;
};

export type StoredImportFile = {
  absolutePath: string;
  relativeStorageKey: string;
  sha256: string;
  byteSize: number;
  contentType: string | null;
  originalFilename: string;
  utf8Text: string;
};

function normalizeUploadsRoot() {
  const configuredRoot = process.env.IMPORT_UPLOADS_DIR?.trim();

  if (!configuredRoot) {
    return path.join(process.cwd(), "var", "uploads", "imports");
  }

  return path.isAbsolute(configuredRoot) ? configuredRoot : path.join(process.cwd(), configuredRoot);
}

function sanitizeFilename(filename: string) {
  const trimmed = filename.trim().toLowerCase();
  const normalized = trimmed.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  return normalized || "upload.csv";
}

function buildStorageKey(filename: string) {
  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  const uniqueKey = `${now.getTime()}-${randomUUID().slice(0, 8)}`;

  return path.join(dayKey, `${uniqueKey}-${sanitizeFilename(filename)}`);
}

export function isCsvFileUpload(file: File) {
  const normalizedName = file.name.trim().toLowerCase();
  const normalizedType = file.type.trim().toLowerCase();

  return (
    normalizedName.endsWith(".csv") ||
    normalizedType === "text/csv" ||
    normalizedType === "application/csv" ||
    normalizedType === "application/vnd.ms-excel"
  );
}

export async function storeUploadedImportFile(input: StoreUploadedImportFileInput): Promise<StoredImportFile> {
  if (input.file.size > MAX_IMPORT_FILE_SIZE) {
    throw new Error(`CSV-файл слишком большой (${(input.file.size / 1024 / 1024).toFixed(1)} МБ). Максимум: ${MAX_IMPORT_FILE_SIZE / 1024 / 1024} МБ.`);
  }

  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const storageKey = buildStorageKey(input.file.name);
  const absoluteRoot = normalizeUploadsRoot();
  const absolutePath = path.join(absoluteRoot, storageKey);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);

  return {
    absolutePath,
    relativeStorageKey: storageKey.split(path.sep).join("/"),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    byteSize: buffer.byteLength,
    contentType: input.file.type.trim() || null,
    originalFilename: input.file.name,
    utf8Text: buffer.toString("utf8")
  };
}

export async function removeStoredImportFile(relativeStorageKey: string) {
  const absoluteRoot = normalizeUploadsRoot();
  const normalizedKey = relativeStorageKey.split("/").join(path.sep);

  await rm(path.join(absoluteRoot, normalizedKey), {
    force: true
  });
}

export function resolveStoredImportFilePath(relativeStorageKey: string) {
  const absoluteRoot = normalizeUploadsRoot();
  const normalizedKey = relativeStorageKey.split("/").join(path.sep);

  return path.join(absoluteRoot, normalizedKey);
}

export async function removeAllStoredImportFiles() {
  const absoluteRoot = normalizeUploadsRoot();
  await rm(absoluteRoot, { recursive: true, force: true });
  await mkdir(absoluteRoot, { recursive: true });
}

export function getImportUploadsConfiguration() {
  return {
    uploadsRoot: normalizeUploadsRoot()
  };
}
