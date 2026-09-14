/**
 * Partner dealers.
 *
 * The dealer is the seller, the creditor, and the holder of the paper. Nothing
 * in this system may reference a dealer that has not cleared all three gates
 * below — an unlicensed dealer cannot hold a retail installment contract, and
 * a dealer without a payments-enabled connected account has nowhere for the
 * member's money to land except ours, which is exactly what must never happen.
 *
 * Stands in for the `dealers` table until onboarding exists.
 */

export interface Dealer {
  id: string;
  legalName: string;
  dbaName?: string;
  state: string;
  city: string;
  /** State retail installment seller / sales finance licence. */
  licenseNumber?: string;
  licenseVerifiedAt?: string;
  /** Where the member is told to turn up. On the dealer, not in the UI. */
  streetAddress?: string;
  postalCode?: string;
  /** Stripe connected account. Every dollar of car money settles here. */
  stripeAccountId?: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  timeZone: string;
}

export const DEALERS: Dealer[] = [
  {
    id: "dealer_orl_001",
    legalName: "MGM Autobroker",
    state: "FL",
    city: "Orlando",
    streetAddress: "5624 S. Orange Blossom Trail",
    // TODO: confirm the ZIP before this reaches a receipt or a map link.
    postalCode: undefined,
    // A connected account exists (test mode), but nothing else does: no licence
    // on file, and Stripe has not enabled charges because onboarding is
    // unfinished. This dealer cannot sell, cannot hold paper, and cannot take a
    // dollar — which is the correct state for a partner who has not been
    // onboarded, and the gates below are what make it enforceable.
    //
    // These two booleans are a SEED ONLY. At runtime the payment gate reads the
    // `dealers` table via `loadDealer()`, which the `account.updated` webhook
    // keeps in step with Stripe in both directions.
    licenseNumber: undefined,
    licenseVerifiedAt: undefined,
    stripeAccountId: "acct_1U8rZLEY3nQTGwYo",
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    timeZone: "America/New_York",
  },
];

/**
 * The dealer we actually operate as.
 *
 * Products that are not attached to a specific car — Auction Access — have no
 * listing to read a `dealerId` off, so they need a named one. A constant
 * rather than a lookup by position, so that onboarding a second dealer is a
 * visible decision here instead of a silent change of meaning somewhere else.
 */
export const OPERATING_DEALER_ID = "dealer_orl_001";

export function findDealer(id: string): Dealer | undefined {
  return DEALERS.find((d) => d.id === id);
}

/** Why this dealer cannot take money yet, or null if they can. */
export function dealerBlockReason(dealer: Dealer): string | null {
  if (!dealer.licenseVerifiedAt) {
    return "This dealer's retail installment seller licence has not been verified.";
  }
  if (!dealer.stripeAccountId) {
    return "This dealer has not connected a Stripe account, so there is nowhere for a payment to settle.";
  }
  if (!dealer.stripeChargesEnabled) {
    return "This dealer's Stripe account cannot accept charges yet.";
  }
  return null;
}

export function canAcceptPayments(dealer: Dealer): boolean {
  return dealerBlockReason(dealer) === null;
}
