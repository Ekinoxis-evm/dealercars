import "server-only";
import Stripe from "stripe";
import { serverEnv } from "./env";
import type { Money, PaymentPlan, RetailListing } from "./types";

/**
 * Stripe, arranged so that the money rule is structural rather than advisory.
 *
 * Every charge in this file is a DIRECT charge on the DEALER CONNECTED
 * ACCOUNT: the visit deposit, the down payment, and every installment. The
 * funds settle to the dealer and never rest in a DealerCars balance. That is
 * why each function below takes a `dealerAccountId` it cannot default.
 *
 * There used to be a second destination — the platform account, which billed
 * the auction-access subscription. That product is gone and nothing settles to
 * the platform today. Keep the shape anyway: car money and software money are
 * different businesses with different licensing, different chargeback exposure
 * and different books, and the day something is sold on the platform again, a
 * payout path that has been quietly routing everything through one account is
 * a rewrite rather than a configuration change.
 *
 * If you ever find yourself wanting to route car money through the platform
 * and pay the dealer out later, stop: that is a licensing change, not a
 * refactor.
 */

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  cached = new Stripe(serverEnv.stripeSecretKey, {
    // Sent on every request so the dashboard shows what created a charge.
    appInfo: { name: "DealerCars", url: "https://dealercars.app" },
  });
  return cached;
}

/**
 * Platform fee taken off a dealer-side payment.
 *
 * Zero by design. We are the dealer today, so a platform fee would only move
 * our own money from one account to another while creating a disclosure
 * question that does not otherwise exist. Introducing one is a pricing
 * decision with tax consequences, so it is an explicit argument rather than a
 * default someone can turn on by accident.
 */
const NO_APPLICATION_FEE = undefined;

/** Apple Pay note — see `wallets` in the README. Nothing to configure here:
 *  Stripe-hosted Checkout renders the Apple Pay sheet automatically on a
 *  supported device, and because the page is served from checkout.stripe.com
 *  it needs no per-dealer Apple Pay domain registration. Omitting
 *  `payment_method_types` is what enables the wallet set; do not add it back. */

// ----------------------------------------------------------- dealer money

/**
 * Find or create the member's Customer ON THE DEALER'S ACCOUNT.
 *
 * Customers do not cross account boundaries, and the installment mandate has
 * to live with the party that holds the paper — so the member's saved payment
 * method belongs to the account that will be collecting from it.
 */
async function dealerCustomer(
  dealerAccountId: string,
  params: { profileId: string; email?: string; fullName?: string }
): Promise<string> {
  const existing = await stripe().customers.search(
    {
      query: `metadata['profile_id']:'${params.profileId}'`,
      limit: 1,
    },
    { stripeAccount: dealerAccountId }
  );
  if (existing.data[0]) return existing.data[0].id;

  const created = await stripe().customers.create(
    {
      email: params.email,
      name: params.fullName,
      metadata: { profile_id: params.profileId },
    },
    { stripeAccount: dealerAccountId }
  );
  return created.id;
}

function vehicleLabel(listing: RetailListing): string {
  return `${listing.year} ${listing.make} ${listing.model}`.trim();
}

/**
 * Refundable deposit that holds a car until the member's visit.
 *
 * DIRECT charge on the dealer's account. Refundable in full until the retail
 * installment contract is signed, which is recorded on the payment row rather
 * than left to the dealer's memory.
 */
export async function createVisitDepositCheckout(params: {
  dealerAccountId: string;
  profileId: string;
  email?: string;
  fullName?: string;
  listing: RetailListing;
  visitId: string;
  amountCents: Money;
}): Promise<Stripe.Checkout.Session> {
  const customer = await dealerCustomer(params.dealerAccountId, params);

  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.amountCents,
            product_data: {
              name: `Refundable hold — ${vehicleLabel(params.listing)}`,
              description:
                "Holds this vehicle for your scheduled visit. Refundable in full until you sign a retail installment contract.",
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: NO_APPLICATION_FEE,
        // Save the method so the down payment and installments can reuse it.
        setup_future_usage: "off_session",
        metadata: {
          kind: "visit_deposit",
          profile_id: params.profileId,
          listing_id: params.listing.id,
          visit_id: params.visitId,
        },
      },
      metadata: {
        kind: "visit_deposit",
        profile_id: params.profileId,
        listing_id: params.listing.id,
        visit_id: params.visitId,
      },
      success_url: `${serverEnv.siteUrl}/account/visits?held=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${serverEnv.siteUrl}/marketplace/${params.listing.id}`,
    },
    { stripeAccount: params.dealerAccountId }
  );
}

/**
 * The cash down payment. DIRECT charge on the dealer's account.
 *
 * The description states the plan the down payment belongs to, because the
 * member is agreeing to a specific set of terms at this moment and the receipt
 * should say which. Reg Z trigger terms appear on the page that links here, so
 * that page carries <RegZDisclosure />.
 */
