import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { loadDealer } from "@/lib/dealer-store";
import { loadListing } from "@/lib/listing-store";
import { supabaseAdmin } from "@/lib/supabase";
import { availableSlots, SLOT_MINUTES, MIN_LEAD_HOURS } from "@/lib/visits";

/**
 * Book a visit to see and drive a specific car.
 *
 * This is the appointment the money hangs off: the member comes to the lot,
 * drives the car, and — only there, and only if they still want it — signs the
 * contract. Nothing about booking commits them to buying.
 */

/** A car you cannot go and look at is not one you can book a visit for. */
const VISITABLE = new Set(["acquired", "available", "reserved"]);

export async function GET(request: Request) {
  const listingId = new URL(request.url).searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
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

  if (!listingId || !scheduledAt) {
    return NextResponse.json(
      { error: "listingId and scheduledAt are required" },
      { status: 400 }
    );
  }

  const listing = await loadListing(listingId);
  if (!listing) return NextResponse.json({ error: "No such vehicle" }, { status: 404 });
  if (!VISITABLE.has(listing.status)) {
    return NextResponse.json(
      { error: "This car is still being sourced and cannot be viewed yet." },
      { status: 409 }
    );
  }

  const dealer = await loadDealer(listing.dealerId);
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
      listing_id: listing.id,
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
      return NextResponse.json(
        {
          error:
            "Someone else booked this car moments ago. It is held for them until their visit.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visit: data });
}
