import type { GoogleDriveIntegration } from "@prisma/client";
import { db } from "@/server/db/client";
import { getGoogleDriveConfig } from "@/server/integrations/google-drive/config";
import {
  exchangeGoogleDriveAuthorizationCode,
  fetchGoogleOauthUserInfo,
  refreshGoogleDriveAccessToken
} from "@/server/integrations/google-drive/oauth";

type UpsertGoogleDriveIntegrationInput = {
  userId: string;
  googleAccountId: string | null;
  googleAccountEmail: string | null;
  googleAccountName: string | null;
  scope: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresAt: Date | null;
  driveFolderName: string | null;
};

type GoogleDriveUploadInput = {
  filename: string;
  mimeType: string;
  content: Buffer;
  folderId?: string | null;
};

function normalizeText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getGoogleDriveIntegrationRecord() {
  return db.googleDriveIntegration.findUnique({
    where: {
      providerKey: "google_drive"
    }
  });
}

export async function getGoogleDriveAdminStatus() {
  const [integration, config] = await Promise.all([getGoogleDriveIntegrationRecord(), Promise.resolve(getGoogleDriveConfig())]);

  return {
    config,
    connected: Boolean(integration?.refreshToken || integration?.accessToken),
    integration
  };
}

async function fetchGoogleDriveFolderMetadata(accessToken: string, folderId: string) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType,webViewLink`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    id?: string;
    name?: string;
    mimeType?: string;
    webViewLink?: string;
  };

  if (payload.mimeType !== "application/vnd.google-apps.folder") {
    return null;
  }

  return payload;
}

async function upsertGoogleDriveIntegration(input: UpsertGoogleDriveIntegrationInput) {
  const config = getGoogleDriveConfig();

  return db.googleDriveIntegration.upsert({
    where: {
      providerKey: "google_drive"
    },
    create: {
      providerKey: "google_drive",
      googleAccountId: normalizeText(input.googleAccountId),
      googleAccountEmail: normalizeText(input.googleAccountEmail),
      googleAccountName: normalizeText(input.googleAccountName),
      scope: normalizeText(input.scope),
      accessToken: normalizeText(input.accessToken),
      refreshToken: normalizeText(input.refreshToken),
      tokenType: normalizeText(input.tokenType),
      expiresAt: input.expiresAt,
      driveFolderId: normalizeText(config.folderId),
      driveFolderName: normalizeText(input.driveFolderName),
      connectedById: input.userId,
      updatedById: input.userId,
      connectedAt: new Date(),
      lastValidatedAt: new Date(),
      lastErrorMessage: null
    },
    update: {
      googleAccountId: normalizeText(input.googleAccountId),
      googleAccountEmail: normalizeText(input.googleAccountEmail),
      googleAccountName: normalizeText(input.googleAccountName),
      scope: normalizeText(input.scope),
      accessToken: normalizeText(input.accessToken),
      refreshToken: normalizeText(input.refreshToken) ?? undefined,
      tokenType: normalizeText(input.tokenType),
      expiresAt: input.expiresAt,
      driveFolderId: normalizeText(config.folderId),
      driveFolderName: normalizeText(input.driveFolderName),
      updatedById: input.userId,
      connectedAt: new Date(),
      lastValidatedAt: new Date(),
      lastErrorMessage: null
    }
  });
}

export async function connectGoogleDriveIntegration(userId: string, code: string) {
  const tokenResponse = await exchangeGoogleDriveAuthorizationCode(code);
  const userInfo = await fetchGoogleOauthUserInfo(tokenResponse.access_token);
  const config = getGoogleDriveConfig();
  const folder = config.folderId
    ? await fetchGoogleDriveFolderMetadata(tokenResponse.access_token, config.folderId).catch(() => null)
    : null;

  return upsertGoogleDriveIntegration({
    userId,
    googleAccountId: userInfo.sub ?? null,
    googleAccountEmail: userInfo.email ?? null,
    googleAccountName: userInfo.name ?? null,
    scope: tokenResponse.scope ?? null,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token ?? null,
    tokenType: tokenResponse.token_type ?? null,
    expiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null,
    driveFolderName: folder?.name ?? null
  });
}

async function persistRefreshedAccessToken(integrationId: string, tokenResponse: { access_token: string; expires_in?: number; token_type?: string; scope?: string }) {
  return db.googleDriveIntegration.update({
    where: {
      id: integrationId
    },
    data: {
      accessToken: tokenResponse.access_token,
      tokenType: normalizeText(tokenResponse.token_type),
      scope: normalizeText(tokenResponse.scope),
      expiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null,
      lastValidatedAt: new Date(),
      lastErrorMessage: null
    }
  });
}

export async function resolveGoogleDriveAccessToken() {
  const integration = await getGoogleDriveIntegrationRecord();

  if (!integration) {
    throw new Error("Google Drive is not connected.");
  }

  const hasValidAccessToken =
    integration.accessToken &&
    (!integration.expiresAt || integration.expiresAt.getTime() > Date.now() + 30 * 1000);

  if (hasValidAccessToken) {
    return {
      integration,
      accessToken: integration.accessToken as string
    };
  }

  if (!integration.refreshToken) {
    throw new Error("Google Drive refresh token is missing. Reconnect the integration.");
  }

  const refreshed = await refreshGoogleDriveAccessToken(integration.refreshToken);
  const updatedIntegration = await persistRefreshedAccessToken(integration.id, refreshed);

  return {
    integration: updatedIntegration,
    accessToken: refreshed.access_token
  };
}

function buildMultipartDriveUploadBody(filename: string, mimeType: string, content: Buffer, folderId?: string | null) {
  const boundary = `fbadsops-${Date.now().toString(16)}`;
  const metadata = {
    name: filename,
    ...(folderId ? { parents: [folderId] } : {})
  };

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  return {
    boundary,
    body
  };
}

export async function uploadFileToGoogleDrive(input: GoogleDriveUploadInput) {
  const config = getGoogleDriveConfig();
  const { accessToken, integration } = await resolveGoogleDriveAccessToken();
  const folderId = normalizeText(input.folderId) ?? normalizeText(config.folderId);
  const multipart = buildMultipartDriveUploadBody(input.filename, input.mimeType, input.content, folderId);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${multipart.boundary}`
      },
      body: multipart.body
    }
  );

  const payload = (await response.json()) as {
    id?: string;
    name?: string;
    mimeType?: string;
    size?: string;
    webViewLink?: string;
    webContentLink?: string;
    thumbnailLink?: string;
    error?: {
      message?: string;
    };
  };

  if (!response.ok || !payload.id) {
    await db.googleDriveIntegration.update({
      where: {
        id: integration.id
      },
      data: {
        lastErrorMessage: payload.error?.message ?? "Google Drive upload failed."
      }
    });

    throw new Error(payload.error?.message ?? "Google Drive upload failed.");
  }

  await db.googleDriveIntegration.update({
    where: {
      id: integration.id
    },
    data: {
      lastValidatedAt: new Date(),
      lastErrorMessage: null
    }
  });

  return {
    driveFileId: payload.id,
    webViewLink: payload.webViewLink ?? null,
    webContentLink: payload.webContentLink ?? null,
    thumbnailLink: payload.thumbnailLink ?? null,
    filename: payload.name ?? input.filename,
    mimeType: payload.mimeType ?? input.mimeType,
    byteSize: payload.size ? Number(payload.size) : input.content.byteLength
  };
}

