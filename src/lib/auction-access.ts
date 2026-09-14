import type { Money } from "./types";

/**
 * Auction Access — the brokerage product.
 *
 * A member pays a flat fee and a licensed dealer bids at a dealer-only
 * wholesale auction on their behalf. Consumers cannot register to bid at
 * Copart themselves; a dealer licence is the thing being sold here, along with
 * the judgement to use it.
 *
 * Three properties of this fee are load-bearing, and none of them is styling.
 *
 * 1. IT IS NOT CREDIT. No down payment, no instalments, no deferred balance.
 *    Reg Z advertising trigger terms (12 CFR 1026.24(d)(1)) are a down payment
 *    amount, a payment amount, a number of payments, a repayment period, or a
 *    finance charge amount. A one-off service price is none of those, so this
 *    product carries no <RegZDisclosure /> — and must not start stating one
 *    without it.
 *
 * 2. IT MUST STAY AVAILABLE TO A CASH BUYER on identical terms. A charge
 *    imposed by the creditor as an incident to or a condition of extending
 *    credit IS a finance charge under 12 CFR 1026.4(a). The moment this fee
 *    becomes a prerequisite for financing an auction car, it stops being a
 *    service price and becomes part of the TILA box, and the 0.00% APR and
 *    $0.00 finance charge stated everywhere else on this site become
 *    misstatements. Keep the two products separable.
 *
 * 3. IT IS THE DEALER'S REVENUE. It pays the licence holder for the bidding
 *    service, so it settles to their connected account as a direct charge like
 *    every other dollar in the system. Nothing settles to the platform.
 */

/** The service fee, in integer cents. Money is never a float. */
export const AUCTION_ACCESS_FEE_CENTS: Money = 250_00;

/**
 * Non-refundable, and said plainly wherever it is charged.
 *
 * The fee buys the work — registration, research, inspection review and the
 * bidding itself — which is done whether or not a lot is won. A member is owed
 * that statement before they pay, not in a receipt afterwards, so it rides on
 * the payment row as well as in the copy.
 */
export const AUCTION_ACCESS_REFUNDABLE = false;

/** What the fee covers. Rendered as the list on the product page. */
export const AUCTION_ACCESS_INCLUDES: readonly string[] = [
  "Access to dealer-only wholesale auctions, bid under our licence",
  "We shortlist lots against what you actually want and can carry",
  "Condition report and inspection review before any bid is placed",
  "We bid for you, and stop where we agreed to stop",
  "Title, transport and paperwork handled after the hammer",
];

/** What it deliberately does not cover, stated before payment rather than after. */
export const AUCTION_ACCESS_EXCLUDES: readonly string[] = [
  "The price of the car itself, and the auction's own buyer fees",
  "Tax, title and registration, which are quoted once a car is won",
  "Any guarantee that a specific car will be won at a specific price",
];
