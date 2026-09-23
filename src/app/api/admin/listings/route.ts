import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listAllForAdmin } from "@/lib/listing-store";
import {
  ownershipProblem,
  parseListingInput,
  quotableState,
} from "@/lib/listing-input";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * The operator's view of the lot, and the way a car gets onto it.
 *
 * Admin-only in both directions, and the read matters as much as the write:
 * this response carries `acquisitionTargetCents`, which is what we intend to
 * pay a private seller. That figure reaching a member — or the seller — costs
 * real money on the next car.
 */

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    return NextResponse.json({ listings: await listAllForAdmin() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load inventory." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = parseListingInput(body, "create");
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "That car could not be saved.", reasons: parsed.errors },
      { status: 400 }
    );
  }

  const problem = ownershipProblem(parsed.value);
  if (problem) {
    return NextResponse.json(
      { error: problem, reasons: [problem] },
      { status: 409 }
    );
  }

  const { data, error } = await supabaseAdmin()
    .from("listings")
    .insert({ ...parsed.value, updated_by: admin.admin.id })
    .select("id")
    .single();

  if (error) {
    // 23505 unique_violation — an id that is already taken is an operator
    // mistake worth naming, not a 500.
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(
    {
      id: data.id,
      // Not an error, but the admin should know before they photograph a car
      // they cannot price: an unmapped state has no tax/title profile, so the
      // listing page will decline to show an out-the-door figure.
      warning: quotableState(parsed.value.state)
        ? undefined
        : `There is no tax, title and fee profile for ${parsed.value.state}, so this car cannot be quoted yet.`,
    },
    { status: 201 }
  );
}
