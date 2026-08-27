import "server-only";
import type { MemberProfile } from "./types";
import { supabaseAdmin } from "./supabase";
import { accessTokenFrom, privyClient, verifiedDid } from "./privy-server";

/**
 * The authentication chokepoint.
 *
 * Privy owns the session, Supabase owns the record, and this is the single
 * place the two are joined. Because the service-role key bypasses RLS, the
 * profile id returned here is the ONLY id a route may scope its queries by —
 * a profile id, listing id, or deal id taken from a request body is attacker
 * input and must always be re-checked against this profile.
 */
export class Unauthorized extends Error {
  constructor(message = "Not signed in") {
    super(message);
    this.name = "Unauthorized";
  }
}

/** Column list for every profile read, so the mapper below never gets a surprise. */
const PROFILE_COLUMNS = `
  id, privy_did, email, phone, full_name,
  address_line1, address_line2, city, state, postal_code,
  employment_type, employer_name, months_at_employer, gross_monthly_income_cents,
  income_verification, identity_verification, residence_verification,
  stated_down_cents, stated_monthly_cents,
  membership_status, stripe_customer_id, stripe_subscription_id,
  created_at, updated_at
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProfile(row: any): MemberProfile {
  return {
    id: row.id,
    privyDid: row.privy_did,
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
    membershipStatus: row.membership_status,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Resolve the signed-in member, creating the profile row on first sight.
 *
 * The contact details are read from Privy rather than from the client, because
 * the client can claim any email it likes and Privy has actually verified the
 * one it holds.
 */
export async function requireMember(request: Request): Promise<MemberProfile> {
  const did = await verifiedDid(accessTokenFrom(request));
  if (!did) throw new Unauthorized();

  const db = supabaseAdmin();
  const existing = await db
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("privy_did", did)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return toProfile(existing.data);

  // First sight of this DID. Seed the row from Privy's verified contacts.
  let email: string | undefined;
  let phone: string | undefined;
  try {
    const user = await privyClient().getUser(did);
    email = user.email?.address;
    phone = user.phone?.number;
  } catch {
    // A rate limit or outage here must not block sign-in. The profile form
    // collects contact details anyway; this is only a convenience prefill.
  }

  const created = await db
    .from("profiles")
    .insert({ privy_did: did, email, phone })
    .select(PROFILE_COLUMNS)
    .single();

  if (created.error) {
    // Two tabs racing the first request both insert; the unique index on
    // privy_did means one loses. Re-read rather than fail.
    const reread = await db
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("privy_did", did)
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
