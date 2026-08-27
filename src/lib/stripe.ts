import "server-only";
import Stripe from "stripe";
import { serverEnv } from "./env";
import type { Money, PaymentPlan, RetailListing } from "./types";

/**
 * Stripe, arranged so that the money rule is structural rather than advisory.
 *
 * There are exactly two destinations in this file and they are never mixed:
 *
 *   PLATFORM ACCOUNT — the membership subscription. That is DealerCars revenue
 *   for software, which we are entitled to bill for.
 *
 *   DEALER CONNECTED ACCOUNT — every dollar attached to a car: the visit
 *   deposit, the down payment, and every installment. These are created as
 *   DIRECT charges on the dealer's account, so the funds settle to the dealer
 *   and never rest in a DealerCars balance. That is the line between being
 *   software and being a money transmitter, and it is why each function below
 *   takes a `dealerAccountId` it cannot default.
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
 * Zero by design. The business model is the membership subscription; the car
 * transaction is the dealer's. Introducing a fee here is a pricing decision
 * with tax and disclosure consequences, so it is an explicit argument rather
 * than a default someone can turn on by accident.
 */
const NO_APPLICATION_FEE = undefined;

/** Apple Pay note — see `wallets` in the README. Nothing to configure here:
 *  Stripe-hosted Checkout renders the Apple Pay sheet automatically on a
 *  supported device, and because the page is served from checkout.stripe.com
 *  it needs no per-dealer Apple Pay domain registration. Omitting
 *  `payment_method_types` is what enables the wallet set; do not add it back. */

// ------------------------------------------------------------- membership

/**
 * Subscription for auction access. PLATFORM account — this one is ours.
 */
export async function createMembershipCheckout(params: {
  profileId: string;
  privyDid: string;
  email?: string;
  stripeCustomerId?: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: serverEnv.stripeMembershipPriceId, quantity: 1 }],
    customer: params.stripeCustomerId,
    customer_email: params.stripeCustomerId ? undefined : params.email,
    client_reference_id: params.profileId,
    subscription_data: {
      metadata: { profile_id: params.profileId, privy_did: params.privyDid },
    },
    metadata: {
      kind: "membership",
      profile_id: params.profileId,
      privy_did: params.privyDid,
    },
    success_url: `${serverEnv.siteUrl}/account?membership=active&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${serverEnv.siteUrl}/account?membership=canceled`,
  });
}

// ----------------------------------------------------------- dealer money

/**
 * Find or create the member's Customer ON THE DEALER'S ACCOUNT.
 *
 * Customers do not cross account boundaries, and the installment mandate has
 * to live with the party that holds the paper. So the member ends up with a
 * platform customer for the subscription and a separate dealer customer for
 * the car — which is not duplication, it is the two relationships being
 * genuinely different.
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
      cancel_url: `${serverEnv.siteUrl}/cars/${params.listing.id}`,
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
      cancel_url: `${serverEnv.siteUrl}/cars/${listing.id}`,
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