export async function createDownPaymentCheckout(params: {
  dealerAccountId: string;
  profileId: string;
  email?: string;
  fullName?: string;
  listing: RetailListing;
  plan: PaymentPlan;
  dealId?: string;
}): Promise<Stripe.Checkout.Session> {
  const customer = await dealerCustomer(params.dealerAccountId, params);
  const { plan, listing } = params;

  const description =
    plan.kind === "cash"
      ? `Payment in full for your ${vehicleLabel(listing)}.`
      : `Cash down on your ${vehicleLabel(listing)}, followed by ${plan.termMonths} monthly payments at 0% APR. No finance charge.`;

  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.downCents,
            product_data: {
              name:
                plan.kind === "cash"
                  ? `${vehicleLabel(listing)} — paid in full`
                  : `Down payment — ${vehicleLabel(listing)}`,
              description,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: NO_APPLICATION_FEE,
        // The installments are collected off-session from this method.
        setup_future_usage: plan.kind === "cash" ? undefined : "off_session",
        metadata: {
          kind: "down_payment",
          profile_id: params.profileId,
          listing_id: listing.id,
          deal_id: params.dealId ?? "",
          term_months: String(plan.termMonths),
          apr_bps: String(plan.aprBps),
        },
      },
      metadata: {
        kind: "down_payment",
        profile_id: params.profileId,
        listing_id: listing.id,
        deal_id: params.dealId ?? "",
      },
      success_url: `${serverEnv.siteUrl}/account/deals?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${serverEnv.siteUrl}/marketplace/${listing.id}`,
    },
    { stripeAccount: params.dealerAccountId }
  );
}

/**
 * The auction brokerage fee. DIRECT charge on the dealer's account.
 *
 * Dealer revenue, not ours: it pays the licence holder for bidding on the
 * member's behalf. Settling it to the platform would make us the merchant for
 * a service we do not perform and cannot perform, since we are not the party
 * holding the auction licence.
 *
 * Deliberately `mode: "payment"` and nothing else. No `setup_future_usage`:
 * this fee is a one-off and saving the card here would quietly enrol a member
 * into off-session charges for a product that has none. And no Reg Z
 * disclosure on the page that links here, because a one-off service price
 * states no down payment, no periodic payment and no finance charge — see
 * `auction-access.ts` for why that must stay true.
 */
export async function createAuctionAccessCheckout(params: {
  dealerAccountId: string;
  profileId: string;
  email?: string;
  fullName?: string;
  amountCents: Money;
  dealerName: string;
}): Promise<Stripe.Checkout.Session> {
  const customer = await dealerCustomer(params.dealerAccountId, params);

  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      customer,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: params.amountCents,
            product_data: {
              name: `Auction Access — ${params.dealerName}`,
              description:
                "Flat service fee. We bid at dealer-only wholesale auctions on your behalf under our licence. Non-refundable: it pays for the work, which is done whether or not a lot is won. The price of the car, auction buyer fees, tax, title and registration are separate.",
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: NO_APPLICATION_FEE,
        metadata: {
          kind: "auction_access",
          profile_id: params.profileId,
        },
      },
      metadata: {
        kind: "auction_access",
        profile_id: params.profileId,
      },
      success_url: `${serverEnv.siteUrl}/auction-access?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${serverEnv.siteUrl}/auction-access`,
    },
    { stripeAccount: params.dealerAccountId }
  );
}

/**
 * Collect one scheduled installment off-session. DIRECT charge, dealer account.
 *
 * Deliberately NOT a Stripe subscription. The schedule of record is the signed
 * TILA snapshot, which ends in a final payment a few cents different from the
 * rest — a fixed-price subscription cannot express that, and the payment a
 * member is billed must match the payment they were disclosed exactly. So we
 * drive collection from our own schedule and charge each installment by amount.
 */
export async function chargeInstallment(params: {
  dealerAccountId: string;
  customerId: string;
  paymentMethodId: string;
  amountCents: Money;
  dealId: string;
  installmentNumber: number;
  /** Same value on a retry, so a double-run cannot double-charge a member. */
  idempotencyKey: string;
}): Promise<Stripe.PaymentIntent> {
  return stripe().paymentIntents.create(
    {
      amount: params.amountCents,
      currency: "usd",
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      off_session: true,
      confirm: true,
      application_fee_amount: NO_APPLICATION_FEE,
      description: `Installment ${params.installmentNumber} — 0% APR retail installment contract`,
      metadata: {
        kind: "installment",
        deal_id: params.dealId,
        installment_number: String(params.installmentNumber),
      },
    },
    {
      stripeAccount: params.dealerAccountId,
      idempotencyKey: params.idempotencyKey,
    }
  );
}
