import { NextResponse } from "next/server";
import { loadListing } from "@/lib/listing-store";
import { dealCostsFor, hasDealCostsFor } from "@/lib/deal-costs";
import { quoteListing } from "@/lib/finance";
import { minDownFor } from "@/lib/finance";
import { OFFERED_TERMS_MONTHS } from "@/lib/types";
import { MAX_TERM_MONTHS, MIN_TERM_MONTHS } from "@/lib/payment-slider";

/**
 * Price one car at a given down payment. Public — this is the shop window, and
 * it holds no personal data.
 *
 * The figures are computed here rather than in the browser so that the number
 * a member is shown and the number they are charged come from one place. A
 * calculator that does its own arithmetic client-side will eventually disagree
 * with the server by a cent, and a cent of disagreement in a disclosed payment
 * is a Reg Z problem.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const listingId = params.get("listingId");
  const downRaw = params.get("downCents");
  const termRaw = params.get("termMonths");

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const listing = await loadListing(listingId);
  if (!listing) {
    return NextResponse.json({ error: "No such vehicle" }, { status: 404 });
  }

  if (!hasDealCostsFor(listing.state)) {
    return NextResponse.json(
      {
        error: `No tax, title and fee profile exists for ${listing.state}. An out-the-door price cannot be quoted there yet.`,
      },
      { status: 503 }
    );
  }

  const costs = dealCostsFor(listing.state);

  // Default the down payment to the underwriting floor rather than to zero, so
  // the first thing a member sees is a plan they could actually be approved for.
  const provisional = quoteListing(listing, costs, 0);
  const downCents = downRaw !== null
    ? Number(downRaw)
    : minDownFor(provisional.outTheDoorCents);

  if (!Number.isInteger(downCents) || downCents < 0) {
    return NextResponse.json(
      { error: "downCents must be a non-negative integer number of cents" },
      { status: 400 }
    );
  }
  if (downCents > provisional.outTheDoorCents) {
    return NextResponse.json(
      {
        error: "Down payment exceeds the out-the-door price.",
        outTheDoorCents: provisional.outTheDoorCents,
      },
      { status: 422 }
    );
  }

  // A term may be named explicitly, because the payment builder no longer
  // offers a fixed menu — a member picks any term in range and the plan is
  // quoted for it. Absent, the presets are quoted as before.
  let terms: readonly number[] = OFFERED_TERMS_MONTHS;
  if (termRaw !== null) {
    const termMonths = Number(termRaw);
    if (
      !Number.isInteger(termMonths) ||
      termMonths < MIN_TERM_MONTHS ||
      termMonths > MAX_TERM_MONTHS
    ) {
      return NextResponse.json(
        {
          error: `termMonths must be a whole number of months between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS}.`,
        },
        { status: 400 }
      );
    }
    terms = [termMonths];
  }

  const quote = quoteListing(listing, costs, downCents, terms);

  return NextResponse.json({
    quote,
    offeredTerms: terms,
    // Stated plainly so the UI never has to infer it from an APR of zero.
    interestFree: true,
  });
}
