import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadListing } from "@/lib/listing-store";
import { dealCostsFor, hasDealCostsFor } from "@/lib/deal-costs";
import { minDownFor, quoteListing, formatMoney } from "@/lib/finance";
import { DEFAULT_TERM_MONTHS, clampDown, downBounds } from "@/lib/payment-slider";
import { PlanPicker } from "@/components/PlanPicker";
import { CarGallery } from "@/components/CarGallery";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { getDictionary, isLocale } from "@/i18n";

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
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "es");
  const listing = await loadListing(id);
  if (!listing) return { title: "404 — MGM Auto" };
  return {
    title: `${listing.year} ${listing.make} ${listing.model} — MGM Auto`,
    description: `${
      listing.mileage === undefined
        ? t.car.mileageUnknown
        : `${listing.mileage.toLocaleString("en-US")} ${t.car.miles}`
    }, ${listing.city}, ${listing.state}.`,
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
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const listing = await loadListing(id);
  if (!listing) notFound();

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
  const quote = quoteListing(listing, costs, startingDownCents, [
    DEFAULT_TERM_MONTHS,
  ]);

  // No credit-gate banner here any more: the page hands the plan to WhatsApp
  // and takes no money, so "this dealer cannot accept charges" would be a
  // statement about a button that is not on the page. The gate still runs
  // server-side in the down-payment route for the day it is switched back on.
  const isSourced = listing.status === "sourced";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* ------------------------------------------------------ heading */}
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          {listing.source === "street" ? t.car.sourcedPrivately : t.car.dealerLot}
          {" · "}
          {listing.city}, {listing.state}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {listing.year} {listing.make} {listing.model}
        </h1>
        <p className="mt-1 font-serif text-lg text-ink-muted">
          {[
            listing.trim,
            listing.mileage === undefined
              ? t.car.mileageUnknown
              : `${listing.mileage.toLocaleString("en-US")} ${t.car.miles}`,
            t.car.transmissions[listing.transmission],
            [listing.exteriorColor, listing.interiorColor].filter(Boolean).join(" / "),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {priceable && (
          <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="tnum font-display text-4xl font-extrabold leading-none tracking-tight text-brass sm:text-5xl">
              {formatMoney(quote.outTheDoorCents, { cents: true })}
            </span>
            <span className="font-serif text-[0.9375rem] leading-snug text-ink-muted">
              {t.car.outTheDoorTail}
            </span>
          </p>
        )}
      </header>

      {/* -------------------------------------------------------- the price */}
      {priceable && (
        <div className="mt-6">
          <PriceBreakdown
            state={listing.state}
            costs={{
              salesTaxRate: costs.salesTaxRate,
              countySurtaxRate: costs.countySurtaxRate,
              countySurtaxCapCents: costs.countySurtaxCapCents,
              sources: costs.sources,
            }}
            retailPriceCents={quote.retailPriceCents}
            salesTaxCents={quote.salesTaxCents}
            docFeeCents={quote.docFeeCents}
            titleRegCents={quote.titleRegCents}
            outTheDoorCents={quote.outTheDoorCents}
          />
        </div>
      )}

      {/* ------------------------------------------------------ gallery */}
      <CarGallery
        photos={listing.photos}
        label={`${listing.year} ${listing.make} ${listing.model}`}
      />

      {/* ---------------------------------------------------- interlock */}
      {isSourced && (
        <div className="mt-6 border-l-2 border-accent bg-paper-raised px-4 py-3 sm:px-6">
          <h2 className="font-display text-base font-bold tracking-tight">
            {t.car.notForSaleTitle}
          </h2>
          <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
            {t.car.notForSaleBody}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* ------------------------------------------------------ left */}
        <div className="flex flex-col gap-8">
          {priceable ? (
            <PlanPicker listing={listing} initialQuote={quote} />
          ) : (
            <section className="border border-rule-strong bg-paper-raised px-4 py-4 sm:px-6">
              <h2 className="font-display text-base font-extrabold tracking-tight">
                {t.car.notPricedTitle(listing.state)}
              </h2>
              <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
                {t.car.notPricedBody}
              </p>
            </section>
          )}
        </div>

        {/* ----------------------------------------------------- right */}
        <div className="flex flex-col gap-6">
          <Card title={t.car.theCar}>
            <dl className="tnum grid grid-cols-2 gap-x-4 px-4 py-3 font-mono text-[0.75rem] sm:px-6">
              <Fact
                label={t.car.mileage}
                value={
                  listing.mileage === undefined
                    ? t.car.unknown
                    : `${listing.mileage.toLocaleString("en-US")} mi`
                }
              />
              <Fact label={t.car.durabilityLabel} value={`${Math.round(listing.durability * 100)}/100`} />
              <Fact
                label={t.car.title}
                value={listing.titleStatus === "clean" ? t.car.titleCleanToVerify : listing.titleStatus}
              />
              <Fact label={t.car.owners} value={listing.ownerCount ? String(listing.ownerCount) : t.car.unknown} />
              <Fact label={t.car.transmission} value={t.car.transmissions[listing.transmission]} />
              <Fact label={t.car.vin} value={listing.vin ?? t.car.vinNotPublished} />
            </dl>
          </Card>

          {listing.description && (
            <Card title={t.car.about}>
              <p className="whitespace-pre-line px-4 py-3 font-serif text-[0.875rem] leading-snug text-ink-muted sm:px-6">
                {listing.description}
              </p>
            </Card>
          )}

          <Card title={t.car.notes}>
            <ul className="px-4 py-3 sm:px-6">
              {listing.notes.map((note) => (
                <li
                  key={note}
                  className="mb-1.5 border-l-2 border-rule pl-2.5 font-serif text-[0.8125rem] leading-snug text-ink-muted last:mb-0"
                >
                  {note}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-rule-strong bg-paper-raised">
      <h2 className="border-b border-rule px-4 py-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink-faint sm:px-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Label over value, for the two-column spec grid. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-rule py-1.5 last:border-0 [&:nth-last-child(2)]:border-0">
      <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </dt>
      <dd className="truncate text-ink">{value}</dd>
    </div>
  );
}

