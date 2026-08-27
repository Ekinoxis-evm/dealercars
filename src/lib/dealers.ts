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
  /** Stripe connected account. Every dollar of car money settles here. */
  stripeAccountId?: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  timeZone: string;
}

export const DEALERS: Dealer[] = [
  {
    id: "dealer_orl_001",
    legalName: "Orlando partner dealer — not yet onboarded",
    state: "FL",
    city: "Orlando",
    // Nothing is set: no licence on file, no connected account. This dealer
    // cannot sell, cannot hold paper, and cannot take a dollar. That is the
    // correct state for a partner who has not been onboarded, and the code
    // below is what makes it enforceable rather than aspirational.
    licenseNumber: undefined,
    licenseVerifiedAt: undefined,
    stripeAccountId: undefined,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    timeZone: "America/New_York",
  },
];

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
