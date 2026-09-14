import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { creditBlockReason, serviceBlockReason } from "@/lib/dealers";
import { loadDealer } from "@/lib/dealer-store";
import { loadListing } from "@/lib/listing-store";
import { dealCostsFor, hasDealCostsFor } from "@/lib/deal-costs";
import { passesPlanUnderwriting, quoteListing } from "@/lib/finance";
import { createDownPaymentCheckout } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { isUnderwritable } from "@/lib/types";
import { MAX_TERM_MONTHS, MIN_TERM_MONTHS } from "@/lib/payment-slider";

/**
 * Start a down payment (or a payment in full) for one car.
 *
 * The client sends only three things: which car, how much down, and how many
 * months. It does NOT send an amount to charge. Every figure is recomputed
 * here from the listing and the state cost profile, because an amount that
 * arrives from a browser is a number an attacker chose — and because the
 * figure the member is charged has to be the same figure that was disclosed.
 */
export async function POST(request: Request) {
  let member;
  try {
    member = await requireMember(request);
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }

  const body = await request.json().catch(() => null);
  const listingId = typeof body?.listingId === "string" ? body.listingId : null;
  const downCents = Number(body?.downCents);
  const termMonths = Number(body?.termMonths);

  if (!listingId || !Number.isInteger(downCents) || downCents <= 0) {
    return NextResponse.json(
      { error: "listingId and an integer downCents are required" },
      { status: 400 }
    );
  }

  // A range rather than a menu: the payment builder lets a member choose any
  // whole number of months in range. The bounds are still enforced here and
  // not merely in the UI — a term is an input from a browser like any other,
  // and the ceiling is the underwriting cap rather than a cosmetic limit.
  const payingInFull = termMonths === 0;
  if (
    !payingInFull &&
    (!Number.isInteger(termMonths) ||
      termMonths < MIN_TERM_MONTHS ||
      termMonths > MAX_TERM_MONTHS)
  ) {
    return NextResponse.json(
      {
        error: `termMonths must be 0 (pay in full) or a whole number of months between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS}.`,
      },
      { status: 400 }
    );
  }

  const listing = await loadListing(listingId);
  if (!listing) {
    return NextResponse.json({ error: "No such vehicle" }, { status: 404 });
  }

  // ---- the interlock: nobody pays for a car the dealer does not own -------
  //
  // A "sourced" car is one we have seen advertised. Taking a down payment on
  // it would be collecting money for a vehicle nobody has title to.
  if (listing.status !== "available" && listing.status !== "reserved") {
    return NextResponse.json(
      {
        error:
          "This vehicle is still being sourced. The dealer has not acquired it, so no payment can be taken against it yet.",
        status: listing.status,
      },
      { status: 409 }
    );
  }

  const dealer = await loadDealer(listing.dealerId);
  if (!dealer) {
    return NextResponse.json({ error: "No dealer for this vehicle" }, { status: 500 });
  }
  // Which gate applies depends on what is being sold. A car paid for in full
  // is a sale; the same car over twelve payments is a credit sale, and only
  // the second needs a retail installment seller licence. Blocking a cash
  // buyer on a licence their purchase does not involve is a wrong answer that
  // merely happens to fail closed.
  const blockReason = payingInFull
    ? serviceBlockReason(dealer)
    : creditBlockReason(dealer);
  if (blockReason || !dealer.stripeAccountId) {
    // 503, not 400: the member did nothing wrong and the answer may change.
    return NextResponse.json(
      { error: blockReason ?? "This dealer has no connected account." },
      { status: 503 }
    );
  }

  if (!hasDealCostsFor(listing.state)) {
    return NextResponse.json(
      {
        error: `No tax, title and fee profile exists for ${listing.state}, so an out-the-door price cannot be quoted there.`,
      },
      { status: 503 }
    );
  }

  // ---- recompute every figure server-side --------------------------------
  const costs = dealCostsFor(listing.state);
  const quote = quoteListing(
    listing,
    costs,
    downCents,
    payingInFull ? [] : [termMonths]
  );
  const plan = payingInFull
    ? quote.plans.find((p) => p.kind === "cash")!
    : quote.plans.find((p) => p.termMonths === termMonths);

  if (!plan) {
    return NextResponse.json({ error: "No such plan" }, { status: 400 });
  }

  if (!payingInFull) {
    if (downCents < quote.minDownCents) {
      return NextResponse.json(
        {
          error: "Down payment is below the minimum for this vehicle.",
          minDownCents: quote.minDownCents,
        },
        { status: 422 }
      );
    }
    if (downCents > quote.outTheDoorCents) {
      return NextResponse.json(
        { error: "Down payment exceeds the out-the-door price." },
        { status: 422 }
      );
    }

    // Capacity, not FICO — but capacity has to have actually been verified.
    if (!isUnderwritable(member)) {
      return NextResponse.json(
        {
          error:
            "Income and identity must be verified before a financed deal can be started.",
        },
        { status: 403 }
      );
    }

    const gate = passesPlanUnderwriting(
      quote,
      plan,
      member.grossMonthlyIncomeCents ?? 0
    );
    if (!gate.ok) {
      return NextResponse.json(
        { error: "This plan does not clear underwriting.", reasons: gate.reasons },
        { status: 422 }
      );
    }
  }

  const session = await createDownPaymentCheckout({
    dealerAccountId: dealer.stripeAccountId,
    profileId: member.id,
    email: member.email,
    fullName: member.fullName,
    listing,
    plan,
  });

  // Record the intent before the member reaches Stripe, so a completed payment
  // always has a row to reconcile against even if the webhook arrives first.
  await supabaseAdmin()
    .from("payments")
    .insert({
      profile_id: member.id,
      kind: "down_payment",
      amount_cents: plan.downCents,
      status: "requires_payment",
      connected_account_id: dealer.stripeAccountId,
      stripe_checkout_session_id: session.id,
      listing_id: listing.id,
      // Refundable until a retail installment contract is signed. It becomes
      // the member's cash down at signature, not at checkout.
      refundable_until_signature: true,
    });

  return NextResponse.json({
    url: session.url,
    quote: {
      outTheDoorCents: quote.outTheDoorCents,
      downCents: plan.downCents,
      termMonths: plan.termMonths,
      monthlyPaymentCents: plan.monthlyPaymentCents,
      finalPaymentCents: plan.finalPaymentCents,
      totalOfPaymentsCents: plan.totalOfPaymentsCents,
      financeChargeCents: plan.financeChargeCents,
      aprBps: plan.aprBps,
    },
  });
}
