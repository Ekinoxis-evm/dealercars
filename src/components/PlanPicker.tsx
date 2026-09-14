"use client";

import { useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { financingComparison, formatBps, formatMoney } from "@/lib/finance";
import {
  DOWN_STEP,
  MONTHLY_STEP,
  clampDown,
  downBounds,
  downForMonthly,
  monthlyBounds,
  monthlySliderRange,
  monthlyThumbFor,
} from "@/lib/payment-slider";
import type { PaymentPlan, PriceQuote, RetailListing } from "@/lib/types";
import { RegZDisclosure } from "./RegZDisclosure";

/**
 * Build a payment on one specific car.
 *
 * Three controls, and they describe one plan from three sides: how long you
 * take, how much you put down, and what you pay a month. Down payment and
 * monthly payment are the SAME DIAL from opposite ends — at a fixed term and a
 * fixed price, `monthly = (price − down) / term` — so the monthly slider does
 * not introduce a second source of truth. It sets the down payment; the figure
 * it is labelled with still comes back from the server.
 *
 * Two rules govern this component:
 *
 *  1. It does NOT do the arithmetic. Every figure comes from /api/quote, so
 *     the number shown here and the number charged at checkout come from the
 *     same function. A calculator that computes client-side will eventually
 *     disagree with the server by a cent, and a disclosed payment that is off
 *     by a cent is a Reg Z problem, not a rounding bug.
 *
 *     The projections below are the one exception, and a narrow one: they
 *     position the slider thumbs while a drag is in flight, and they are never
 *     the figure a member reads. Anything a member reads — the headline
 *     payment, the summary table, the disclosure — is dimmed until the server
 *     confirms it rather than being replaced by a guess.
 *
 *  2. A down payment and a monthly payment are both Reg Z trigger terms, so
 *     <RegZDisclosure /> is not optional here. It ships with the numbers.
 */

/**
 * The down payment range comes from the CAR, not from a constant.
 *
 * It used to be a flat $2,000–$4,000, which was wrong in both directions: on a
 * $6,000 car it demanded far more down than the underwriting floor asks for,
 * and on anything above roughly $22,000 the 18% floor landed above the
 * maximum, so `belowFloor` was permanently true and checkout could never open.
 * The geometry now comes from `payment-slider.ts`, which the car page shares so
 * the server-rendered quote already sits where the slider will land.
 */

export function PlanPicker({
  listing,
  initialQuote,
}: {
  listing: RetailListing;
  initialQuote: PriceQuote;
}) {
  const { authenticated, login } = usePrivy();

  // The car's price fixes the whole range. Computed from the initial quote,
  // which is server-rendered, so the sliders are correct in the first paint
  // rather than snapping into place once a fetch lands.
  const bounds = useMemo(
    () => downBounds(initialQuote.minDownCents, initialQuote.outTheDoorCents),
    [initialQuote.minDownCents, initialQuote.outTheDoorCents]
  );

  const [downCents, setDownCents] = useState(() =>
    clampDown(initialQuote.minDownCents, bounds)
  );
  const [quote, setQuote] = useState<PriceQuote>(initialQuote);
  const [termMonths, setTermMonths] = useState(36);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);

  // Re-quote from the server whenever the down payment settles.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch<{ quote: PriceQuote }>(
          `/api/quote?listingId=${encodeURIComponent(listing.id)}&downCents=${downCents}`,
          { authenticated: false }
        );
        if (!cancelled) setQuote(data.quote);
      } catch {
        // Keep the last good quote rather than showing a broken figure.
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [downCents, listing.id]);

  const plan = useMemo(
    () => quote.plans.find((p) => p.termMonths === termMonths),
    [quote, termMonths]
  );
  const cash = quote.plans.find((p) => p.kind === "cash");
  const belowFloor = downCents < quote.minDownCents;

  /**
   * Where the monthly slider's thumb sits, projected from the down payment the
   * member is dragging right now. Never rendered as a figure — the payment
   * they read comes from `plan`, which is the server's.
   */
  /** What the ends actually cost — these are the figures a member reads. */
  const monthlyRange = useMemo(
    () => monthlyBounds(quote.outTheDoorCents, termMonths, bounds),
    [quote.outTheDoorCents, termMonths, bounds]
  );
  /** The grid the thumb travels on, which is wider by up to a step each end. */
  const monthlyTravel = useMemo(
    () => monthlySliderRange(quote.outTheDoorCents, termMonths, bounds),
    [quote.outTheDoorCents, termMonths, bounds]
  );

  const monthlyThumb = monthlyThumbFor(
    quote.outTheDoorCents,
    downCents,
    termMonths,
    bounds
  );

  /** Dragging the monthly slider sets the down payment it implies. */
  function setMonthly(monthlyCents: number) {
    setDownCents(
      downForMonthly(quote.outTheDoorCents, monthlyCents, termMonths, bounds)
    );
  }

  /**
   * The quote on screen was computed at `quote.downCents`; the member may have
   * already dragged past it. While those disagree, a figure is in flight.
   *
   * Dimmed, never replaced by a local guess: a payment that has not come back
   * from the server must not read as confirmed, and the projections above are
   * only good enough to position a thumb.
   */
  const settlingClass =
    downCents !== quote.downCents
      ? "opacity-50 transition-opacity"
      : "transition-opacity";

  async function startCheckout(kind: "plan" | "cash") {
    setError(null);
    setReasons(null);

    if (!authenticated) {
      login();
      return;
    }

    setLoading(true);
    try {
      const { url } = await apiFetch<{ url: string }>(
        "/api/checkout/down-payment",
        {
          method: "POST",
          body: JSON.stringify({
            listingId: listing.id,
            downCents: kind === "cash" ? quote.outTheDoorCents : downCents,
            termMonths: kind === "cash" ? 0 : termMonths,
          }),
        }
      );
      window.location.href = url;
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setReasons(e.reasons ?? null);
      } else {
        setError("Something went wrong starting checkout.");
      }
      setLoading(false);
    }
  }

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Build your payment
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          No interest, ever. Every plan below adds up to the same{" "}
          <span className="tnum font-mono text-[0.875rem] text-ink">
            {formatMoney(quote.outTheDoorCents, { cents: true })}
          </span>{" "}
          out-the-door price &mdash; the only thing that changes is how long you
          take.
        </p>
      </header>

      <div className="px-4 py-5 sm:px-6">
        {/* -------------------------------------------------------- term */}
        <fieldset>
          <legend className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
            Pay it off over
          </legend>
          <div className={`mt-2 grid grid-cols-3 gap-2 ${settlingClass}`}>
            {quote.plans
              .filter((p): p is PaymentPlan => p.kind === "installments")
              .map((p) => {
                const selected = p.termMonths === termMonths;
                return (
                  <button
                    key={p.termMonths}
                    type="button"
                    onClick={() => setTermMonths(p.termMonths)}
                    aria-pressed={selected}
                    className={`border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-accent bg-paper text-ink"
                        : "border-rule-strong bg-paper hover:border-accent"
                    }`}
                  >
                    <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                      {p.termMonths} months
                    </span>
                    <span className="tnum mt-1 block font-display text-lg font-bold tracking-tight">
                      {formatMoney(p.monthlyPaymentCents, { cents: true })}
                    </span>
                    <span className="block font-serif text-[0.75rem] text-ink-muted">
                      per month
                    </span>
                  </button>
                );
              })}
          </div>
        </fieldset>

        {/* ---------------------------------------------- the two sliders */}
        <p className="mt-6 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
          Drag either one. They are the same dial from opposite ends &mdash;
          more down is less a month, and the total never changes.
        </p>

        {/* ------------------------------------------------ down payment */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-4">
            <label
              htmlFor="down"
              className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-faint"
            >
              Cash down today
            </label>
            <span className="tnum font-display text-2xl font-extrabold tracking-tight">
              {formatMoney(downCents)}
            </span>
          </div>
          <input
            id="down"
            type="range"
            min={bounds.min}
            max={bounds.max}
            step={DOWN_STEP}
            value={downCents}
            onChange={(e) => setDownCents(Number(e.target.value))}
            aria-valuetext={formatMoney(downCents)}
            className="mt-2"
          />
          <div className="tnum flex justify-between font-mono text-[0.6875rem] text-ink-faint">
            <span>{formatMoney(bounds.min)} minimum</span>
            <span>{formatMoney(bounds.max)}</span>
          </div>
        </div>

        {/* ---------------------------------------------- monthly payment */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-4">
            <label
              htmlFor="monthly"
              className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] text-ink-faint"
            >
              Per month
            </label>
            <span
              className={`tnum font-display text-2xl font-extrabold tracking-tight text-brass ${settlingClass}`}
            >
              {plan
                ? formatMoney(plan.monthlyPaymentCents, { cents: true })
                : "—"}
            </span>
          </div>
          <input
            id="monthly"
            type="range"
            min={monthlyTravel.min}
            max={monthlyTravel.max}
            step={MONTHLY_STEP}
            value={monthlyThumb}
            onChange={(e) => setMonthly(Number(e.target.value))}
            aria-valuetext={
              plan
                ? `${formatMoney(plan.monthlyPaymentCents, { cents: true })} per month`
                : undefined
            }
            className="mt-2"
          />
          <div className="tnum flex justify-between font-mono text-[0.6875rem] text-ink-faint">
            <span>{formatMoney(monthlyRange.min, { cents: true })}/mo</span>
            <span>{formatMoney(monthlyRange.max, { cents: true })}/mo</span>
          </div>
        </div>

        <p className="mt-3 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
          The{" "}
          <span className="tnum font-mono text-[0.75rem] text-ink">
            {formatMoney(bounds.min)}
          </span>{" "}
          minimum is 18% of the out-the-door price &mdash;{" "}
          <span className="tnum font-mono text-[0.75rem]">
            {formatMoney(quote.minDownCents, { cents: true })}
          </span>
          , rounded up to the nearest {formatMoney(DOWN_STEP)}. A down payment
          that size is the strongest predictor there is of a loan that
          finishes, which is why it is the floor rather than a suggestion.
        </p>

        {belowFloor && (
          <p
            role="alert"
            className="mt-3 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted"
          >
            A down payment of at least{" "}
            <span className="tnum font-mono text-[0.8125rem] text-ink">
              {formatMoney(quote.minDownCents, { cents: true })}
            </span>{" "}
            is required on this car.
          </p>
        )}

        {/* ----------------------------------------------------- summary */}
        {plan && (
          <div className={`mt-6 border-t border-rule pt-4 ${settlingClass}`}>
            <dl className="tnum grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-[0.8125rem]">
              <Row label="Out-the-door price" value={formatMoney(quote.outTheDoorCents, { cents: true })} />
              <Row label="Cash down" value={`− ${formatMoney(plan.downCents, { cents: true })}`} />
              <Row label="Amount financed" value={formatMoney(plan.amountFinancedCents, { cents: true })} strong />
              <Row label="Finance charge" value={formatMoney(plan.financeChargeCents, { cents: true })} accent />
              <Row
                label={`${plan.termMonths - 1} payments of`}
                value={formatMoney(plan.monthlyPaymentCents, { cents: true })}
              />
              <Row label="Final payment" value={formatMoney(plan.finalPaymentCents, { cents: true })} />
              <Row label="Total of payments" value={formatMoney(plan.totalOfPaymentsCents, { cents: true })} strong />
            </dl>

            <p className="mt-3 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
              You pay{" "}
              <span className="tnum font-mono text-[0.8125rem] text-ink">
                {formatMoney(plan.downCents + plan.totalOfPaymentsCents, { cents: true })}
              </span>{" "}
              in total &mdash; exactly the cash price. Financing this car costs
              nothing extra.
            </p>

            {/* Reg Z: a stated down payment and a stated monthly payment are
                both trigger terms. This ships with them. */}
            <RegZDisclosure plan={plan} className="mt-4" />

            <ComparisonNote
              outTheDoorCents={quote.outTheDoorCents}
              downCents={plan.downCents}
              termMonths={plan.termMonths}
            />

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={loading || belowFloor}
                onClick={() => startCheckout("plan")}
                className="flex-1 border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading
                  ? "Opening checkout…"
                  : authenticated
                    ? `Pay ${formatMoney(plan.downCents)} down`
                    : "Sign in to continue"}
              </button>
              {cash && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => startCheckout("cash")}
                  className="border border-rule-strong bg-paper px-5 py-3 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Pay {formatMoney(cash.totalOfPaymentsCents)} in full
                </button>
              )}
            </div>

            <p className="mt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
              Apple Pay is available at checkout. Your down payment goes
              directly to the selling dealer and is refundable in full until you
              sign the contract at your visit.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-3 border-l-2 border-accent bg-paper-sunken px-3 py-2"
              >
                <p className="font-serif text-[0.875rem] leading-relaxed text-ink">
                  {error}
                </p>
                {reasons && (
                  <ul className="mt-1 list-disc pl-5 font-serif text-[0.8125rem] text-ink-muted">
                    {reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * What the same car costs at a conventional buy-here-pay-here rate.
 *
 * Deliberately styled as a footnote rather than as a second offer, and
 * labelled "not available here" in the first line. Reg Z advertising rules
 * cover terms that are actually available; a rate we do not offer must never
 * be able to read as one. The rate, term and total are all stated inline so
 * the comparison is self-disclosing wherever it appears.
 */
function ComparisonNote({
  outTheDoorCents,
  downCents,
  termMonths,
}: {
  outTheDoorCents: number;
  downCents: number;
  termMonths: number;
}) {
  const { plan, extraCostCents, extraPerMonthCents } = financingComparison(
    outTheDoorCents,
    downCents,
    termMonths
  );
  if (extraCostCents <= 0) return null;

  return (
    <div className="mt-4 border-t border-rule pt-3">
      <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        For comparison &mdash; not available here
      </p>
      <p className="tnum mt-1 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
        A typical buy-here-pay-here lender charges around{" "}
        {formatBps(plan.aprBps)} APR. The same car, same{" "}
        {formatMoney(downCents)} down, over the same {termMonths} months would
        be{" "}
        <span className="font-mono text-[0.8125rem] text-ink">
          {formatMoney(plan.monthlyPaymentCents, { cents: true })}
        </span>{" "}
        a month &mdash;{" "}
        <span className="font-mono text-[0.8125rem] text-ink">
          {formatMoney(extraPerMonthCents, { cents: true })}
        </span>{" "}
        more &mdash; and{" "}
        <span className="font-mono text-[0.8125rem] text-brass">
          {formatMoney(extraCostCents, { cents: true })}
        </span>{" "}
        more in total, all of it interest. That is the money you keep.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: boolean;
}) {
  return (
    <>
      <dt className={`text-ink-muted ${strong ? "font-medium text-ink" : ""}`}>
        {label}
      </dt>
      <dd
        className={`text-right ${strong ? "font-semibold text-ink" : "text-ink"} ${
          accent ? "text-brass" : ""
        }`}
      >
        {value}
      </dd>
    </>
  );
}
