const videoExtensions = new Set([".mp4", ".mov", ".avi", ".m4v", ".webm", ".mkv"]);
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic"]);

export type DetectedCreativeMediaType = "video" | "static";
export type CreativePreviewSourceKind = "image" | "video";
export type CreativePreviewSource = {
  url: string;
  kind: CreativePreviewSourceKind;
};

type CreativePreviewInput = {
  name: string;
  sourceFilename?: string | null;
  sourceMimeType?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  assetUrl?: string | null;
  sourceUrl?: string | null;
  driveDownloadUrl?: string | null;
  driveWebViewLink?: string | null;
};

function getLowercaseExtension(filename: string) {
  const normalized = filename.trim().toLowerCase();
  const extensionIndex = normalized.lastIndexOf(".");

  if (extensionIndex < 0) {
    return "";
  }

  return normalized.slice(extensionIndex);
}

function normalizeUrl(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isGoogleDriveViewUrl(url: string) {
  return /drive\.google\.com\/(file\/d\/|open\?id=|drive\/folders\/)/i.test(url);
}

function getFilenameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.split("/").pop() ?? "";
    return pathname || url;
  } catch {
    return url;
  }
}

function extractGoogleDriveFileId(url: string | null | undefined): string | null {
  if (!url) {
    return null;
  }
  
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch) {
    return fileDMatch[1];
  }
  
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    return idMatch[1];
  }
  
  return null;
}

function inferRenderableKind(
  url: string,
  sourceMimeType: string | null | undefined,
  fallbackKind: CreativePreviewSourceKind,
  forceImage = false
): CreativePreviewSourceKind | null {
  if (!url || isGoogleDriveViewUrl(url)) {
    return null;
  }

  if (forceImage) {
    return "image";
  }

  const mimeType = sourceMimeType?.trim().toLowerCase() ?? "";

  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  const extension = getLowercaseExtension(getFilenameFromUrl(url));

  if (imageExtensions.has(extension)) {
    return "image";
  }

  if (videoExtensions.has(extension)) {
    return "video";
  }

  return fallbackKind;
}

function pushPreviewSource(
  sources: CreativePreviewSource[],
  seen: Set<string>,
  url: string | null | undefined,
  kind: CreativePreviewSourceKind | null
) {
  if (!url || !kind || seen.has(url)) {
    return;
  }

  seen.add(url);
  sources.push({ url, kind });
}

export function detectCreativeMediaType(file: { name: string; type?: string | null }): DetectedCreativeMediaType | null {
  const mimeType = file.type?.trim().toLowerCase() ?? "";

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType.startsWith("image/")) {
    return "static";
  }

  const extension = getLowercaseExtension(file.name);

  if (videoExtensions.has(extension)) {
    return "video";
  }

  if (imageExtensions.has(extension)) {
    return "static";
  }

  return null;
}

export function resolveCreativePreview(input: CreativePreviewInput) {
  const mediaType =
    detectCreativeMediaType({
      name: input.sourceFilename?.trim() || input.name,
      type: input.sourceMimeType
    }) ?? "static";
  const fallbackKind: CreativePreviewSourceKind = mediaType === "video" ? "video" : "image";
  const thumbnailUrl = normalizeUrl(input.thumbnailUrl);
  const previewUrl = normalizeUrl(input.previewUrl);
  const driveDownloadUrl = normalizeUrl(input.driveDownloadUrl);
  const assetUrl = normalizeUrl(input.assetUrl);
  const sourceUrl = normalizeUrl(input.sourceUrl);
  const driveWebViewLink = normalizeUrl(input.driveWebViewLink);
  
  const driveFileId = 
    extractGoogleDriveFileId(driveWebViewLink) ||
    extractGoogleDriveFileId(driveDownloadUrl) ||
    extractGoogleDriveFileId(sourceUrl);
    
  const persistentThumbnailUrl = driveFileId 
    ? `/api/drive-preview/${driveFileId}`
    : null;

  const persistentVideoProxyUrl = (mediaType === "video" && driveFileId)
    ? `/api/drive-video/${driveFileId}`
    : null;

  const sources: CreativePreviewSource[] = [];
  const seen = new Set<string>();

  pushPreviewSource(sources, seen, thumbnailUrl, inferRenderableKind(thumbnailUrl ?? "", input.sourceMimeType, "image", true));
  
  if (persistentThumbnailUrl) {
    pushPreviewSource(sources, seen, persistentThumbnailUrl, "image");
  }
  
  pushPreviewSource(sources, seen, previewUrl, inferRenderableKind(previewUrl ?? "", input.sourceMimeType, fallbackKind));
  pushPreviewSource(
    sources,
    seen,
    driveDownloadUrl,
    inferRenderableKind(driveDownloadUrl ?? "", input.sourceMimeType, fallbackKind)
  );
  pushPreviewSource(sources, seen, assetUrl, inferRenderableKind(assetUrl ?? "", input.sourceMimeType, fallbackKind));
  pushPreviewSource(sources, seen, sourceUrl, inferRenderableKind(sourceUrl ?? "", input.sourceMimeType, fallbackKind));

  if (persistentVideoProxyUrl) {
    pushPreviewSource(sources, seen, persistentVideoProxyUrl, "video");
  }

  return {
    mediaType,
    sources,
    hasPreview: sources.length > 0,
    openOriginalUrl: sourceUrl ?? driveWebViewLink ?? driveDownloadUrl ?? assetUrl ?? previewUrl ?? thumbnailUrl ?? null
  };
}

export function buildInitialCreativeNameFromFilename(filename: string) {
  const trimmed = filename.trim();
  const extensionIndex = trimmed.lastIndexOf(".");
  const withoutExtension = extensionIndex > 0 ? trimmed.slice(0, extensionIndex) : trimmed;
  const normalized = withoutExtension.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

  return normalized || "Creative";
}

export function getBulkCreativeUploadAcceptValue() {
  return "video/*,image/*,.mp4,.mov,.avi,.m4v,.webm,.mkv,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif,.heic";
}
