import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Stripe webhook. The only place a payment is allowed to become "succeeded".
 *
 * A browser returning to a success_url proves nothing — the member can close
 * the tab, the redirect can be forged, and the network can drop. Money state
 * moves here, from a signature-verified event, or it does not move.
 *
 * Every event here is a CONNECTED-account event — deposits, down payments,
 * installments — where `event.account` names the dealer the money settled to.
 * The account is recorded rather than ignored, because "which dealer holds
 * this money" is the question the whole licensing posture rests on, and an
 * event arriving with no account is a payment we did not intend to take.
 */

/** Raw body required: the signature is computed over the exact bytes. */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      serverEnv.stripeWebhookSecret
    );
  } catch (err) {
    // Never process an unverified payload. An attacker who could post here
    // unverified could mark any deal funded.
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    await handle(event);
  } catch (err) {
    // 500 makes Stripe retry, which is what we want for a transient database
    // failure. Returning 200 on error would silently drop the event.
    console.error(`[stripe-webhook] ${event.type} ${event.id} failed`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handle(event: Stripe.Event): Promise<void> {
  const db = supabaseAdmin();
  /** Present on connected-account events; absent on platform events. */
  const account = event.account;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const kind = session.metadata?.kind;

      // Dealer-side money. The row was created when checkout started; this
      // marks it paid and records the account it actually settled to.
      await db
        .from("payments")
        .update({
          status: "succeeded",
          connected_account_id: account ?? null,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
        })
        .eq("stripe_checkout_session_id", session.id);

      if (kind === "visit_deposit" && session.metadata?.visit_id) {
        await db
          .from("visits")
          .update({ status: "confirmed" })
          .eq("id", session.metadata.visit_id);
      }

      if (kind === "down_payment" && session.metadata?.listing_id) {
        // The car is now held for this member. It is NOT sold — that happens
        // when the contract is signed at the visit.
        await db
          .from("listings")
          .update({ status: "reserved" })
          .eq("id", session.metadata.listing_id)
          .eq("status", "available");
      }
      break;
    }

    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db
        .from("payments")
        .update({ status: "succeeded", connected_account_id: account ?? null })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await db
        .from("payments")
        .update({ status: "failed" })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent !== "string") break;
      await db
        .from("payments")
        .update({ status: "refunded", refunded_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", charge.payment_intent);
      break;
    }

    case "account.updated": {
      // The dealer moved through (or fell out of) Stripe onboarding.
      //
      // This is the event that opens and closes the payment gate. Stripe is
      // the authority on whether an account may take charges, so we mirror its
      // verdict rather than inferring one — and because we mirror it in both
      // directions, an account Stripe later restricts stops being able to take
      // a member's money without anyone having to notice.
      const acct = event.data.object as Stripe.Account;
      await db
        .from("dealers")
        .update({
          stripe_charges_enabled: acct.charges_enabled ?? false,
          stripe_payouts_enabled: acct.payouts_enabled ?? false,
        })
        .eq("stripe_account_id", acct.id);
      break;
    }

    default:
      // Unhandled events are acknowledged, not retried forever.
      break;
  }
}
