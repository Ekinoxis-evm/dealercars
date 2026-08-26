import Link from "next/link";
import { amortize, formatMoney } from "@/lib/finance";
import { buildDrop } from "@/lib/scoring";
import { MOCK_LOTS } from "@/lib/mock-lots";
import { DEFAULT_DEAL_COSTS, DEFAULT_TERMS } from "@/lib/types";
import { BudgetCalculator } from "@/components/BudgetCalculator";
import { ProposalCard } from "@/components/ProposalCard";
import { RegZDisclosure } from "@/components/RegZDisclosure";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  commitWednesday,
  formatShortDate,
  nextDropMonday,
} from "@/components/drop-dates";

/** The canonical deal: 2019 Corolla LE, $10,135 financed at 22.0% APR × 36. */
const CANONICAL_DOWN_CENTS = 250000;
const CANONICAL_FINANCED_CENTS = 1013500;
const CANONICAL_OTD_CENTS = 1263500;

const CANONICAL_ENVELOPE = { downCents: 250000, monthlyCents: 40000 };

const STEPS: { actor: string; title: string; body: string }[] = [
  {
    actor: "You",
    title: "Set the envelope",
    body: "Two numbers: the cash you can put down today and the monthly payment you can keep making. A ceiling, not a wish.",
  },
  {
    actor: "DealerCars",
    title: "Ability-to-pay prequal",
    body: "We verify income and residence — capacity, not a FICO cutoff — and solve your envelope backwards into a maximum auction bid.",
  },
  {
    actor: "DealerCars",
    title: "The Monday drop",
    body: "Four real lots from live dealer auctions land in your account Monday morning, each one priced to the dollar under your ceiling.",
  },
  {
    actor: "You",
    title: "Commit to one",
    body: "Pick your car by Wednesday evening and put your deposit down. From that moment the car being bid on is already yours.",
  },
  {
    actor: "Partner dealer",
    title: "Bids to the ceiling",
    body: "Thursday at the lane, a licensed dealer bids on your car — never a dollar past the ceiling your budget set. No guessing, no lot full of maybes.",
  },
  {
    actor: "Dealer + DealerCars",
    title: "Recon, contract, autopay",
    body: "Inspection and reconditioning, then the retail installment contract with every federal disclosure, and autopay set up before you drive off.",
  },
];

export default function Home() {
  const canonical = amortize(
    CANONICAL_FINANCED_CENTS,
    DEFAULT_TERMS.aprBps,
    DEFAULT_TERMS.termMonths,
  );

  const sampleDrop = buildDrop(
    MOCK_LOTS,
    CANONICAL_ENVELOPE,
    DEFAULT_TERMS,
    DEFAULT_DEAL_COSTS,
    3,
  );

  const monday = nextDropMonday();
  const commitBy = formatShortDate(commitWednesday(monday));

  return (
    <main>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-accent">
            Dealer-only auctions, opened backwards
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            You can&rsquo;t bid at a dealer auction.
            <br />
            <span className="text-accent">We bid for you.</span>
          </h1>
          <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted sm:text-xl">
            Four cars a week, priced to what you can actually afford, before
            anyone else sees them. Your budget is verified first, solved into a
            maximum auction bid, and a licensed dealer bids on a car that is
            already yours.
          </p>

          {/* Specimen deal — trigger terms, so the Reg Z block rides along. */}
          <div className="mt-10 max-w-2xl border border-rule-strong bg-paper-raised">
            <p className="border-b border-rule bg-paper-sunken px-4 py-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
              A real deal from the model · 2019 Toyota Corolla LE · 71,480 mi
            </p>
            <div className="tnum grid grid-cols-2 divide-x divide-rule px-4 py-4">
              <div className="pr-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Down today
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(CANONICAL_DOWN_CENTS)}
                </p>
              </div>
              <div className="pl-4">
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  Per month × {canonical.termMonths}
                </p>
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brass sm:text-4xl">
                  {formatMoney(canonical.monthlyPaymentCents, { cents: true })}
                </p>
              </div>
            </div>
            <p className="tnum px-4 font-mono text-[0.75rem] text-ink-muted">
              {formatMoney(CANONICAL_OTD_CENTS)} out the door ·{" "}
              {formatMoney(CANONICAL_FINANCED_CENTS)} financed
            </p>
            <div className="px-4 pb-4 pt-3">
              <RegZDisclosure downCents={CANONICAL_DOWN_CENTS} loan={canonical} />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/#waitlist"
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
            >
              Join the waitlist
            </Link>
            <Link
              href="/drop"
              className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
            >
              See a Monday drop →
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ calculator */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start from your budget, not from a listing.
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            Set your down payment and your monthly ceiling. We solve them
            backwards — through tax, title, fees, transport, and recon — into
            the one number the auction search runs on.
          </p>
          <div className="mt-8">
            <BudgetCalculator />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            How a week works
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            The same loop every week. It runs in order because the money is
            settled before the hammer falls — that is the whole point.
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

      {/* ----------------------------------------------------- sample drop */}
      <section className="border-b border-rule-strong bg-paper-sunken">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              What a drop looks like
            </h2>
            <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
              Envelope: {formatMoney(CANONICAL_ENVELOPE.downCents)} down ·{" "}
              {formatMoney(CANONICAL_ENVELOPE.monthlyCents)}/mo
            </p>
          </div>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            Three of the four lots a member with the envelope above would see
            this Monday. Real auction data shape, real math — each card is a
            financed offer, not a listing.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sampleDrop.map((proposal) => (
              <ProposalCard
                key={proposal.lot.id}
                proposal={proposal}
                commitBy={commitBy}
              />
            ))}
          </div>
          <p className="mt-8">
            <Link
              href="/drop"
              className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
            >
              See the full Monday drop →
            </Link>
          </p>
        </div>
      </section>

      {/* -------------------------------------------------------- waitlist */}
      <section id="waitlist" className="scroll-mt-8">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Get your Monday drop.
          </h2>
          <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            We open one market at a time so every drop stays real. Leave your
            email and we&rsquo;ll tell you when yours is next.
          </p>
          <div className="mt-6">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}
