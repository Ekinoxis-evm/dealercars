"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { financingComparison, formatBps, formatMoney } from "@/lib/finance";
import { dollarsToCents } from "@/lib/money-input";
import {
  MAX_TERM_MONTHS,
  MIN_TERM_MONTHS,
  DEFAULT_TERM_MONTHS,
  clampDown,
  clampTerm,
  downBounds,
  downForMonthly,
  monthlyBounds,
  monthlySliderRange,
  termForMonthly,
  type SolveFor,
} from "@/lib/payment-slider";
import type { PriceQuote, RetailListing } from "@/lib/types";
import { RegZDisclosure } from "./RegZDisclosure";
import { useI18n } from "@/i18n/client";
import { localePath } from "@/i18n";
import { WhatsAppLink } from "./DealerContact";
import { VisitPicker } from "./VisitPicker";

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
 *
 * What it does NOT do any more is take money. The call to action on a built
 * plan is a WhatsApp message to an agent carrying the plan as built — the car,
 * the down payment, the monthly, the term, the rate and this page's URL. The
 * down-payment route and its gates still exist server-side; nothing on this
 * surface calls them. No login is needed to talk to somebody.
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
  const { dict, locale } = useI18n();

  // The car's price fixes the whole range. Computed from the initial quote,
  // which is server-rendered, so the sliders are correct in the first paint
  // rather than snapping into place once a fetch lands.
  const bounds = useMemo(
    () => downBounds(initialQuote.minDownCents, initialQuote.outTheDoorCents),
    [initialQuote.minDownCents, initialQuote.outTheDoorCents]
  );

  /**
   * Which quantity the builder works out. The other two are the sliders.
   *
   * Down payment and term are the canonical state — every quote is asked for
   * as a (down, term) pair — and "solve for monthly" is simply the mode where
   * both are set directly. The other two modes drag a target payment and
   * derive one of the pair from it, which is why there is no third piece of
   * state for the payment: it would be a second source of truth for a figure
   * the server already returns.
   */
  const [solveFor, setSolveFor] = useState<SolveFor>("monthly");
  const [downCents, setDownCents] = useState(() =>
    clampDown(initialQuote.minDownCents, bounds)
  );
  const [termMonths, setTermMonths] = useState(DEFAULT_TERM_MONTHS);
  const [quote, setQuote] = useState<PriceQuote>(initialQuote);
  const [picking, setPicking] = useState(false);

  /**
   * This page's absolute URL, for the WhatsApp message. The server render only
   * knows the path; the origin is filled in after hydration so the HTML the
   * server sends and the HTML the client expects are the same.
   */
  const [pageUrl, setPageUrl] = useState(() =>
    localePath(locale, `/marketplace/${listing.id}`)
  );
  useEffect(() => {
    setPageUrl(window.location.href.split(/[?#]/)[0]);
  }, []);

  // Re-quote whenever the pair settles. The term is part of the request now:
  // the builder offers any term in range, so the server has to be asked for
  // the one in play rather than handed a fixed menu to pick from.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        // Plain fetch, not `apiFetch`: the quote endpoint is public, and the
        // API client imports Privy, which would put the whole wallet stack
        // back on this page's critical path (see privy-deferred.tsx).
        const res = await fetch(
          `/api/quote?listingId=${encodeURIComponent(listing.id)}` +
            `&downCents=${downCents}&termMonths=${termMonths}`
        );
        if (!res.ok) throw new Error(`quote ${res.status}`);
        const data = (await res.json()) as { quote: PriceQuote };
        if (!cancelled) setQuote(data.quote);
      } catch {
        // Keep the last good quote rather than showing a broken figure.
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [downCents, termMonths, listing.id]);

  // Matched to the SELECTED term, never "the first instalment plan". The
  // server-rendered quote carries the preset terms, so taking the first one
  // put the 12-month payment on screen under a "× 36" label until the first
  // fetch replaced it.
  const plan = useMemo(
    () => quote.plans.find((p) => p.termMonths === termMonths),
    [quote, termMonths]
  );
  const belowFloor = downCents < quote.minDownCents;

  /** What the payment slider can reach, and where its thumb sits right now. */
  const monthlyRange = useMemo(
    () => monthlyBounds(quote.outTheDoorCents, solveFor, downCents, termMonths, bounds),
    [quote.outTheDoorCents, solveFor, downCents, termMonths, bounds]
  );
  /**
   * The grid the solvers pin against. It no longer positions a thumb — the
   * fields are typed — but `termForMonthly` and `downForMonthly` still use its
   * ends to recognise "they asked for the extreme" and answer with the extreme
   * rather than one step inside it.
   */
  const monthlyTravel = useMemo(
    () => monthlySliderRange(quote.outTheDoorCents, solveFor, downCents, termMonths, bounds),
    [quote.outTheDoorCents, solveFor, downCents, termMonths, bounds]
  );

  /** A typed payment derives whichever of the pair is not pinned. */
  function setMonthly(monthlyCents: number) {
    if (solveFor === "term") {
      setTermMonths(
        termForMonthly(quote.outTheDoorCents, downCents, monthlyCents, monthlyTravel)
      );
    } else {
      setDownCents(
        downForMonthly(
          quote.outTheDoorCents,
          monthlyCents,
          termMonths,
          bounds,
          monthlyTravel
        )
      );
    }
  }

  /**
   * The quote on screen was computed at `quote.downCents` for one term; the
   * member may have already dragged past it. While those disagree, a figure is
   * in flight — dimmed, never replaced by a local guess, because a payment
   * that has not come back from the server must not read as confirmed.
   */
  const settling =
    downCents !== quote.downCents || (plan?.termMonths ?? termMonths) !== termMonths;

  const settlingClass = settling
    ? "opacity-50 transition-opacity"
    : "transition-opacity";

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-rule-strong px-4 py-2.5 sm:px-6">
        <h2 className="font-display text-base font-extrabold tracking-tight">
          {dict.plan.heading}
        </h2>
        <p className="tnum font-mono text-[0.75rem] text-ink-muted">
          {formatMoney(quote.outTheDoorCents, { cents: true })}{" "}
          {dict.plan.outTheDoorSuffix} ·{" "}
          <span className="text-accent">0% APR</span>
        </p>
      </header>

      {/* ---------------------------------------------------- solve for */}
      {/* The member sets the two they know; this names the one they don't.
          A fixed menu of terms answers only "what is the payment", which is
          the wrong question for anyone who already knows their payment. */}
      <fieldset className="px-4 pt-4 sm:px-6">
        <legend className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
          {dict.plan.workOutMy}
        </legend>
        <div className="mt-1.5 flex gap-1.5">
          {(
            [
              ["monthly", dict.plan.payment],
              ["term", dict.plan.months],
              ["down", dict.plan.down],
            ] as [SolveFor, string][]
          ).map(([value, label]) => {
            const selected = value === solveFor;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSolveFor(value)}
                aria-pressed={selected}
                className={`flex-1 border px-2 py-1.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] transition-colors ${
                  selected
                    ? "border-accent bg-accent text-accent-ink"
                    : "border-rule-strong bg-paper text-ink-muted hover:border-accent hover:text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* ---------------------------------------------- the one answer */}
      <div className={`px-4 pt-4 sm:px-6 ${settlingClass}`}>
        <p className="tnum flex items-baseline gap-2">
          <span className="font-display text-5xl font-extrabold leading-none tracking-tight text-brass sm:text-6xl">
            {!plan
              ? "—"
              : solveFor === "term"
                ? plan.termMonths
                : solveFor === "down"
                  ? formatMoney(plan.downCents)
                  : formatMoney(plan.monthlyPaymentCents, { cents: true })}
          </span>
          <span className="font-mono text-[0.8125rem] uppercase tracking-[0.08em] text-ink-muted">
            {solveFor === "term"
              ? dict.plan.monthsUnit
              : solveFor === "down"
                ? dict.plan.downUnit
                : dict.plan.perMonthTimes(termMonths)}
          </span>
        </p>
        {plan && (
          <p className="tnum mt-1.5 font-mono text-[0.75rem] text-ink-muted">
            {solveFor !== "down" &&
              `${formatMoney(plan.downCents)} ${dict.plan.downUnit} · `}
            {solveFor !== "monthly" &&
              `${formatMoney(plan.monthlyPaymentCents, { cents: true })}/mo · `}
            {solveFor !== "term" && `${plan.termMonths} ${dict.plan.monthsWord} · `}
            <span className="text-accent">
              {formatMoney(plan.financeChargeCents, { cents: true })}{" "}
              {dict.plan.interest}
            </span>
          </p>
        )}
      </div>

      <div className="px-4 pb-5 pt-5 sm:px-6">
        {/* ---------------------------------------------- the inputs */}
        {/* Typed, not dragged. A slider is a guess: it takes several attempts
            to land on $5,030 and cannot be aimed at all on a phone. People
            arrive knowing their number — "I have four thousand", "I can do
            four hundred a month" — so the fastest control is the one that
            lets them say it. Values commit on blur or Enter, and are clamped
            to the range printed underneath rather than silently rejected. */}
        <div className="grid grid-cols-2 gap-3">
          {solveFor !== "down" && (
            <NumberField
              id="down"
              label={dict.plan.downLabel}
              prefix="$"
              value={wholeDollars(downCents)}
              hint={`${formatMoney(bounds.min)} – ${formatMoney(bounds.max)}`}
              onCommit={(raw) => {
                const cents = dollarsToCents(raw);
                if (cents !== null) setDownCents(clampDown(cents, bounds));
              }}
            />
          )}

          {solveFor !== "term" && (
            <NumberField
              id="term"
              label={dict.plan.termLabel}
              suffix={dict.plan.monthsShort}
              value={String(termMonths)}
              hint={`${MIN_TERM_MONTHS} – ${MAX_TERM_MONTHS}`}
              onCommit={(raw) => {
                const months = Number(raw.trim());
                if (Number.isFinite(months)) setTermMonths(clampTerm(months));
              }}
            />
          )}

          {solveFor !== "monthly" && (
            <NumberField
              id="monthly"
              label={dict.plan.monthlyLabel}
              prefix="$"
              // Shows what the plan ACTUALLY costs, not what was typed. Asking
              // for $400 over a whole number of months lands on $396.43, and
              // echoing the request back would be inventing a price.
              value={wholeDollars(plan?.monthlyPaymentCents ?? 0)}
              hint={`${formatMoney(monthlyRange.min)} – ${formatMoney(monthlyRange.max)}`}
              onCommit={(raw) => {
                const cents = dollarsToCents(raw);
                if (cents === null) return;
                setMonthly(
                  Math.min(monthlyRange.max, Math.max(monthlyRange.min, cents))
                );
              }}
            />
          )}
        </div>

        {belowFloor && (
          <p
            role="alert"
            className="tnum mt-3 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-snug text-ink-muted"
          >
            {dict.plan.belowFloor(formatMoney(quote.minDownCents, { cents: true }))}
          </p>
        )}

        {plan && (
          <>
            {/* The breakdown, as one line rather than a seven-row ledger. The
                figures a member is owed in full are in the disclosure below;
                this is orientation, not the disclosure itself. */}
            <dl
              className={`tnum mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-rule pt-3 font-mono text-[0.75rem] ${settlingClass}`}
            >
              <Fact label={dict.plan.financed} value={formatMoney(plan.amountFinancedCents, { cents: true })} />
              <Fact label={dict.plan.interestRow} value={formatMoney(plan.financeChargeCents, { cents: true })} accent />
              {/* Deliberately not paired with the cash price here: the header
                  already states it, and printing the same figure twice in one
                  strip reads as a mistake rather than as the proof it is. */}
              <Fact
                label={dict.plan.youPayInTotal}
                value={formatMoney(plan.downCents + plan.totalOfPaymentsCents, { cents: true })}
              />
            </dl>

            {/* The one call to action. The message carries the SETTLED plan —
                the figures the server returned and this page shows — never a
                mid-drag guess, so it is dimmed and inert until the quote lands. */}
            <button
              type="button"
              disabled={settling || belowFloor}
              onClick={() => setPicking(true)}
              className="mt-4 flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {dict.contact.talkToAgent}
            </button>

            {/* The sheet asks for a day and an hour, then sends the plan and
                the visit together. Both send controls are the same WhatsApp
                link with and without the visit line. */}
            <VisitPicker
              listingId={listing.id}
              open={picking}
              onClose={() => setPicking(false)}
              renderSend={(visit) => (
                <WhatsAppLink
                  payload={{
                    kind: "plan",
                    plan: {
                      url: pageUrl,
                      vehicle: `${listing.year} ${listing.make} ${listing.model}`,
                      downCents: plan.downCents,
                      monthlyPaymentCents: plan.monthlyPaymentCents,
                      termMonths: plan.termMonths,
                      outTheDoorCents: quote.outTheDoorCents,
                      visit: visit?.label,
                    },
                  }}
                  className={
                    visit
                      ? "flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
                      : undefined
                  }
                >
                  {visit ? dict.visit.sendWith : dict.visit.sendWithout}
                </WhatsAppLink>
              )}
            />

            <p className="mt-2 font-serif text-[0.8125rem] leading-snug text-ink-muted">
              {dict.contact.talkToAgentNote}
            </p>

            {/* Reg Z: a stated down payment and a stated monthly payment are
                both trigger terms. This ships with them. */}
            <RegZDisclosure plan={plan} className="mt-4" />

            <ComparisonNote
              outTheDoorCents={quote.outTheDoorCents}
              downCents={plan.downCents}
              termMonths={plan.termMonths}
            />

          </>
        )}
      </div>
    </section>
  );
}

/** One label-over-value pair in the breakdown strip. */
function Fact({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </dt>
      <dd className={accent ? "text-brass" : "text-ink"}>{value}</dd>
    </div>
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
  const { dict } = useI18n();
  const { plan, extraCostCents } = financingComparison(
    outTheDoorCents,
    downCents,
    termMonths
  );
  if (extraCostCents <= 0) return null;

  return (
    <div className="mt-4 border-t border-rule pt-3">
      <p className="tnum font-serif text-[0.8125rem] leading-snug text-ink-muted">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-faint">
          {dict.plan.comparisonLabel}{" "}
        </span>
        {dict.plan.comparison(
          formatBps(plan.aprBps),
          formatMoney(plan.monthlyPaymentCents, { cents: true }),
          formatMoney(extraCostCents, { cents: true })
        )}
      </p>
    </div>
  );
}

/** Integer cents as a plain editable dollar string. No symbol, no commas. */
function wholeDollars(cents: number): string {
  return String(Math.round(cents / 100));
}

/**
 * A number you type.
 *
 * Holds its own draft while focused so typing is never fought — a controlled
 * input that reformatted on every keystroke would eat the second character of
 * "40" the moment "4" clamped to the minimum. The draft commits on blur or
 * Enter, and resyncs from the canonical value afterwards, which is how the
 * member sees what their input actually resolved to.
 */
function NumberField({
  id,
  label,
  value,
  hint,
  prefix,
  suffix,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const hintId = useId();

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint"
      >
        {label}
      </label>
      <div className="mt-1 flex items-baseline border border-rule-strong bg-paper px-2 py-1.5 focus-within:border-accent">
        {prefix && (
          <span className="font-mono text-[0.875rem] text-ink-faint">{prefix}</span>
        )}
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          aria-describedby={hintId}
          onFocus={() => setEditing(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false);
            onCommit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="tnum w-full bg-transparent font-mono text-[1.0625rem] font-semibold text-ink outline-none"
        />
        {suffix && (
          <span className="font-mono text-[0.75rem] text-ink-faint">{suffix}</span>
        )}
      </div>
      <p
        id={hintId}
        className="tnum mt-1 font-mono text-[0.625rem] text-ink-faint"
      >
        {hint}
      </p>
    </div>
  );
}
