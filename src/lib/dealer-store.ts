import "server-only";
import type { Dealer } from "./dealers";
import { findDealer } from "./dealers";
import { supabaseAdmin } from "./supabase";

/**
 * Load a dealer from the database rather than from the static seed list.
 *
 * This matters more than it looks. Whether a dealer may take a member's money
 * depends on `stripe_charges_enabled` and a verified licence, and both change
 * over time — a dealer finishes Stripe onboarding at 2pm on a Tuesday. If the
 * payment gate reads a hardcoded TypeScript constant, that dealer stays blocked
 * until someone edits a file and redeploys, and worse, a dealer whose account
 * is later *restricted* by Stripe stays enabled until someone notices.
 *
 * The `dealers` table is the source of truth; `dealers.ts` is only a seed and a
 * fallback for local work with no database.
 */
export async function loadDealer(id: string): Promise<Dealer | undefined> {
  const { data, error } = await supabaseAdmin()
    .from("dealers")
    .select(
      "id, legal_name, dba_name, state, city, street_address, postal_code, dealer_license_number, dealer_license_verified_at, license_number, license_verified_at, stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, time_zone"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    // Fall back to the seed so local development without a database still
    // renders — but note the fallback dealer can never take payments, because
    // its gates are all false. Failing closed is the point.
    return findDealer(id);
  }

  return {
    id: data.id,
    legalName: data.legal_name,
    dbaName: data.dba_name ?? undefined,
    streetAddress: data.street_address ?? undefined,
    postalCode: data.postal_code ?? undefined,
    state: data.state,
    city: data.city,
    dealerLicenseNumber: data.dealer_license_number ?? undefined,
    dealerLicenseVerifiedAt: data.dealer_license_verified_at ?? undefined,
    licenseNumber: data.license_number ?? undefined,
    licenseVerifiedAt: data.license_verified_at ?? undefined,
    stripeAccountId: data.stripe_account_id ?? undefined,
    stripeChargesEnabled: data.stripe_charges_enabled ?? false,
    stripePayoutsEnabled: data.stripe_payouts_enabled ?? false,
    timeZone: data.time_zone ?? "America/New_York",
  };
}
