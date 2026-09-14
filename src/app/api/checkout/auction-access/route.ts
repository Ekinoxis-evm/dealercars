import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { canAcceptPayments, dealerBlockReason, OPERATING_DEALER_ID } from "@/lib/dealers";
import { loadDealer } from "@/lib/dealer-store";
import {
  AUCTION_ACCESS_FEE_CENTS,
  AUCTION_ACCESS_REFUNDABLE,
} from "@/lib/auction-access";
import { createAuctionAccessCheckout } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Whether this member already has Auction Access.
 *
 * Read from the payments table rather than from a redirect: a browser arriving
 * back on ?paid=1 proves nothing, and the webhook is the only thing permitted
 * to move a payment to "succeeded". This is the same fact the visits route
 * checks before it will book the broker's time, so the UI and the booking gate
 * cannot disagree about who has paid.
 */
export async function GET(request: Request) {
  let member;
  try {
    member = await requireMember(request);
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }

  const { data } = await supabaseAdmin()
    .from("payments")
    .select("id, status")
    .eq("profile_id", member.id)
    .eq("kind", "auction_access")
    .in("status", ["requires_payment", "processing", "succeeded"])
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  return NextResponse.json({
    active: row?.status === "succeeded",
    // A started-but-unfinished checkout, so the UI can say "still clearing"
    // instead of offering to sell the same thing twice.
    pending: row !== undefined && row.status !== "succeeded",
    feeCents: AUCTION_ACCESS_FEE_CENTS,
  });
}

/**
 * Buy Auction Access.
 *
 * The client sends nothing but its session. There is no amount in the request
 * body and there must never be one: the fee is a constant this route reads for
 * itself, because a price that arrives from a browser is a price an attacker
 * chose. The same rule as the down-payment route, and easier to hold here
 * because there is only one number.
 *
 * The dealer gate applies exactly as it does to car money. This fee pays a
 * licence holder to bid on someone's behalf, so a dealer whose licence is not
 * verified, or whose Stripe account cannot take charges, cannot sell it — they
 * would be taking money for a service they are not currently permitted to
 * perform.
 */
export async function POST(request: Request) {
  let member;
  try {
    member = await requireMember(request);
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }

  const dealer = await loadDealer(OPERATING_DEALER_ID);
  if (!dealer) {
    return NextResponse.json({ error: "No dealer is configured." }, { status: 500 });
  }
  if (!canAcceptPayments(dealer) || !dealer.stripeAccountId) {
    // 503, not 400: the member did nothing wrong and the answer may change.
    return NextResponse.json({ error: dealerBlockReason(dealer) }, { status: 503 });
  }

  // One live purchase at a time. Somebody who has already paid and not yet been
  // seen should book their appointment, not buy the service twice.
  const { data: existing } = await supabaseAdmin()
    .from("payments")
    .select("id")
    .eq("profile_id", member.id)
    .eq("kind", "auction_access")
    .in("status", ["requires_payment", "processing", "succeeded"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      {
        error:
          "You have already bought Auction Access. Book your appointment below, or call us if you need a second one.",
      },
      { status: 409 }
    );
  }

  const session = await createAuctionAccessCheckout({
    dealerAccountId: dealer.stripeAccountId,
    profileId: member.id,
    email: member.email,
    fullName: member.fullName,
    amountCents: AUCTION_ACCESS_FEE_CENTS,
    dealerName: dealer.dbaName ?? dealer.legalName,
  });

  // Record the intent before the member reaches Stripe, so a completed payment
  // always has a row to reconcile against even if the webhook arrives first.
  await supabaseAdmin()
    .from("payments")
    .insert({
      profile_id: member.id,
      kind: "auction_access",
      amount_cents: AUCTION_ACCESS_FEE_CENTS,
      status: "requires_payment",
      connected_account_id: dealer.stripeAccountId,
      stripe_checkout_session_id: session.id,
      // No listing: the whole point is that the car does not exist yet.
      listing_id: null,
      refundable_until_signature: AUCTION_ACCESS_REFUNDABLE,
    });

  return NextResponse.json({ url: session.url });
}
