import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "./env";

/**
 * Service-role Supabase client. Server routes only.
 *
 * This key BYPASSES row level security. That is deliberate — the schema enables
 * RLS with no permissive policies for `anon` or `authenticated`, because the
 * session is issued by Privy and there is no Supabase JWT to key a policy on
 * (see the RLS notes in supabase/migrations/0001_init.sql).
 *
 * The consequence is that RLS protects nothing inside a route handler. Every
 * query MUST be scoped by hand to the profile id resolved from a VERIFIED Privy
 * access token. `requireMember()` in auth.ts is the only sanctioned way to get
 * that id; do not read a profile id out of a request body.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    serverEnv.supabaseUrl,
    serverEnv.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}
