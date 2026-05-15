import { NextResponse } from "next/server";
import { buildGoogleDriveOauthUrl } from "@/server/integrations/google-drive/oauth";
import { getAuthSession } from "@/server/auth/session";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in?callbackUrl=%2Fadmin%2Fgoogle-drive", request.url));
  }

  if (session.user.role !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  try {
    const url = buildGoogleDriveOauthUrl(session.user.id);
    return NextResponse.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось подготовить Google OAuth redirect.";
    return NextResponse.redirect(new URL(`/admin/google-drive?status=error&reason=${encodeURIComponent(message)}`, request.url));
  }
}
