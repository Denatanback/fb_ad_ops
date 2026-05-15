import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = [
  "/sign-in",
  "/api/auth",
  "/api/health",
  "/api/imports/upload",
  "/api/integrations/google-drive/callback"
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secureCookie =
    forwardedProto === "https" ||
    request.nextUrl.protocol === "https:" ||
    request.url.startsWith("https://");

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie
  });

  if (!token) {
    const signInUrl = new URL("/sign-in", request.url);
    const callbackUrl = `${pathname}${search}`;

    if (callbackUrl !== "/") {
      signInUrl.searchParams.set("callbackUrl", callbackUrl);
    }

    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