export async function getGoogleDriveConnectedIntegration() {
  return getGoogleDriveIntegrationRecord();
}

export async function recordGoogleDriveValidationError(integration: GoogleDriveIntegration, message: string) {
  await db.googleDriveIntegration.update({
    where: {
      id: integration.id
    },
    data: {
      lastErrorMessage: message
    }
  });
}

export type DriveFolderInfo = {
  id: string;
  name: string;
  webViewLink: string | null;
  createdTime: string | null;
};

export async function listDriveFolders(parentFolderId?: string | null): Promise<DriveFolderInfo[]> {
  const { accessToken } = await resolveGoogleDriveAccessToken();
  const config = getGoogleDriveConfig();
  const rootId = parentFolderId ?? config.folderId;

  const query = rootId
    ? `mimeType='application/vnd.google-apps.folder' and '${rootId}' in parents and trashed=false`
    : `mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink,createdTime)&orderBy=name`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { files?: DriveFolderInfo[] };
  return payload.files ?? [];
}

export async function createDriveFolder(name: string, parentFolderId?: string | null): Promise<DriveFolderInfo | null> {
  const { accessToken } = await resolveGoogleDriveAccessToken();
  const config = getGoogleDriveConfig();
  const parent = parentFolderId ?? config.folderId;

  const metadata: Record<string, unknown> = {
    name: name.trim(),
    mimeType: "application/vnd.google-apps.folder",
    ...(parent ? { parents: [parent] } : {})
  };

  const response = await fetch(
    "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,createdTime",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(metadata)
    }
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DriveFolderInfo;
}

export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const { accessToken } = await resolveGoogleDriveAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  return response.ok || response.status === 204;
}

export async function renameDriveFile(fileId: string, newName: string): Promise<boolean> {
  const { accessToken } = await resolveGoogleDriveAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: newName.trim() })
    }
  );

  return response.ok;
}

export async function getDriveFileMetadata(fileId: string): Promise<{ name: string; mimeType: string; size: string | null } | null> {
  const { accessToken } = await resolveGoogleDriveAccessToken();

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) return null;

  return (await response.json()) as { name: string; mimeType: string; size: string | null };
}
