import Link from "next/link";
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

const STEPS: { actor: string; title: string; body: string }[] = [
  {
    actor: "DealerCars",
    title: "We buy the car",
    body: "We hold the dealer licence and the auction access, so we buy, inspect and recondition every car ourselves. Nothing is listed until we have the title in hand.",
  },
  {
    actor: "You",
    title: "Pick one and see the real price",
    body: "Every car shows one number: out the door, tax and title and doc fee already in it. No fees appear later, because there are none left to appear.",
  },
  {
    actor: "You",
    title: "Choose how to pay",
    body: "Pay in full, or split the same price over 12, 24 or 36 months. Interest-free means interest-free: the payments add up to the cash price to the cent.",
  },
  {
    actor: "DealerCars",
    title: "Ability-to-pay check",
    body: "We look at what you earn and what the payment leaves you, not at a credit score. Thin or damaged files are the market, not a disqualification.",
  },
  {
    actor: "You",
    title: "Come drive it",
    body: "Book a visit, drive the car, and sign there. A deposit holds it for your appointment and is refundable in full until you sign.",
  },
  {
    actor: "DealerCars",
    title: "We hold the paper",
    body: "We are the seller and the creditor on your contract. Nothing is sold on to a third-party lender, so the people you pay are the people you bought from.",
  },
];

export default async function Home() {
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
            Used cars, financed by the people who sell them
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Our cars. One price.
            <br />
            <span className="text-accent">No interest, ever.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            We buy the cars, we hold the title, and we carry the loan
            ourselves. Every car on the lot shows the full out-the-door price,
            and you can split that exact price over three years without paying
            a cent of interest on it.
          </p>

          {/* Specimen deal — trigger terms, so the Reg Z block rides along. */}
          <div className="mt-10 max-w-2xl border border-rule-strong bg-paper-raised">
            <p className="border-b border-rule bg-paper-sunken px-4 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
              What a car on our lot looks like · 2014 Mazda3 · Orlando, FL
            </p>
            <div className="tnum grid grid-cols-2 divide-x divide-rule px-4 py-4">
              <div className="pr-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Down today
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(specimen.downCents)}
                </p>
              </div>
              <div className="pl-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Per month × {specimen.termMonths}
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(specimen.monthlyPaymentCents, { cents: true })}
                </p>
              </div>
            </div>
            <p className="tnum px-4 font-mono text-[0.75rem] text-ink-muted">
              {formatMoney(SPECIMEN_OTD_CENTS, { cents: true })} out the door ·{" "}
              {formatMoney(specimen.amountFinancedCents, { cents: true })}{" "}
              financed · $0.00 interest
            </p>
            <div className="px-4 pb-4 pt-3">
              <RegZDisclosure plan={specimen} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/cars"
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
            >
              See the cars
            </Link>
            <Link
              href="/#budget"
              className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
            >
              What can I afford? →
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
                On the lot right now
              </h2>
              <Link
                href="/cars"
                className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
              >
                All {featured.length} cars →
              </Link>
            </div>
            <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
              Cars we own, inspected and titled. The price on each card is the
              out-the-door price &mdash; tax, title, registration and doc fee
              included.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, FEATURED_COUNT).map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ calculator */}
      <section id="budget" className="scroll-mt-8 border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start from your budget, not from a sticker.
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            Set your down payment and your monthly ceiling. We solve them
            backwards &mdash; through tax, title and fees &mdash; into the cars
            on our lot that your money actually reaches.
          </p>
          <div className="mt-8">
            <BudgetCalculator cars={featured} />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            How buying here works
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            Six steps, and we are on the hook for four of them. That is the
            difference between a dealership and a marketplace.
          </p>
          <ol className="mt-8 grid gap-px border border-rule-strong bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
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
            Tell us what you&rsquo;re looking for.
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            We buy cars one at a time and the lot turns over quickly. Leave
            your email and we&rsquo;ll tell you when something that fits your
            budget lands.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}
