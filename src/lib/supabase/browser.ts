"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The browser's Supabase client. Publishable key only — under deny-all RLS it
 * can read nothing; its one job here is the session: sending the sign-in
 * email, verifying the code, and keeping the cookies that the server routes
 * then read through `requireMember()`.
 */
let cached: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;
  cached = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return cached;
}
