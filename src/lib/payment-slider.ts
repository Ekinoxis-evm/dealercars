import type { Money } from "./types";
import { UNDERWRITING } from "./types";

/**
 * The geometry of the payment builder.
 *
 * Three quantities, one identity, and at 0% APR it is arithmetic rather than
 * amortization:
 *
 *     financed = price − down
 *     monthly  = financed / term
 *
 * So any two of {down, term, monthly} fix the third, and the builder lets the
 * member set whichever two they actually know. Somebody with $5,000 saved and
 * $400 a month to spare wants to be told how long it takes; somebody who needs
 * to be done in a year wants to be told what to put down. A fixed menu of
 * terms answers neither question.
 *
 * This module computes POSITIONS — which combinations are reachable and where a
 * thumb sits. It never produces the figure a member reads: that always comes
 * back from `quoteListing` on the server, so the number shown and the number
 * charged come from one place. The one thing solved here that reaches the
 * server is the derived INPUT (a term, or a down payment), which is then quoted
 * like any other.
 */

/**
 * Both money sliders move on the same $5 grid, and the term on whole months.
 * Equal money steps matter: the monthly slider sets a down payment or a term,
 * and a mismatched grid would land the thumb a step from where it was released.
 */
export const DOWN_STEP: Money = 5_00;
export const MONTHLY_STEP: Money = 5_00;

/**
 * How long a member may stretch it.
 *
 * The ceiling is the underwriting cap, not a separate number — a term the
 * builder offers but underwriting refuses is a promise the checkout breaks.
 *
 * The floor is two payments. Decided 2026-09-22, down from six: a member who
 * can clear the car in two or three months should be allowed to say so. Note
 * what that means. A plan of four payments or fewer at 0% with no finance
 * charge is NOT a Reg Z credit sale (12 CFR 1026.2(a)(17), and
 * REG_Z_INSTALLMENT_THRESHOLD is that line), so for a 2–4 month plan the TILA
 * box is not legally required. It is rendered anyway — the same figures, the
 * same words — because a page that shows the terms for a 5-month plan and
 * hides them for a 4-month one is a page whose honesty depends on a slider.
 * The retail installment contract is still the paper for every plan.
 */
export const MIN_TERM_MONTHS = 2;
export const MAX_TERM_MONTHS = UNDERWRITING.maxTermMonths;

/**
 * The term the builder opens on, and the one the car page server-renders its
 * first quote for. Shared so the two cannot disagree: the page quoting a
 * different term than the picker starts on puts a payment on screen labelled
 * with the wrong number of months until the first fetch lands.
 */
export const DEFAULT_TERM_MONTHS = 36;

/**
 * The down payment ceiling, as a share of the out-the-door price. Past half,
 * the plan stops being the point and the pay-in-full button is right there.
 */
export const DOWN_CEILING_RATIO = 0.5;

/** Which quantity the builder works out for you. */
export type SolveFor = "monthly" | "term" | "down";

export interface Bounds {
  min: Money;
  max: Money;
}

