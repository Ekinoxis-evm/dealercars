import "server-only";
import type { MemberProfile } from "./types";
import { supabaseAdmin } from "./supabase";
import { sessionEmail, sessionUser } from "./session";

/**
 * The authentication chokepoint.
 *
 * Supabase Auth owns the session (email and a one-time code or link, nothing
 * else) and the `profiles` table owns the record; this is the single place the
 * two are joined. Because the service-role key bypasses RLS, the profile id
 * returned here is the ONLY id a route may scope its queries by — a profile
 * id, listing id, or deal id taken from a request body is attacker input and
 * must always be re-checked against this profile.
 */
export class Unauthorized extends Error {
  constructor(message = "Not signed in") {
    super(message);
    this.name = "Unauthorized";
  }
}

/** Column list for every profile read, so the mapper below never gets a surprise. */
const PROFILE_COLUMNS = `
  id, user_id, email, phone, full_name,
  address_line1, address_line2, city, state, postal_code,
  employment_type, employer_name, months_at_employer, gross_monthly_income_cents,
  income_verification, identity_verification, residence_verification,
  stated_down_cents, stated_monthly_cents,
  created_at, updated_at
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProfile(row: any): MemberProfile {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    fullName: row.full_name ?? undefined,
    addressLine1: row.address_line1 ?? undefined,
    addressLine2: row.address_line2 ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postalCode: row.postal_code ?? undefined,
    employmentType: row.employment_type ?? undefined,
    employerName: row.employer_name ?? undefined,
    monthsAtEmployer: row.months_at_employer ?? undefined,
    grossMonthlyIncomeCents: row.gross_monthly_income_cents ?? undefined,
    incomeVerification: row.income_verification,
    identityVerification: row.identity_verification,
    residenceVerification: row.residence_verification,
    statedDownCents: row.stated_down_cents ?? undefined,
    statedMonthlyCents: row.stated_monthly_cents ?? undefined,
    // membership_status, stripe_customer_id and stripe_subscription_id are
    // still columns on this table and are deliberately NOT read. They belonged
    // to the retired auction-access subscription; the rows that carry them are
    // history, and nothing in the product may branch on them again.
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Resolve the signed-in member, creating the profile row on first sight.
 *
 * The email is taken from the verified session rather than from the client,
 * because the client can claim any address it likes and Supabase has actually
 * verified the one on the session.
 */
export async function requireMember(request: Request): Promise<MemberProfile> {
  const user = await sessionUser(request);
  if (!user) throw new Unauthorized();

  const db = supabaseAdmin();
  const existing = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return toProfile(existing.data);

  const created = await db
    .from("profiles")
    .insert({ user_id: user.id, email: sessionEmail(user) ?? undefined })
    .select(PROFILE_COLUMNS)
    .single();

  if (created.error) {
    // Two tabs racing the first request both insert; the unique index on
    // user_id means one loses. Re-read rather than fail.
    const reread = await db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();
    if (reread.data) return toProfile(reread.data);
    throw created.error;
  }

  return toProfile(created.data);
}

/** Standard 401 body. */
export function unauthorizedResponse(): Response {
  return Response.json({ error: "Not signed in" }, { status: 401 });
}
