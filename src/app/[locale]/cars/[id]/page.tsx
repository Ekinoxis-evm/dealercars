import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadListing } from "@/lib/listing-store";
import { dealCostsFor, hasDealCostsFor } from "@/lib/deal-costs";
import { minDownFor, quoteListing, formatMoney } from "@/lib/finance";
import { DEFAULT_TERM_MONTHS, clampDown, downBounds } from "@/lib/payment-slider";
import { loadDealer } from "@/lib/dealer-store";
import { creditBlockReason } from "@/lib/dealers";
import { PlanPicker, VisitScheduler } from "@/components/privy-deferred";
import { CarGallery } from "@/components/CarGallery";
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
    description: `${listing.mileage.toLocaleString("en-US")} ${t.car.miles}, ${listing.city}, ${listing.state}.`,
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
  const quote = quoteListing(listing, costs, startingDownCents, [
    DEFAULT_TERM_MONTHS,
  ]);

  // The credit gate: this page offers payment plans. A dealer who may sell for
  // cash but not on credit is told exactly that, rather than being refused
  // outright.
  const blockReason = dealer ? creditBlockReason(dealer) : "No dealer is assigned to this car.";
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
          {listing.trim} &middot;{" "}
          <span className="tnum">{listing.mileage.toLocaleString("en-US")}</span>{" "}
          {t.car.miles} &middot; {listing.transmission} &middot; {listing.exteriorColor} over{" "}
          {listing.interiorColor}
        </p>

        {priceable && (
          <p className="mt-3 font-serif leading-snug">
            <span className="tnum font-display text-2xl font-extrabold tracking-tight">
              {formatMoney(quote.outTheDoorCents, { cents: true })}
            </span>{" "}
            <span className="text-ink-muted">{t.car.outTheDoorTail}</span>
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
        <div className="mt-6 border-l-2 border-accent bg-paper-raised px-4 py-3 sm:px-6">
          <h2 className="font-display text-base font-bold tracking-tight">
            {t.car.notForSaleTitle}
          </h2>
          <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
            {t.car.notForSaleBody}
          </p>
        </div>
      )}

      {blockReason && !isSourced && (
        <div className="mt-6 border-l-2 border-accent bg-paper-raised px-4 py-3 sm:px-6">
          <p className="font-serif text-[0.875rem] leading-snug text-ink-muted">
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
            <section className="border border-rule-strong bg-paper-raised px-4 py-4 sm:px-6">
              <h2 className="font-display text-base font-extrabold tracking-tight">
                {t.car.notPricedTitle(listing.state)}
              </h2>
              <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
                {t.car.notPricedBody}
              </p>
            </section>
          )}

          <VisitScheduler listingId={listing.id} />
        </div>

        {/* ----------------------------------------------------- right */}
        <div className="flex flex-col gap-6">
          <Card title={t.car.theCar}>
            <dl className="tnum grid grid-cols-2 gap-x-4 px-4 py-3 font-mono text-[0.75rem] sm:px-6">
              <Fact label={t.car.mileage} value={`${listing.mileage.toLocaleString("en-US")} mi`} />
              <Fact label={t.car.durabilityLabel} value={`${Math.round(listing.durability * 100)}/100`} />
              <Fact
                label={t.car.title}
                value={listing.titleStatus === "clean" ? t.car.titleCleanToVerify : listing.titleStatus}
              />
              <Fact label={t.car.owners} value={listing.ownerCount ? String(listing.ownerCount) : t.car.unknown} />
              <Fact label={t.car.transmission} value={listing.transmission} />
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

          {priceable && (
            <Card title={t.car.thePrice}>
              <dl className="tnum px-4 py-3 font-mono text-[0.75rem] sm:px-6">
                <Line label={t.car.vehicle} value={formatMoney(quote.retailPriceCents, { cents: true })} />
                <Line label={`${listing.state} ${t.car.tax}`} value={formatMoney(quote.salesTaxCents, { cents: true })} />
                <Line label={t.car.docFee} value={formatMoney(quote.docFeeCents, { cents: true })} />
                <Line label={t.car.titleReg} value={formatMoney(quote.titleRegCents, { cents: true })} />
                <Line label={t.car.outTheDoorRow} value={formatMoney(quote.outTheDoorCents, { cents: true })} strong />
              </dl>
              <p className="border-t border-rule px-4 py-2 font-serif text-[0.75rem] leading-snug text-ink-muted sm:px-6">
                {t.car.creditorNote}
              </p>
            </Card>
          )}
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

/** Label beside value, for the price ledger. */
function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-1.5 last:border-0">
      <dt className="uppercase tracking-[0.06em] text-ink-faint">{label}</dt>
      <dd className={`text-right ${strong ? "font-semibold text-ink" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
