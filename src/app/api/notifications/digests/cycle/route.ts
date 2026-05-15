import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runTelegramDigestQueueCycle } from "@/server/notifications/digests";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message
    },
    { status }
  );
}

function readBearerToken(request: Request) {
  const authorizationHeader = request.headers.get("authorization")?.trim();

  if (!authorizationHeader || !authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorizationHeader.slice("bearer ".length).trim() || null;
}

function authenticateCronRequest(request: Request): { ok: true } | { ok: false; status: 401 | 503 } {
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (!expectedSecret) {
    return { ok: false, status: 503 };
  }

  const providedSecret = readBearerToken(request) ?? request.headers.get("x-cron-secret")?.trim() ?? null;

  if (!providedSecret) {
    return { ok: false, status: 401 };
  }

  const expectedBuffer = Buffer.from(expectedSecret);
  const providedBuffer = Buffer.from(providedSecret);

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    return { ok: false, status: 401 };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  const auth = authenticateCronRequest(request);

  if (!auth.ok) {
    return jsonError(
      auth.status === 503
        ? "Digest cycle endpoint is not configured (CRON_SECRET missing)."
        : "Invalid cron secret.",
      auth.status
    );
  }

  try {
    const result = await runTelegramDigestQueueCycle();

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Digest cycle failed.",
      500
    );
  }
}
