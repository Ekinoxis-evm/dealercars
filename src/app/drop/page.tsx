import type { Metadata } from "next";
import Link from "next/link";
import { formatBps, formatMoney } from "@/lib/finance";
import { buildDrop } from "@/lib/scoring";
import { MOCK_LOTS } from "@/lib/mock-lots";
import { DEFAULT_DEAL_COSTS, DEFAULT_TERMS } from "@/lib/types";
import { ProposalCard } from "@/components/ProposalCard";
import {
  commitWednesday,
  formatDropDate,
  formatShortDate,
  nextDropMonday,
} from "@/components/drop-dates";

export const metadata: Metadata = {
  title: "The Monday drop — DealerCars",
  description:
    "Four real auction lots, each solved to the dollar against a verified budget. Commit by Wednesday; a licensed partner dealer bids Thursday.",
};

const ENVELOPE = { downCents: 250000, monthlyCents: 40000 };

export default function DropPage() {
  const drop = buildDrop(
    MOCK_LOTS,
    ENVELOPE,
    DEFAULT_TERMS,
    DEFAULT_DEAL_COSTS,
    4,
  );

  const monday = nextDropMonday();
  const wednesday = commitWednesday(monday);
  const commitBy = formatShortDate(wednesday);

  return (
    <main>
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-accent">
            Drop of {formatDropDate(monday)}
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Four cars. One is yours.
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            Every lot below cleared a verified budget before it reached this
            page. Commit to one by {formatDropDate(wednesday)} evening; the
            partner dealer bids Thursday at the lane — on a car that is already
            sold.
          </p>

          {/* The envelope this drop was solved against */}
          <dl className="tnum mt-8 grid max-w-2xl grid-cols-2 gap-px border border-rule-strong bg-rule font-mono sm:grid-cols-4">
            <div className="bg-paper-raised px-4 py-3">
              <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                Cash down
              </dt>
              <dd className="text-lg font-semibold text-ink">
                {formatMoney(ENVELOPE.downCents)}
              </dd>
            </div>
            <div className="bg-paper-raised px-4 py-3">
              <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                Monthly ceiling
              </dt>
              <dd className="text-lg font-semibold text-ink">
                {formatMoney(ENVELOPE.monthlyCents)}
              </dd>
            </div>
            <div className="bg-paper-raised px-4 py-3">
              <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                APR
              </dt>
              <dd className="text-lg font-semibold text-ink">
                {formatBps(DEFAULT_TERMS.aprBps)}
              </dd>
            </div>
            <div className="bg-paper-raised px-4 py-3">
              <dt className="text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                Term
              </dt>
              <dd className="text-lg font-semibold text-ink">
                {DEFAULT_TERMS.termMonths} mo
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="bg-paper-sunken">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
          <div className="grid gap-6 md:grid-cols-2">
            {drop.map((proposal) => (
              <ProposalCard
                key={proposal.lot.id}
                proposal={proposal}
                commitBy={commitBy}
              />
            ))}
          </div>

          <div className="mt-10 max-w-2xl border-t border-rule pt-6">
            <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              These four came out of {MOCK_LOTS.length} live lots. Anything with
              a salvage title, a red light and no recon path, or an MMR over the
              bid ceiling never makes the page. If the dealer gets outbid
              Thursday, your deposit rolls to next Monday&rsquo;s drop — it
              never buys a worse car.
            </p>
            <p className="mt-6">
              <Link
                href="/#waitlist"
                className="inline-block border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
              >
                Get your own drop
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
