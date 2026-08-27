import { NextResponse } from "next/server";
import { requireMember, Unauthorized, unauthorizedResponse } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { SUPPORTED_STATES } from "@/lib/deal-costs";
import type { EmploymentType } from "@/lib/types";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "w2_fulltime",
  "w2_parttime",
  "1099",
  "cash",
  "benefits",
  "self_employed",
];

export async function GET(request: Request) {
  try {
    return NextResponse.json({ profile: await requireMember(request) });
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }
}

/**
 * Update the member's own profile.
 *
 * Note what is NOT writable here: the three verification statuses, membership
 * status, and the Stripe ids. A member stating an income is an application,
 * not a verification — letting a PATCH set `income_verification: 'verified'`
 * would turn the underwriting gate into a formality. Those columns move only
 * from the verification and webhook paths.
 */
export async function PATCH(request: Request) {
  let member;
  try {
    member = await requireMember(request);
  } catch (e) {
    if (e instanceof Unauthorized) return unauthorizedResponse();
    throw e;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const errors: string[] = [];

  const text = (key: string, column: string, max = 200) => {
    const value = body[key];
    if (value === undefined) return;
    if (value === null || value === "") {
      update[column] = null;
      return;
    }
    if (typeof value !== "string" || value.length > max) {
      errors.push(`${key} must be a string of at most ${max} characters`);
      return;
    }
    update[column] = value.trim();
  };

  text("fullName", "full_name");
  text("addressLine1", "address_line1");
  text("addressLine2", "address_line2");
  text("city", "city", 100);
  text("postalCode", "postal_code", 12);
  text("employerName", "employer_name");

  if (body.state !== undefined) {
    const state = String(body.state).toUpperCase();
    if (state.length !== 2) errors.push("state must be a two-letter code");
    else update.state = state;
  }

  if (body.employmentType !== undefined) {
    if (!EMPLOYMENT_TYPES.includes(body.employmentType)) {
      errors.push(`employmentType must be one of ${EMPLOYMENT_TYPES.join(", ")}`);
    } else {
      update.employment_type = body.employmentType;
    }
  }

  // Money in, money out: integer cents only. A string of dollars from a form
  // is a rounding error waiting to be disclosed.
  const cents = (key: string, column: string, max: number) => {
    const value = body[key];
    if (value === undefined) return;
    if (!Number.isInteger(value) || value < 0 || value > max) {
      errors.push(`${key} must be an integer number of cents between 0 and ${max}`);
      return;
    }
    update[column] = value;
  };

  cents("grossMonthlyIncomeCents", "gross_monthly_income_cents", 100_000_00);
  cents("statedDownCents", "stated_down_cents", 100_000_00);
  cents("statedMonthlyCents", "stated_monthly_cents", 10_000_00);

  if (body.monthsAtEmployer !== undefined) {
    if (!Number.isInteger(body.monthsAtEmployer) || body.monthsAtEmployer < 0) {
      errors.push("monthsAtEmployer must be a non-negative integer");
    } else {
      update.months_at_employer = body.monthsAtEmployer;
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: "Invalid profile", reasons: errors }, { status: 422 });
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ profile: member });
  }

  // A stated income has changed, so any prior verification of it is stale.
  if (update.gross_monthly_income_cents !== undefined) {
    update.income_verification = "unverified";
  }
  if (update.address_line1 !== undefined || update.state !== undefined) {
    update.residence_verification = "unverified";
  }

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update(update)
    .eq("id", member.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const refreshed = await requireMember(request);
  return NextResponse.json({
    profile: refreshed,
    // Tell the member plainly if we cannot price a car where they live.
    supportedState: refreshed.state
      ? SUPPORTED_STATES.includes(refreshed.state)
      : null,
  });
}
