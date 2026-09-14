"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney, installmentPlan, solveAffordability } from "@/lib/finance";
import { dealCostsFor, SUPPORTED_STATES } from "@/lib/deal-costs";
import { ZERO_APR_BPS } from "@/lib/types";
import type { CarCardData } from "@/lib/inventory-card";
import { carTitle } from "@/lib/inventory-card";
import { RegZDisclosure } from "@/components/RegZDisclosure";

/**
 * Shop by what you can actually pay.
 *
 * Two inputs the member controls — cash down and the monthly ceiling — solved
 * backwards into the out-the-door price their money reaches, and then pointed
 * straight at the cars on the lot that fit inside it. The answer to "what can
 * I afford" should be a car, not a number.
 *
 * The match runs on the OUT-THE-DOOR price, never the sticker. Tax, doc fee
 * and title are several hundred dollars in Florida; filtering on sticker would
 * show a member cars their money does not actually reach.
 *
 * Every price it compares against was computed on the server (`toCardData`).
 * The arithmetic here is only the budget inversion, which is the member's own
 * numbers rather than any car's — so there is no second source of truth for
 * what a car costs.
 *
 * Interest-free. With no finance charge the inverse amortization collapses to
 * monthly × term, which is why a given budget reaches a materially higher
 * ceiling than the same budget did at a rate: none of the payment is spent on
 * interest, so all of it buys car.
 *
 * The state selector is not decoration. Tax, doc fee and title differ enough
 * between states to move the ceiling by hundreds of dollars, and the operating
 * state is still an open decision — better to show that than to hardcode one
 * state and quietly quote every visitor the wrong number.
 */
const TERM_MONTHS = 36;

export function BudgetCalculator({ cars = [] }: { cars?: CarCardData[] }) {
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
  const budget = solveAffordability(envelope, terms, costs);

  // The plan the member would be on if they spent the whole envelope.
  const plan = installmentPlan(
    budget.maxOutTheDoorCents,
    envelope.downCents,
    TERM_MONTHS
  );

  const fits = useMemo(
    () =>
      cars
        .filter(
          (c) =>
            c.outTheDoorCents !== null &&
            c.outTheDoorCents <= budget.maxOutTheDoorCents
        )
        .sort((a, b) => (b.outTheDoorCents ?? 0) - (a.outTheDoorCents ?? 0)),
    [cars, budget.maxOutTheDoorCents]
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
            paying — tax, title, registration and doc fee already counted. None
            of it goes to interest.
          </p>
        </div>

        {/* Outputs — the payoff of the page */}
        <div className="tnum flex flex-col justify-center gap-6 px-4 py-6 sm:px-6">
          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-accent">
              You can shop up to
            </p>
            <p className="font-display text-5xl font-extrabold leading-none tracking-tight text-brass">
              {formatMoney(budget.maxOutTheDoorCents)}
            </p>
            <p className="mt-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
              Out the door, in {state} &mdash; the whole price, not a sticker
              you add fees to later. That is a{" "}
              {formatMoney(budget.maxRetailPriceCents)} car once tax, title and
              the doc fee come out of it.
            </p>
          </div>

          <div className="border-t border-rule pt-5">
            {cars.length === 0 ? (
              <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                <Link
                  href="/cars"
                  className="underline underline-offset-4 hover:text-accent"
                >
                  See what is on the lot →
                </Link>
              </p>
            ) : fits.length === 0 ? (
              <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                Nothing on the lot fits that budget today. The lot turns over
                every week &mdash;{" "}
                <Link
                  href="/cars"
                  className="underline underline-offset-4 hover:text-accent"
                >
                  see everything we have
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                  {fits.length} {fits.length === 1 ? "car" : "cars"} on the lot
                  fit
                </p>
                <ul className="mt-2 divide-y divide-rule border-y border-rule">
                  {fits.slice(0, 4).map((car) => (
                    <li key={car.id}>
                      <Link
                        href={`/cars/${car.id}`}
                        className="flex items-baseline justify-between gap-4 py-2 hover:text-accent"
                      >
                        <span className="font-serif text-[0.9375rem] leading-snug">
                          {carTitle(car)}
                          <span className="ml-2 font-mono text-[0.6875rem] text-ink-faint">
                            {car.mileage.toLocaleString("en-US")} mi
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[0.8125rem] font-semibold">
                          {formatMoney(car.outTheDoorCents ?? 0)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">
                  <Link
                    href="/cars"
                    className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] underline underline-offset-4 hover:text-accent"
                  >
                    See the whole lot →
                  </Link>
                </p>
              </>
            )}
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
