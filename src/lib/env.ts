/**
 * Environment contract.
 *
 * Every read is lazy and every failure is loud. Nothing is validated at module
 * load, because `next build` imports route modules with no secrets present and
 * a top-level throw would turn a missing key into a broken build rather than a
 * clear 500 at the one endpoint that needed it.
 *
 * Server-only values must never be imported into a client component. The
 * `serverEnv` object is the guard: touching it in the browser throws.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example.`
    );
  }
  return value;
}

function serverOnly(name: string): string {
  if (typeof window !== "undefined") {
    throw new Error(
      `${name} is a server secret and was read in the browser. This is a bug — ` +
        `move the call into a route handler or server component.`
    );
  }
  return required(name);
}

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  /** Reads nothing under deny-all RLS. The auth session is its only job. */
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  /** Bypasses RLS entirely. Server routes only, never shipped to a client. */
  get supabaseServiceRoleKey() {
    return serverOnly("SUPABASE_SERVICE_ROLE_KEY");
  },
  get stripeSecretKey() {
    return serverOnly("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return serverOnly("STRIPE_WEBHOOK_SECRET");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

/** Safe in the browser. */
export const publicEnv = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/** True when the whole payment path is wired. Used to render honest UI. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
