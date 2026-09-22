import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, isLocale, localeFromAcceptLanguage } from "@/i18n/config";

/**
 * Send every member-facing URL to a locale.
 *
 * `/marketplace` becomes `/es/marketplace` or `/en/marketplace` — a redirect, not a rewrite, so the
 * address bar shows the language. That is the whole point of putting the locale
 * in the path: a Spanish ad can link straight to Spanish content, the page can
 * be shared and still be in Spanish, and search engines index both versions
 * instead of guessing.
 *
 * A previously chosen language beats the browser's header, because someone who
 * has used the switch has told us something more specific than their OS did.
 */
const COOKIE = "locale";

/**
 * Paths with no language.
 *
 * /admin is NOT here. It is operator-only and its copy is not translated, but
 * it lives under the locale layout — which is the only root layout — so it
 * still needs a locale prefix to have an <html> element at all.
 */
function isExempt(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isExempt(pathname)) return NextResponse.next();

  const first = pathname.split("/")[1];
  if (isLocale(first)) {
    // Already localised. Remember it, so the next bare URL lands in the same
    // language rather than re-running detection.
    const response = NextResponse.next();
    if (request.cookies.get(COOKIE)?.value !== first) {
      response.cookies.set(COOKIE, first, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    }
    return response;
  }

  const saved = request.cookies.get(COOKIE)?.value;
  const locale = isLocale(saved)
    ? saved
    : localeFromAcceptLanguage(request.headers.get("accept-language"));

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the exemptions above; the matcher is a coarse first pass
  // and `isExempt` is the authority.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export { LOCALES };
