import Link from "next/link";
import { getDictionary, isLocale, localePath } from "@/i18n";
import { notFound } from "next/navigation";
import { isOnTheLot, listShopWindow } from "@/lib/listing-store";
import { toCardData } from "@/lib/inventory-card";
import { loadDealer } from "@/lib/dealer-store";
import { OPERATING_DEALER_ID } from "@/lib/dealers";
import { CarCard } from "@/components/CarCard";
import { AuctionHouses } from "@/components/AuctionHouses";

/**
 * Same sixty seconds of staleness as the rest of the shop window. The cars
 * shown here are real rows, so the page cannot be built once at deploy time.
 */
export const revalidate = 60;

/** How many cars the front page leads with before sending people to the lot. */
const FEATURED_COUNT = 6;

/**
 * The front page, and what is deliberately NOT on it.
 *
 * It used to open with a specimen deal — a down payment, a monthly figure and
 * the Reg Z block those two oblige — and carry a budget calculator with a
 * second disclosure under it. Both are gone. The page now states no down
 * payment, no monthly payment and no period of repayment, so it carries no
 * trigger term and needs no disclosure; the cards show a cash price and an
 * APR, neither of which is one. Payments and their disclosure live on the car
 * page, next to the plan the member actually builds.
 *
 * Keep it that way. Put "$245/mo" anywhere on this page and `<RegZDisclosure>`
 * has to come back with it.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const [listings, dealer] = await Promise.all([
    listShopWindow(),
    loadDealer(OPERATING_DEALER_ID),
  ]);
  const featured = listings.filter(isOnTheLot).map(toCardData);

  const dealerName = dealer?.dbaName ?? dealer?.legalName ?? "MGM Autobroker";
  const address = dealer?.streetAddress
    ? `${dealer.streetAddress}, ${dealer.city}, ${dealer.state}${
        dealer.postalCode ? ` ${dealer.postalCode}` : ""
      }`
    : undefined;

  return (
    <main>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-accent">
            {t.home.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {t.home.title1}
            <br />
            <span className="text-accent">{t.home.title2}</span>
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            {t.home.lede}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={p("/marketplace")}
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
            >
              {t.home.seeCars}
            </Link>
            <Link
              href={`${p("/")}#how`}
              className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
            >
              {t.home.howItWorksLink} ↓
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- inventory */}
      {featured.length > 0 && (
        <section className="border-b border-rule-strong bg-paper-sunken">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {t.home.onTheLotNow}
              </h2>
              <Link
                href={p("/marketplace")}
                className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
              >
                {t.home.allCars(featured.length)}
              </Link>
            </div>
            <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
              {t.home.onTheLotLede}
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, FEATURED_COUNT).map((car) => (
                <CarCard key={car.id} car={car} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- how it works */}
      <section id="how" className="scroll-mt-8 border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.home.howTitle}
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            {t.home.howLede}
          </p>
          <ol className="mt-8 grid gap-px border border-rule-strong bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {t.steps.map((step, i) => (
              <li key={step.title} className="bg-paper-raised p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="tnum font-mono text-[0.8125rem] font-semibold text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                    {step.actor}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------- auctions */}
      <AuctionHouses dict={t} />

      {/* ---------------------------------------------------------- office */}
      {address && (
        <section id="visit" className="scroll-mt-8">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {t.home.inPerson}
                </h2>
                <p className="mt-3 font-serif text-lg leading-relaxed text-ink-muted">
                  {t.home.inPersonLede}
                </p>
                <address className="mt-6 not-italic">
                  <p className="font-display text-lg font-bold tracking-tight">
                    {dealerName}
                  </p>
                  <p className="font-mono text-[0.875rem] leading-relaxed text-ink-muted">
                    {dealer?.streetAddress}
                    <br />
                    {dealer?.city}, {dealer?.state} {dealer?.postalCode}
                  </p>
                </address>
                <p className="mt-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] underline underline-offset-4 hover:text-accent"
                  >
                    {t.home.openInMaps}
                  </a>
                </p>
              </div>

              {/* Keyless embed: the `output=embed` form needs no Maps API key,
                  so there is no secret to leak and nothing to bill. Lazy so it
                  costs nothing on a phone that never scrolls this far. */}
              <div className="border border-rule-strong bg-paper-raised">
                <iframe
                  title={`Map to ${dealerName}, ${address}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-[4/3] w-full border-0"
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
