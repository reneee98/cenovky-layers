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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { response, user } = await updateAuthSession(request);

  const isPublicAuthPath = PUBLIC_AUTH_PATHS.has(pathname);

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
