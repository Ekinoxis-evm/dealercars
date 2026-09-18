import Link from "next/link";
import { getDictionary, isLocale, localePath } from "@/i18n";
import { notFound } from "next/navigation";
import { formatMoney, installmentPlan } from "@/lib/finance";
import { isOnTheLot, listShopWindow } from "@/lib/listing-store";
import { toCardData } from "@/lib/inventory-card";
import { BudgetCalculator } from "@/components/BudgetCalculator";
import { CarCard } from "@/components/CarCard";
import { RegZDisclosure } from "@/components/RegZDisclosure";
import { WaitlistForm } from "@/components/WaitlistForm";

/**
 * Same sixty seconds of staleness as the rest of the shop window. The cars
 * shown here are real rows, so the page cannot be built once at deploy time.
 */
export const revalidate = 60;

/** How many cars the front page leads with before sending people to the lot. */
const FEATURED_COUNT = 6;

/**
 * The live product, quoted from the spec's worked example: the Orlando 2014
 * Mazda3 at $12,831.70 out the door in Orange County, $4,000 down over 36
 * interest-free months. Hardcoded here on purpose — this is the specimen that
 * explains the offer, not a quote on a specific car, and it must not change
 * shape when a car sells.
 */
const SPECIMEN_OTD_CENTS = 12_831_70;
const SPECIMEN_DOWN_CENTS = 4_000_00;


export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const p = (path: string) => localePath(locale, path);

  const listings = await listShopWindow();
  const featured = listings.filter(isOnTheLot).map(toCardData);

  const specimen = installmentPlan(
    SPECIMEN_OTD_CENTS,
    SPECIMEN_DOWN_CENTS,
    36
  );

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

          {/* Specimen deal — trigger terms, so the Reg Z block rides along. */}
          <div className="mt-10 max-w-2xl border border-rule-strong bg-paper-raised">
            <p className="border-b border-rule bg-paper-sunken px-4 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
              {t.home.specimenLabel} · 2014 Mazda3
            </p>
            <div className="tnum grid grid-cols-2 divide-x divide-rule px-4 py-4">
              <div className="pr-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {t.home.downToday}
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(specimen.downCents)}
                </p>
              </div>
              <div className="pl-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {t.home.perMonth} {specimen.termMonths}
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(specimen.monthlyPaymentCents, { cents: true })}
                </p>
              </div>
            </div>
            <p className="tnum px-4 font-mono text-[0.75rem] text-ink-muted">
              {formatMoney(SPECIMEN_OTD_CENTS, { cents: true })}{" "}
              {t.home.outTheDoor} ·{" "}
              {formatMoney(specimen.amountFinancedCents, { cents: true })}{" "}
              {t.home.financed} · {t.home.zeroInterest}
            </p>
            <div className="px-4 pb-4 pt-3">
              <RegZDisclosure plan={specimen} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={p("/cars")}
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
            >
              {t.home.seeCars}
            </Link>
            <Link
              href={`${p("/")}#budget`}
              className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
            >
              {t.home.whatCanIAfford} →
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
                href={p("/cars")}
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

      {/* ------------------------------------------------------ calculator */}
      <section id="budget" className="scroll-mt-8 border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.home.budgetTitle}
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            {t.home.budgetLede}
          </p>
          <div className="mt-8">
            <BudgetCalculator cars={featured} locale={locale} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="border-b border-rule-strong">
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

      {/* -------------------------------------------------------- waitlist */}
      <section id="waitlist" className="scroll-mt-8">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t.home.waitlistTitle}
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            {t.home.waitlistLede}
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}
