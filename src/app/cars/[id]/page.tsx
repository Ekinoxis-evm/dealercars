import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadListing } from "@/lib/listing-store";
import { dealCostsFor, hasDealCostsFor } from "@/lib/deal-costs";
import { minDownFor, quoteListing, formatMoney } from "@/lib/finance";
import { clampDown, downBounds } from "@/lib/payment-slider";
import { loadDealer } from "@/lib/dealer-store";
import { dealerBlockReason } from "@/lib/dealers";
import { PlanPicker, VisitScheduler } from "@/components/privy-deferred";
import { CarGallery } from "@/components/CarGallery";

/**
 * Rendered on demand and cached for a minute, rather than statically generated.
 *
 * Inventory now lives in the database, so the set of cars is not known at build
 * time and a price or a status can change on a weekday afternoon. Sixty seconds
 * is the staleness we accept on a marketing page; it is not the enforcement
 * boundary. Whether money may actually be taken is re-decided server-side on
 * every request in the down-payment route, against the same row.
 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const listing = await loadListing((await params).id);
  if (!listing) return { title: "Car not found — DealerCars" };
  return {
    title: `${listing.year} ${listing.make} ${listing.model} — DealerCars`,
    description: `${listing.mileage.toLocaleString("en-US")} miles, ${listing.city}, ${listing.state}. Cash down and interest-free monthly payments.`,
    // Deliberately no down payment or monthly figure in the description: a
    // share card is an advertisement, and a trigger term there would need the
    // Reg Z disclosure alongside it, which a meta description cannot carry.
    openGraph: listing.photos[0]
      ? { images: [{ url: listing.photos[0].url }] }
      : undefined,
  };
}

export default async function CarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const listing = await loadListing((await params).id);
  if (!listing) notFound();

  const dealer = await loadDealer(listing.dealerId);
  const priceable = hasDealCostsFor(listing.state);
  const costs = dealCostsFor(listing.state);
  // Quote at the down payment the slider will actually start on, not at the
  // raw 18% floor. The two differ by a few dollars once the floor is rounded up
  // onto the slider's grid, and quoting at the raw figure would make the first
  // paint show a payment the picker corrects a beat later.
  const provisional = quoteListing(listing, costs, 0);
  const minDownCents = minDownFor(provisional.outTheDoorCents);
  const startingDownCents = clampDown(
    minDownCents,
    downBounds(minDownCents, provisional.outTheDoorCents)
  );
  const quote = quoteListing(listing, costs, startingDownCents);

  const blockReason = dealer ? dealerBlockReason(dealer) : "No dealer is assigned to this car.";
  const isSourced = listing.status === "sourced";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* ------------------------------------------------------ heading */}
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          {listing.source === "street" ? "Sourced privately" : "Dealer lot"}
          {" · "}
          {listing.city}, {listing.state}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {listing.year} {listing.make} {listing.model}
        </h1>
        <p className="mt-1 font-serif text-lg text-ink-muted">
          {listing.trim} &middot;{" "}
          <span className="tnum">{listing.mileage.toLocaleString("en-US")}</span>{" "}
          miles &middot; {listing.transmission} &middot; {listing.exteriorColor} over{" "}
          {listing.interiorColor}
        </p>

        {priceable && (
          <p className="mt-4 font-serif text-lg leading-relaxed">
            <span className="tnum font-display text-2xl font-extrabold tracking-tight">
              {formatMoney(quote.outTheDoorCents, { cents: true })}
            </span>{" "}
            out the door &mdash; tax, title, registration and doc fee included.
            No interest on any payment plan.
          </p>
        )}
      </header>

      {/* ------------------------------------------------------ gallery */}
      <CarGallery
        photos={listing.photos}
        label={`${listing.year} ${listing.make} ${listing.model}`}
      />

      {/* ---------------------------------------------------- interlock */}
      {isSourced && (
        <div className="mt-6 border-l-2 border-accent bg-paper-raised px-4 py-4 sm:px-6">
          <h2 className="font-display text-base font-bold tracking-tight">
            This car is being sourced, not sold yet.
          </h2>
          <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
            It is a private-party listing we have not bought yet. Nobody can
            take a payment on a car nobody holds title to, so checkout is closed
            until we acquire it, have it inspected, and put it on the lot. The
            figures below are what it will cost when that happens.
          </p>
        </div>
      )}

      {blockReason && !isSourced && (
        <div className="mt-6 border-l-2 border-accent bg-paper-raised px-4 py-4 sm:px-6">
          <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
            {blockReason}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* ------------------------------------------------------ left */}
        <div className="flex flex-col gap-8">
          {priceable ? (
            <PlanPicker listing={listing} initialQuote={quote} />
          ) : (
            <section className="border border-rule-strong bg-paper-raised px-4 py-5 sm:px-6">
              <h2 className="font-display text-lg font-extrabold tracking-tight">
                We can&rsquo;t price this car yet.
              </h2>
              <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                There is no tax, title and fee profile for {listing.state}, so
                any out-the-door figure would be a guess. We would rather show
                nothing than show a number that changes at signing.
              </p>
            </section>
          )}

          <VisitScheduler listingId={listing.id} />
        </div>

        {/* ----------------------------------------------------- right */}
        <div className="flex flex-col gap-8">
          <section className="border border-rule-strong bg-paper-raised">
            <h2 className="border-b border-rule-strong px-4 py-3 font-display text-lg font-extrabold tracking-tight sm:px-6">
              What we know
            </h2>
            <dl className="px-4 py-4 sm:px-6">
              <Fact label="Mileage" value={`${listing.mileage.toLocaleString("en-US")} miles`} />
              <Fact label="Title" value={listing.titleStatus === "clean" ? "Clean (to be verified)" : listing.titleStatus} />
              <Fact label="Owners" value={listing.ownerCount ? String(listing.ownerCount) : "Unknown"} />
              <Fact label="VIN" value={listing.vin ?? "Not published by the seller"} />
              <Fact
                label="Durability score"
                value={`${Math.round(listing.durability * 100)} / 100`}
              />
            </dl>
            <p className="border-t border-rule px-4 py-3 font-serif text-[0.8125rem] leading-relaxed text-ink-muted sm:px-6">
              Durability is underwriting, not trivia. A car that breaks in month
              four is a car that stops being paid for, so it is scored before
              price is.
            </p>
          </section>

          {listing.description && (
            <section className="border border-rule-strong bg-paper-raised">
              <h2 className="border-b border-rule-strong px-4 py-3 font-display text-lg font-extrabold tracking-tight sm:px-6">
                About this car
              </h2>
              <p className="whitespace-pre-line px-4 py-4 font-serif text-[0.9375rem] leading-relaxed text-ink-muted sm:px-6">
                {listing.description}
              </p>
            </section>
          )}

          <section className="border border-rule-strong bg-paper-raised">
            <h2 className="border-b border-rule-strong px-4 py-3 font-display text-lg font-extrabold tracking-tight sm:px-6">
              Notes on this car
            </h2>
            <ul className="px-4 py-4 sm:px-6">
              {listing.notes.map((note) => (
                <li
                  key={note}
                  className="mb-2 border-l-2 border-rule pl-3 font-serif text-[0.875rem] leading-relaxed text-ink-muted last:mb-0"
                >
                  {note}
                </li>
              ))}
            </ul>
          </section>

          {priceable && (
            <section className="border border-rule-strong bg-paper-raised">
              <h2 className="border-b border-rule-strong px-4 py-3 font-display text-lg font-extrabold tracking-tight sm:px-6">
                Where the price comes from
              </h2>
              <dl className="tnum px-4 py-4 font-mono text-[0.8125rem] sm:px-6">
                <Fact label="Vehicle" value={formatMoney(quote.retailPriceCents, { cents: true })} />
                <Fact label={`${listing.state} sales tax`} value={formatMoney(quote.salesTaxCents, { cents: true })} />
                <Fact label="Doc fee" value={formatMoney(quote.docFeeCents, { cents: true })} />
                <Fact label="Title & registration" value={formatMoney(quote.titleRegCents, { cents: true })} />
                <Fact label="Out the door" value={formatMoney(quote.outTheDoorCents, { cents: true })} strong />
              </dl>
              <p className="border-t border-rule px-4 py-3 font-serif text-[0.8125rem] leading-relaxed text-ink-muted sm:px-6">
                DealerCars is the licensed dealer on this sale: we are the
                seller, the creditor, and we hold the contract. Nothing is sold
                on to a third-party lender.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function Fact({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2 last:border-0">
      <dt className="font-mono text-[0.75rem] uppercase tracking-[0.06em] text-ink-faint">
        {label}
      </dt>
      <dd
        className={`text-right font-mono text-[0.8125rem] ${
          strong ? "font-semibold text-ink" : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
