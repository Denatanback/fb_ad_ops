const googleDriveScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file"
] as const;

export function getGoogleDriveOauthScopes() {
  return [...googleDriveScopes];
}

export function getGoogleDriveRedirectUri() {
  const explicitRedirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI?.trim();

  if (explicitRedirectUri) {
    return explicitRedirectUri;
  }

  const appBaseUrl = process.env.APP_BASE_URL?.trim();

  if (!appBaseUrl) {
    return "";
  }

  return `${appBaseUrl.replace(/\/$/, "")}/api/integrations/google-drive/callback`;
}

export function getGoogleDriveConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = getGoogleDriveRedirectUri();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() ?? "";

  return {
    clientId,
    clientSecret,
    redirectUri,
    folderId,
    oauthConfigured: Boolean(clientId && clientSecret && redirectUri),
    folderConfigured: Boolean(folderId)
  };
}
