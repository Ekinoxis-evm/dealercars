import "server-only";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { serverEnv } from "./env";

/**
 * Who is making this request, according to Supabase Auth.
 *
 * Reads the session cookies off the request and asks Supabase to verify the
 * access token. Nothing is written back: the middleware is what refreshes an
 * expiring session and sets fresh cookies; a route handler only needs to know
 * who is calling. Returns null for a signed-out or forged request — the two
 * are deliberately not distinguished.
 */
export async function sessionUser(request: Request): Promise<User | null> {
  const supabase = createServerClient(
    serverEnv.supabaseUrl,
    serverEnv.supabasePublishableKey,
    {
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get("cookie") ?? "").map((c) => ({
            name: c.name,
            value: c.value ?? "",
          })),
        setAll: () => {
          // Read-only in route handlers; see the middleware for refresh.
        },
      },
    }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

/** The verified, lower-cased email on a session, or null. */
export function sessionEmail(user: User): string | null {
  const address = user.email?.trim().toLowerCase();
  return address || null;
}
