import { timingSafeEqual } from "node:crypto";

export type InternalImportAuthResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      status: 401 | 503;
      reason: "missing_config" | "invalid_key";
    };

function readBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization")?.trim();

  if (!authorizationHeader || !authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorizationHeader.slice("bearer ".length).trim() || null;
}

function readImportApiKeyFromRequest(request: Request) {
  return readBearerToken(request) ?? request.headers.get("x-internal-import-key")?.trim() ?? null;
}

function safeCompare(expectedValue: string, actualValue: string) {
  const expectedBuffer = Buffer.from(expectedValue);
  const actualBuffer = Buffer.from(actualValue);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function authenticateInternalImportRequest(request: Request): InternalImportAuthResult {
  const expectedApiKey = process.env.INTERNAL_IMPORT_API_KEY?.trim();

  if (!expectedApiKey) {
    return {
      ok: false,
      status: 503,
      reason: "missing_config"
    };
  }

  const providedApiKey = readImportApiKeyFromRequest(request);

  if (!providedApiKey || !safeCompare(expectedApiKey, providedApiKey)) {
    return {
      ok: false,
      status: 401,
      reason: "invalid_key"
    };
  }

  return {
    ok: true
  };
}
