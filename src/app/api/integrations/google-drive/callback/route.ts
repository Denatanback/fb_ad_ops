import { NextResponse } from "next/server";
import { getAuthSession } from "@/server/auth/session";
import { connectGoogleDriveIntegration } from "@/server/integrations/google-drive/service";
import { verifyGoogleDriveOauthState } from "@/server/integrations/google-drive/oauth";

function appUrl(path: string) {
  const base = (process.env.APP_BASE_URL ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (!session?.user) {
    return NextResponse.redirect(appUrl("/sign-in?callbackUrl=%2Fadmin%2Fgoogle-drive"));
  }

  if (session.user.role !== "admin") {
    return NextResponse.redirect(appUrl("/unauthorized"));
  }

  if (oauthError) {
    return NextResponse.redirect(
      appUrl(`/admin/google-drive?status=error&reason=${encodeURIComponent(`Google OAuth error: ${oauthError}`)}`)
    );
  }

  if (!code || !state || !verifyGoogleDriveOauthState(state, session.user.id)) {
    return NextResponse.redirect(
      appUrl("/admin/google-drive?status=error&reason=Недействительный%20Google%20OAuth%20state.")
    );
  }

  try {
    await connectGoogleDriveIntegration(session.user.id, code);
    return NextResponse.redirect(appUrl("/admin/google-drive?status=connected"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось завершить подключение Google Drive.";
    return NextResponse.redirect(appUrl(`/admin/google-drive?status=error&reason=${encodeURIComponent(message)}`));
  }
}
