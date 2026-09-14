import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { loadDealer } from "@/lib/dealer-store";
import { OPERATING_DEALER_ID } from "@/lib/dealers";
import { loadListing } from "@/lib/listing-store";
import { supabaseAdmin } from "@/lib/supabase";
import { availableSlots, SLOT_MINUTES, MIN_LEAD_HOURS } from "@/lib/visits";

/**
 * Book an appointment at the dealer's office.
 *
 * Two kinds, and the distinction is in the database rather than in the caller:
 *
 *   TEST DRIVE — about one specific car, and the appointment the car money
 *   hangs off. The member comes to the lot, drives it, and only there signs
 *   the contract. Booking commits them to nothing.
 *
 *   AUCTION ACCESS — no car, because the car does not exist yet. This is where
 *   the member and the broker agree what to look for and what to stop at,
 *   before anything is bid on.
 *
 * `visit_kind_matches_listing` enforces that a test drive has a listing and an
 * auction-access appointment does not, so neither can be booked in the other's
 * shape by a caller that forgets.
 */

/** A car you cannot go and look at is not one you can book a visit for. */
const VISITABLE = new Set(["acquired", "available", "reserved"]);

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get("listingId");

  // No listing means an auction-access appointment. Its slots come from the
  // operating dealer's own diary rather than from a car's.
  if (!listingId) {
    const dealer = await loadDealer(OPERATING_DEALER_ID);
    if (!dealer) return NextResponse.json({ error: "No dealer" }, { status: 500 });

    const { data: booked } = await supabaseAdmin()
      .from("visits")
      .select("scheduled_at")
      .eq("dealer_id", dealer.id)
      .in("status", ["requested", "confirmed"]);

    const taken = new Set(
      (booked ?? []).map((row: { scheduled_at: string }) =>
        new Date(row.scheduled_at).toISOString()
      )
    );

    return NextResponse.json({
      slots: availableSlots({ timeZone: dealer.timeZone, taken }),
      timeZone: dealer.timeZone,
      durationMinutes: SLOT_MINUTES,
      minLeadHours: MIN_LEAD_HOURS,
    });
  }

  const listing = await loadListing(listingId);
  if (!listing) return NextResponse.json({ error: "No such vehicle" }, { status: 404 });

  const dealer = await loadDealer(listing.dealerId);
  if (!dealer) return NextResponse.json({ error: "No dealer" }, { status: 500 });

  if (!VISITABLE.has(listing.status)) {
    return NextResponse.json({
      slots: [],
      unavailableReason:
        "This car is still being sourced — the dealer has not acquired it yet, so there is nothing to come and see.",
      timeZone: dealer.timeZone,
    });
  }

  // Slots already taken for this car, so the picker does not offer them.
  const { data: booked } = await supabaseAdmin()
    .from("visits")
    .select("scheduled_at")
    .eq("listing_id", listingId)
    .in("status", ["requested", "confirmed"]);

  const taken = new Set(
    (booked ?? []).map((row: { scheduled_at: string }) =>
      new Date(row.scheduled_at).toISOString()
    )
  );

  return NextResponse.json({
    slots: availableSlots({ timeZone: dealer.timeZone, taken }),
    timeZone: dealer.timeZone,
    durationMinutes: SLOT_MINUTES,
    minLeadHours: MIN_LEAD_HOURS,
  });
}

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
  const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : null;
  const memberNote = typeof body?.memberNote === "string" ? body.memberNote.slice(0, 500) : null;

  if (!scheduledAt) {
    return NextResponse.json({ error: "scheduledAt is required" }, { status: 400 });
  }

  // No listing means an auction-access appointment.
  const isAuctionAccess = listingId === null;

  let dealerId: string;
  if (isAuctionAccess) {
    // The service must actually have been paid for. Booking the broker's time
    // is the second half of a transaction, not a free lead form — and the
    // webhook is the only thing allowed to mark a payment succeeded, so this
    // reads the state that money actually moved rather than trusting a return
    // from Stripe's success_url.
    const { data: paid } = await supabaseAdmin()
      .from("payments")
      .select("id")
      .eq("profile_id", member.id)
      .eq("kind", "auction_access")
      .eq("status", "succeeded")
      .limit(1);

    if (!paid || paid.length === 0) {
      return NextResponse.json(
        {
          error:
            "Auction Access has not been paid for on this account yet. If you have just paid, give it a moment and refresh.",
        },
        { status: 402 }
      );
    }
    dealerId = OPERATING_DEALER_ID;
  } else {
    const listing = await loadListing(listingId);
    if (!listing) return NextResponse.json({ error: "No such vehicle" }, { status: 404 });
    if (!VISITABLE.has(listing.status)) {
      return NextResponse.json(
        { error: "This car is still being sourced and cannot be viewed yet." },
        { status: 409 }
      );
    }
    dealerId = listing.dealerId;
  }

  const dealer = await loadDealer(dealerId);
  if (!dealer) return NextResponse.json({ error: "No dealer" }, { status: 500 });

  // The slot must be one we actually offered. Accepting an arbitrary timestamp
  // would let a member book 3am on a Sunday.
  const requested = new Date(scheduledAt);
  if (Number.isNaN(requested.getTime())) {
    return NextResponse.json({ error: "scheduledAt is not a date" }, { status: 400 });
  }
  const offered = availableSlots({ timeZone: dealer.timeZone });
  if (!offered.some((s) => s.startsAt === requested.toISOString())) {
    return NextResponse.json(
      {
        error:
          "That time is not an available appointment. Pick one of the offered slots.",
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("visits")
    .insert({
      profile_id: member.id,
      kind: isAuctionAccess ? "auction_access" : "test_drive",
      listing_id: isAuctionAccess ? null : listingId,
      dealer_id: dealer.id,
      scheduled_at: requested.toISOString(),
      time_zone: dealer.timeZone,
      duration_minutes: SLOT_MINUTES,
      status: "requested",
      member_note: memberNote,
    })
    .select("id, scheduled_at, time_zone, status")
    .single();

  if (error) {
    // The partial unique index on (listing_id) where status is live. Someone
    // else booked this car between the page render and this insert.
    if (error.code === "23505") {
      // Two partial unique indexes can raise this: one live hold per car, and
      // one live auction-access appointment per member.
      return NextResponse.json(
        {
          error: isAuctionAccess
            ? "You already have an appointment booked. Call us if you need to move it."
            : "Someone else booked this car moments ago. It is held for them until their visit.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visit: data });
}
