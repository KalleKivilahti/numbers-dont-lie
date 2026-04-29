import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Routes that require a valid Auth.js session cookie (JWT).
 * Everything under `/api` requires auth unless listed as public in {@link isPublicApiRoute}.
 */
function mustAuthenticate(pathname: string): boolean {
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/auth/step-up")
  ) {
    return true;
  }

  if (!pathname.startsWith("/api/")) {
    return false;
  }

  return !isPublicApiRoute(pathname);
}

function isPublicApiRoute(pathname: string): boolean {
  if (pathname === "/api/register" || pathname === "/api/health") {
    return true;
  }

  if (
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/verify-email") ||
    pathname.startsWith("/api/auth/refresh")
  ) {
    return true;
  }

  if (
    pathname.startsWith("/api/auth/issue-refresh") ||
    pathname.startsWith("/api/auth/2fa") ||
    pathname.startsWith("/api/auth/step-up")
  ) {
    return false;
  }

  // Session, CSRF, OAuth callbacks, sign-in/out UI — anonymous callers allowed.
  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (!mustAuthenticate(pathname)) {
    return NextResponse.next();
  }

  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[middleware] Missing AUTH_SECRET or NEXTAUTH_SECRET");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const secureCookie =
    process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;

  const token = await getToken({
    req,
    secret,
    secureCookie,
  });

  if (!token?.sub) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const tfa = Boolean(token.twoFactorEnabled);
  const stepAt = token.sensitiveStepUpAt as number | undefined;
  const needsSensitiveStepUp = tfa && stepAt == null;

  const stepUpAllowed =
    pathname.startsWith("/auth/step-up") || pathname.startsWith("/api/auth/step-up");

  if (!needsSensitiveStepUp || stepUpAllowed) {
    return NextResponse.next();
  }

  const sensitivePage =
    pathname.startsWith("/profile") || pathname.startsWith("/settings");
  const sensitiveApi =
    pathname.startsWith("/api/profile") || pathname.startsWith("/api/settings");

  if (!sensitivePage && !sensitiveApi) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json(
      { error: "Step-up required", code: "STEP_UP_REQUIRED" },
      { status: 403 }
    );
  }

  const dest = new URL("/auth/step-up", req.url);
  dest.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
  return NextResponse.redirect(dest);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
