import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getGoogleDriveConfig, getGoogleDriveOauthScopes } from "@/server/integrations/google-drive/config";

type GoogleDriveOauthStatePayload = {
  userId: string;
  exp: number;
  nonce: string;
};

type GoogleOauthTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  name?: string;
};

function getOauthStateSecret() {
  const secret = process.env.AUTH_SECRET?.trim();

  if (!secret) {
    throw new Error("AUTH_SECRET is required for Google Drive OAuth state handling.");
  }

  return secret;
}

function signStatePayload(encodedPayload: string) {
  return createHmac("sha256", getOauthStateSecret()).update(encodedPayload).digest("hex");
}

export function createGoogleDriveOauthState(userId: string) {
  const payload: GoogleDriveOauthStatePayload = {
    userId,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: randomUUID()
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signStatePayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyGoogleDriveOauthState(state: string, expectedUserId: string) {
  const [encodedPayload, providedSignature] = state.split(".");

  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = signStatePayload(encodedPayload);
  const provided = Buffer.from(providedSignature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return false;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as GoogleDriveOauthStatePayload;

  if (payload.userId !== expectedUserId) {
    return false;
  }

  return payload.exp > Date.now();
}

export function buildGoogleDriveOauthUrl(userId: string) {
  const config = getGoogleDriveConfig();

  if (!config.oauthConfigured) {
    throw new Error("Google OAuth is not configured.");
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    scope: getGoogleDriveOauthScopes().join(" "),
    state: createGoogleDriveOauthState(userId)
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function requestGoogleToken(body: URLSearchParams) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json()) as GoogleOauthTokenResponse & { error?: string; error_description?: string };

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google token exchange failed.");
  }

  return payload;
}

export async function exchangeGoogleDriveAuthorizationCode(code: string) {
  const config = getGoogleDriveConfig();

  if (!config.oauthConfigured) {
    throw new Error("Google OAuth is not configured.");
  }

  return requestGoogleToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code"
    })
  );
}

export async function refreshGoogleDriveAccessToken(refreshToken: string) {
  const config = getGoogleDriveConfig();

  if (!config.oauthConfigured) {
    throw new Error("Google OAuth is not configured.");
  }

  return requestGoogleToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token"
    })
  );
}

export async function fetchGoogleOauthUserInfo(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = (await response.json()) as GoogleUserInfoResponse & { error?: string; error_description?: string };

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Google user info request failed.");
  }

  return payload;
}
