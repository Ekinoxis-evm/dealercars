"use client";

import { useId, useState } from "react";
import { formatMoney, installmentPlan, solveBidCeiling } from "@/lib/finance";
import { dealCostsFor, SUPPORTED_STATES } from "@/lib/deal-costs";
import { ZERO_APR_BPS } from "@/lib/types";
import { RegZDisclosure } from "@/components/RegZDisclosure";

/**
 * The budget envelope, solved backwards, live.
 *
 * Two inputs the member actually controls — cash down and the monthly ceiling —
 * and the two numbers that fall out: the max vehicle price and, the one the
 * auction search runs on, the maximum auction bid.
 *
 * Interest-free. With no finance charge the inverse amortization collapses to
 * monthly × term, which is why a given budget reaches a materially higher bid
 * ceiling here than the same budget did at a rate: none of the payment is
 * being spent on interest, so all of it buys car.
 *
 * The state selector is not decoration. Tax, doc fee and title differ enough
 * between states to move the ceiling by hundreds of dollars, and the operating
 * state is still an open decision — better to show that than to hardcode one
 * state and quietly quote every visitor the wrong number.
 */
const TERM_MONTHS = 36;

export function BudgetCalculator() {
  const [downDollars, setDownDollars] = useState(2500);
  const [monthlyDollars, setMonthlyDollars] = useState(400);
  const [state, setState] = useState("FL");
  const downId = useId();
  const monthlyId = useId();

  const envelope = {
    downCents: downDollars * 100,
    monthlyCents: monthlyDollars * 100,
  };
  const costs = dealCostsFor(state);
  const terms = { aprBps: ZERO_APR_BPS, termMonths: TERM_MONTHS };
  const ceiling = solveBidCeiling(envelope, terms, costs);

  // The plan the member would actually be on: out-the-door is the amount
  // financed plus their down payment, by definition of the ceiling.
  const plan = installmentPlan(
    ceiling.maxAmountFinancedCents + envelope.downCents,
    envelope.downCents,
    TERM_MONTHS
  );

  return (
    <div className="border border-rule-strong bg-paper-raised">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-paper-sunken px-4 py-2 sm:px-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
          Worksheet · <span className="text-accent">0% APR — no interest</span> ·{" "}
          {TERM_MONTHS} months · tax, title &amp; fees included
        </p>
        <div className="flex items-center gap-1">
          {SUPPORTED_STATES.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={s === state}
              onClick={() => setState(s)}
              className={`border px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${
                s === state
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-rule-strong bg-paper text-ink-muted hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-8 border-b border-rule px-4 py-6 sm:border-b-0 sm:border-r sm:px-6">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={downId}
                className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-muted"
              >
                Cash down today
              </label>
              <output
                htmlFor={downId}
                className="tnum font-mono text-lg font-semibold text-ink"
              >
                {formatMoney(envelope.downCents)}
              </output>
            </div>
            <input
              id={downId}
              type="range"
              min={1000}
              max={5000}
              step={250}
              value={downDollars}
              onChange={(e) => setDownDollars(Number(e.target.value))}
              aria-valuetext={formatMoney(envelope.downCents)}
              className="mt-2"
            />
            <div className="tnum flex justify-between font-mono text-[0.6875rem] text-ink-faint">
              <span>$1,000</span>
              <span>$5,000</span>
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor={monthlyId}
                className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-muted"
              >
                Monthly ceiling
              </label>
              <output
                htmlFor={monthlyId}
                className="tnum font-mono text-lg font-semibold text-ink"
              >
                {formatMoney(envelope.monthlyCents)}/mo
              </output>
            </div>
            <input
              id={monthlyId}
              type="range"
              min={250}
              max={600}
              step={25}
              value={monthlyDollars}
              onChange={(e) => setMonthlyDollars(Number(e.target.value))}
              aria-valuetext={`${formatMoney(envelope.monthlyCents)} per month`}
              className="mt-2"
            />
            <div className="tnum flex justify-between font-mono text-[0.6875rem] text-ink-faint">
              <span>$250</span>
              <span>$600</span>
            </div>
          </div>

          <p className="font-serif text-[0.875rem] italic leading-relaxed text-ink-muted">
            A ceiling, not a wish. We solve backwards from what you can keep
            paying — tax, title, doc fee, transport, and recon already counted.
            None of it goes to interest.
          </p>
        </div>

        {/* Outputs — the payoff of the page */}
        <div className="tnum flex flex-col justify-center gap-6 px-4 py-6 sm:px-6">
          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Max vehicle price
            </p>
            <p className="font-display text-4xl font-extrabold leading-none tracking-tight text-ink">
              {formatMoney(ceiling.maxRetailPriceCents)}
            </p>
          </div>
          <div className="border-t border-rule pt-5">
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-accent">
              Your auction bid ceiling
            </p>
            <p className="font-display text-6xl font-extrabold leading-none tracking-tight text-brass">
              {formatMoney(ceiling.maxAuctionBidCents)}
            </p>
            <p className="mt-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
              This is the number the search runs on. Every lot in your Monday
              drop clears at or under it.
            </p>
          </div>
        </div>
      </div>

      {/* Down payment + monthly figures above are Reg Z trigger terms. Zero
          interest does not change that — an interest-free plan over more than
          four payments is still a credit sale. */}
      <div className="px-4 pb-4 sm:px-6">
        <RegZDisclosure plan={plan} />
      </div>
    </div>
  );
}