export function snap(cents: Money, step: Money): Money {
  return Math.round(cents / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The down payment range for one car.
 *
 * The floor is rounded UP onto the grid, never down: a slider whose left end
 * sat a few dollars under the 18% minimum would offer a plan the down-payment
 * route then refuses, which is worse than one that cannot reach it.
 */
export function downBounds(
  minDownCents: Money,
  outTheDoorCents: Money
): Bounds {
  const min = Math.ceil(minDownCents / DOWN_STEP) * DOWN_STEP;
  const max =
    Math.floor((outTheDoorCents * DOWN_CEILING_RATIO) / DOWN_STEP) * DOWN_STEP;
  // A car cheap enough that half its price falls under the floor would give an
  // inverted range. Give the slider one step to move in rather than none.
  return { min, max: Math.max(max, min + DOWN_STEP) };
}

export function clampDown(cents: Money, bounds: Bounds): Money {
  return clamp(snap(cents, DOWN_STEP), bounds.min, bounds.max);
}

export function clampTerm(months: number): number {
  return clamp(Math.round(months), MIN_TERM_MONTHS, MAX_TERM_MONTHS);
}

/**
 * The monthly payment a (down, term) pair implies, to the cent.
 *
 * Floor division, matching `installmentPlan` exactly: no member is billed a
 * cent more per month than the schedule states, and the remainder goes into
 * the final payment. Used to label the ends of the monthly slider, so the
 * range a member reads is the range actually on offer.
 */
export function monthlyAt(
  outTheDoorCents: Money,
  downCents: Money,
  termMonths: number
): Money {
  if (termMonths <= 0) return 0;
  return Math.floor(Math.max(0, outTheDoorCents - downCents) / termMonths);
}

/**
 * What the monthly slider can reach, given which other quantity is free.
 *
 * Solving for TERM, the down payment is pinned and the term sweeps its whole
 * range, so the longest term gives the smallest payment. Solving for DOWN, the
 * term is pinned and the down payment sweeps instead — more down, less a month.
 * Either way the bounds cross over, which is why they are computed rather than
 * assumed.
 */
export function monthlyBounds(
  outTheDoorCents: Money,
  solveFor: SolveFor,
  downCents: Money,
  termMonths: number,
  bounds: Bounds
): Bounds {
  if (solveFor === "term") {
    return {
      min: monthlyAt(outTheDoorCents, downCents, MAX_TERM_MONTHS),
      max: monthlyAt(outTheDoorCents, downCents, MIN_TERM_MONTHS),
    };
  }
  // solveFor === "down": the term is fixed, the down payment moves.
  return {
    min: monthlyAt(outTheDoorCents, bounds.max, termMonths),
    max: monthlyAt(outTheDoorCents, bounds.min, termMonths),
  };
}

/**
 * The grid the monthly thumb travels on. The two modes round differently, and
 * the difference is not fussiness — each end has to serve the promise its mode
 * makes.
 *
 * Solving for DOWN, both ends round inward, so every stop is a payment some
 * down payment can actually produce. Rounding outward there would add a stop
 * whose down payment clamps to the bound, springing the thumb back a step.
 *
 * Solving for TERM, both ends round UP. The top stop has to sit at or above
 * the real maximum, because dragging there pins to the shortest term — and if
 * the stop were below that term's payment, the slider would answer a request
 * for $1,020 with $1,022.33 and break the one guarantee `termForMonthly`
 * makes. Rounding up costs nothing: the pin catches it.
 */
export function monthlySliderRange(
  outTheDoorCents: Money,
  solveFor: SolveFor,
  downCents: Money,
  termMonths: number,
  bounds: Bounds
): Bounds {
  const real = monthlyBounds(outTheDoorCents, solveFor, downCents, termMonths, bounds);
  const min = Math.ceil(real.min / MONTHLY_STEP) * MONTHLY_STEP;
  const max =
    solveFor === "term"
      ? Math.ceil(real.max / MONTHLY_STEP) * MONTHLY_STEP
      : Math.floor(real.max / MONTHLY_STEP) * MONTHLY_STEP;
  if (max <= min) {
    const base = Math.floor(real.min / MONTHLY_STEP) * MONTHLY_STEP;
    return { min: base, max: base + MONTHLY_STEP };
  }
  return { min, max };
}

/**
 * Solve a target monthly payment into a term, with the down payment fixed.
 *
 * A term is whole months, so a target payment almost never lands exactly on
 * one. This rounds the term UP rather than to the nearest, which is not a
 * rounding preference — it is the guarantee that matters here.
 *
 * Payment falls as the term lengthens, so the longer term is the cheaper one.
 * Taking the ceiling therefore returns a payment at or BELOW what the member
 * said they could make, never above it. Rounding to nearest would sometimes
 * answer "you said $400, here is $420", which is the one answer this control
 * must never give: the whole reason someone reaches for it is that $400 is
 * their ceiling.
 *
 * The payment shown is then what that term actually produces, never the one
 * they asked for. Echoing the request back would be inventing a price.
 */
export function termForMonthly(
  outTheDoorCents: Money,
  downCents: Money,
  monthlyCents: Money,
  range: Bounds
): number {
  // Pin the ends so a drag released at the extreme lands on the extreme.
  if (monthlyCents <= range.min) return MAX_TERM_MONTHS;
  if (monthlyCents >= range.max) return MIN_TERM_MONTHS;
  if (monthlyCents <= 0) return MAX_TERM_MONTHS;
  const financed = Math.max(0, outTheDoorCents - downCents);
  return clampTerm(Math.ceil(financed / monthlyCents));
}

/** Solve a target monthly payment into a down payment, with the term fixed. */
export function downForMonthly(
  outTheDoorCents: Money,
  monthlyCents: Money,
  termMonths: number,
  bounds: Bounds,
  range: Bounds
): Money {
  if (monthlyCents <= range.min) return bounds.max;
  if (monthlyCents >= range.max) return bounds.min;
  return clampDown(outTheDoorCents - monthlyCents * termMonths, bounds);
}

/**
 * Where the monthly thumb sits for the (down, term) pair currently in play.
 *
 * Snapped to the grid and clamped into the travel. It deliberately shows the
 * ACHIEVED payment rather than the one last dragged to: when solving for a
 * whole-month term, many requested payments collapse onto the same term, and
 * the thumb settling onto what that term really costs is the slider telling
 * the truth about which payments are reachable.
 */
export function monthlyThumbFor(
  outTheDoorCents: Money,
  downCents: Money,
  termMonths: number,
  range: Bounds
): Money {
  return clamp(
    snap(monthlyAt(outTheDoorCents, downCents, termMonths), MONTHLY_STEP),
    range.min,
    range.max
  );
}
