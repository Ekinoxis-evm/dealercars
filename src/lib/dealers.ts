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
  /**
   * Motor vehicle dealer licence — in Florida, Ch. 320.27, F.S.
   *
   * This is the licence that permits buying and selling cars at all, and it is
   * what a wholesale auction checks before it lets anyone register to bid. It
   * gates trading and services. It does NOT permit holding paper.
   */
  dealerLicenseNumber?: string;
  dealerLicenseVerifiedAt?: string;
  /**
   * Retail installment seller licence — in Florida, Ch. 520, F.S.
   *
   * A different licence answering a different question: may this dealer be the
   * CREDITOR on an instalment contract. Selling a car for cash needs the dealer
   * licence; selling it for twelve payments needs this one as well.
   */
  licenseNumber?: string;
  licenseVerifiedAt?: string;
  /** Where the member is told to turn up. On the dealer, not in the UI. */
  streetAddress?: string;
  postalCode?: string;
  /** wa.me form: country code first, digits only. See migration 0006. */
  whatsapp?: string;
  /** Where the business is on social media. Absent = not shown. See 0008. */
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  /** Stripe connected account. Every dollar of car money settles here. */
  stripeAccountId?: string;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  timeZone: string;
}

export const DEALERS: Dealer[] = [
  {
    id: "dealer_orl_001",
    // The registered entity, still unconfirmed. "MGM Autobroker" is the name
    // the business trades under and is what a member sees; whether it is also
    // the legal name on the licence is a question for the licence itself, and
    // guessing at it here would put an invented entity on a contract.
    legalName: "Orlando partner dealer — not yet onboarded",
    dbaName: "MGM Autobroker",
    state: "FL",
    // Intercession City, NOT Orlando — and that is a tax question, not a
    // cosmetic one. See the note on FL_ORANGE_DEAL_COSTS in deal-costs.ts.
    city: "Intercession City",
    streetAddress: "5624 S Orange Blossom Trail",
    postalCode: "33848",
    whatsapp: "17868671441",
    instagramUrl: "https://www.instagram.com/mgmautoauctions",
    facebookUrl: "https://www.facebook.com/profile.php?id=61570312161926",
    tiktokUrl: undefined,
    // A connected account exists (test mode), but nothing else does: no licence
    // on file, and Stripe has not enabled charges because onboarding is
    // unfinished. This dealer cannot sell, cannot hold paper, and cannot take a
    // dollar — which is the correct state for a partner who has not been
    // onboarded, and the gates below are what make it enforceable.
    //
    // These two booleans are a SEED ONLY. At runtime the payment gate reads the
    // `dealers` table via `loadDealer()`, which the `account.updated` webhook
    // keeps in step with Stripe in both directions.
    // Dealer licence (Ch. 320.27) and auction access are in hand. The seed
    // carries no numbers — the `dealers` row is the source of truth, and this
    // exists only so local work without a database still renders.
    dealerLicenseNumber: undefined,
    dealerLicenseVerifiedAt: undefined,
    // Retail installment seller (Ch. 520) — unconfirmed, and deliberately left
    // so. It is the licence that permits holding paper, and it is not implied
    // by any of the others.
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

/**
 * The two gates, kept apart on purpose.
 *
 * They used to be one, and that was wrong in a way that only showed up once
 * there was something to sell that is not credit. A motor vehicle dealer
 * licence permits trading cars and bidding at wholesale auctions; a retail
 * installment seller licence permits being the creditor on a contract payable
 * in instalments. They are separate licences, issued under separate chapters,
 * and they answer separate questions.
 *
 * Conflating them blocks a cash sale, or a brokerage fee, on the absence of a
 * licence neither of those needs — which is not caution, it is just a wrong
 * answer that happens to fail closed.
 */

/**
 * Can this dealer trade and take money for a service — a brokerage fee, a
 * deposit, a car sold for cash? Needs the dealer licence and a working
 * connected account, and nothing more.
 */
export function serviceBlockReason(dealer: Dealer): string | null {
  if (!dealer.dealerLicenseVerifiedAt) {
    return "This dealer's motor vehicle dealer licence has not been verified.";
  }
  if (!dealer.stripeAccountId) {
    return "This dealer has not connected a Stripe account, so there is nowhere for a payment to settle.";
  }
  if (!dealer.stripeChargesEnabled) {
    return "This dealer's Stripe account cannot accept charges yet.";
  }
  return null;
}

/**
 * Can this dealer be the creditor on an instalment contract? Everything above,
 * plus the retail installment seller licence. An unlicensed creditor cannot
 * hold the paper, so no financed deal may reference them.
 */
export function creditBlockReason(dealer: Dealer): string | null {
  const service = serviceBlockReason(dealer);
  if (service) return service;
  if (!dealer.licenseVerifiedAt) {
    return "This dealer's retail installment seller licence has not been verified, so it cannot offer a payment plan. Paying in full is unaffected.";
  }
  return null;
}

export function canSellServices(dealer: Dealer): boolean {
  return serviceBlockReason(dealer) === null;
}

export function canExtendCredit(dealer: Dealer): boolean {
  return creditBlockReason(dealer) === null;
}
