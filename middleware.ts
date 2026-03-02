import { NextResponse, type NextRequest } from "next/server";

import { updateAuthSession } from "@/lib/supabase/middleware";

const AUTH_PATH_PREFIX = "/auth";
const PUBLIC_AUTH_PATHS = new Set([
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/callback",
]);

function isAuthPage(pathname: string): boolean {
  return pathname.startsWith(AUTH_PATH_PREFIX);
}

async function resolveAuthSessionWithTimeout(
  request: NextRequest,
  timeoutMs = 2500,
): Promise<Awaited<ReturnType<typeof updateAuthSession>> | null> {
  try {
    return await Promise.race([
      updateAuthSession(request),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch (error) {
    console.error("Middleware: auth session failed", error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicAuthPath = PUBLIC_AUTH_PATHS.has(pathname);

  // Never block login/signup pages on auth-provider roundtrips.
  if (isPublicAuthPath) {
    return NextResponse.next({ request });
  }

  let user: Awaited<ReturnType<typeof updateAuthSession>>["user"] = null;
  let response = NextResponse.next({ request });

  const sessionResult = await resolveAuthSessionWithTimeout(request);
  if (sessionResult) {
    response = sessionResult.response;
    user = sessionResult.user;
  }

  if (!user && !isPublicAuthPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";

    const returnPath = `${pathname}${request.nextUrl.search}`;
    if (returnPath !== "/") {
      redirectUrl.searchParams.set("next", returnPath);
    }

    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthPage(pathname) && pathname !== "/auth/callback") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
