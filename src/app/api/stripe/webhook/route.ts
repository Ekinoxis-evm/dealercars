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
 * One endpoint receives both:
 *   - PLATFORM events (the membership subscription), where `event.account` is
 *     absent, and
 *   - CONNECTED events (deposits, down payments, installments), where
 *     `event.account` names the dealer the money settled to.
 *
 * The account is recorded rather than ignored, because "which dealer holds
 * this money" is the question the whole licensing posture rests on.
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

      if (kind === "membership") {
        const profileId = session.metadata?.profile_id ?? session.client_reference_id;
        if (!profileId) break;
        await db
          .from("profiles")
          .update({
            membership_status: "active",
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : undefined,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : undefined,
          })
          .eq("id", profileId);

        await db.from("payments").insert({
          profile_id: profileId,
          kind: "membership",
          amount_cents: session.amount_total ?? 0,
          status: "succeeded",
          // Explicitly null: the subscription is platform revenue, and the
          // check constraint enforces that this stays null.
          connected_account_id: null,
          stripe_checkout_session_id: session.id,
          refundable_until_signature: false,
        });
        break;
      }

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

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const profileId = subscription.metadata?.profile_id;
      if (!profileId) break;

      // Map Stripe's status vocabulary onto ours. Anything we do not
      // recognise is treated as "not entitled" rather than silently active.
      const status =
        subscription.status === "active"
          ? "active"
          : subscription.status === "trialing"
            ? "trialing"
            : subscription.status === "past_due" ||
                subscription.status === "unpaid"
              ? "past_due"
              : "canceled";

      await db
        .from("profiles")
        .update({ membership_status: status })
        .eq("id", profileId);
      break;
    }

    default:
      // Unhandled events are acknowledged, not retried forever.
      break;
  }
}
