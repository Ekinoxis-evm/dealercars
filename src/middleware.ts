import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    // The site icons Next serves from src/app. A redirect here sends the
    // browser tab to /es/icon.png, which is a 404 and a blank tab icon.
    pathname === "/icon.png" ||
    pathname === "/apple-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

/**
 * Keep the Supabase session alive.
 *
 * An access token lasts an hour. Route handlers only READ the cookie; this is
 * the one place that asks Supabase to refresh it and writes the new cookies
 * back, so a member who leaves a tab open overnight is still signed in when
 * they come back. Runs on every page request that reaches the app.
 */
async function refreshSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
}

export async function middleware(request: NextRequest) {
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
    await refreshSession(request, response);
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
