import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { loadListing } from "@/lib/listing-store";
import {
  ownershipProblem,
  parseListingInput,
  quotableState,
} from "@/lib/listing-input";
import { supabaseAdmin } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const listing = await loadListing((await params).id);
  if (!listing) {
    return NextResponse.json({ error: "No such car" }, { status: 404 });
  }
  return NextResponse.json({ listing });
}

/**
 * Edit a car.
 *
 * The ownership interlock is checked against the row as it will be AFTER the
 * patch, not against the patch alone. Sending `{status: "available"}` on its
 * own has to be evaluated against the acquisition record already stored, or an
 * admin could open checkout on a car we do not own by omitting a field.
 */
export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const id = (await params).id;
  const body = await request.json().catch(() => null);
  const parsed = parseListingInput(body, "update");
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "That change could not be saved.", reasons: parsed.errors },
      { status: 400 }
    );
  }

  const db = supabaseAdmin();

  const { data: current, error: readError } = await db
    .from("listings")
    .select("id, status, acquired_at, acquired_price_cents, state")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!current) {
    return NextResponse.json({ error: "No such car" }, { status: 404 });
  }

  const merged = { ...current, ...parsed.value };
  const problem = ownershipProblem(merged);
  if (problem) {
    return NextResponse.json(
      { error: problem, reasons: [problem] },
      { status: 409 }
    );
  }

  const { error } = await db
    .from("listings")
    .update({ ...parsed.value, updated_by: admin.admin.privyDid })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const state = merged.state as string | undefined;
  return NextResponse.json({
    ok: true,
    warning: quotableState(state)
      ? undefined
      : `There is no tax, title and fee profile for ${state}, so this car cannot be quoted.`,
  });
}

/**
 * Remove a car.
 *
 * Photographs go with it — `listing_photos` cascades — but the files in storage
 * do not cascade, so they are deleted here first. Doing it in this order means
 * a storage failure aborts the whole delete rather than leaving a listing whose
 * photos are already gone.
 *
 * A car that has taken money cannot be deleted at all. `payments.listing_id`
 * has no cascade, so Postgres refuses, and that refusal is correct: the payment
 * record is the evidence of what was sold, and deleting the car would orphan
 * it. Mark such a car `sold` instead.
 */
export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const id = (await params).id;
  const db = supabaseAdmin();

  const { data: photos } = await db
    .from("listing_photos")
    .select("storage_path")
    .eq("listing_id", id);

  if (photos?.length) {
    const { error: storageError } = await db.storage
      .from("listing-photos")
      .remove(photos.map((p) => p.storage_path));
    if (storageError) {
      return NextResponse.json(
        { error: `Could not delete the photographs: ${storageError.message}` },
        { status: 500 }
      );
    }
  }

  const { error } = await db.from("listings").delete().eq("id", id);

  if (error) {
    // 23503 foreign_key_violation — something references this car. Almost
    // always a payment or a deal, both of which are records we must keep.
    if (error.code === "23503") {
      return NextResponse.json(
        {
          error:
            "This car has payments or deals attached to it and cannot be deleted. Mark it sold instead — the payment record is the evidence of what was sold.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
