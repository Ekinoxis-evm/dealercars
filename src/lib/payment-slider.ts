import type { Money } from "./types";

/**
 * The geometry of the payment builder's two sliders.
 *
 * It lives here, outside the component, for two reasons. The car page needs the
 * same starting down payment the slider will land on, so it can render the
 * first quote at that figure instead of having the browser correct it a beat
 * later. And the round-trip property below — that dragging the monthly slider
 * and reading it back gives the same number — is arithmetic, so it belongs
 * somewhere a test can reach it.
 *
 * Nothing here computes a price. It computes the POSITIONS a member may drag
 * to; every figure they read still comes from `quoteListing` on the server.
 */

/**
 * Both sliders move on the same $5 grid. That is not cosmetic: the monthly
 * slider sets the down payment it implies, and if `MONTHLY_STEP × term` were
 * not a whole multiple of `DOWN_STEP`, the thumb would land back a step away
 * from where it was released and jitter under the finger. Every offered term
 * is a whole number of months, so equal steps make it hold at all of them.
 */
export const DOWN_STEP: Money = 5_00;
export const MONTHLY_STEP: Money = 5_00;

/**
 * The down payment ceiling, as a share of the out-the-door price. Past half,
 * the plan stops being the point and the pay-in-full button is right there.
 */
export const DOWN_CEILING_RATIO = 0.5;

export interface DownBounds {
  min: Money;
  max: Money;
}

/** Round to the nearest whole step. */
export function snap(cents: Money, step: Money): Money {
  return Math.round(cents / step) * step;
}

/**
 * The down payment range for one car.
 *
 * The floor is rounded UP onto the grid, never down: a slider whose left end
 * sat a few dollars under the 18% minimum would offer a plan that the
 * down-payment route then refuses, which is a worse experience than a slider
 * that simply cannot reach it.
 */
export function downBounds(
  minDownCents: Money,
  outTheDoorCents: Money
): DownBounds {
  const min = Math.ceil(minDownCents / DOWN_STEP) * DOWN_STEP;
  const max =
    Math.floor((outTheDoorCents * DOWN_CEILING_RATIO) / DOWN_STEP) * DOWN_STEP;
  // A car cheap enough that half its price falls under the floor would give an
  // inverted range. Give the slider one step to move in rather than none.
  return { min, max: Math.max(max, min + DOWN_STEP) };
}

export function clampDown(cents: Money, bounds: DownBounds): Money {
  return Math.min(bounds.max, Math.max(bounds.min, snap(cents, DOWN_STEP)));
}

/**
 * The monthly payment a given down payment implies, to the cent.
 *
 * Floor division, matching `installmentPlan` exactly: no member is ever billed
 * a cent more per month than the schedule states, and the remainder goes into
 * the final payment. Used to LABEL the ends of the monthly slider, so the
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
 * The real monthly range at one term: what the ends of the down slider cost.
 * More down is a smaller payment, so the bounds cross over.
 */
export function monthlyBounds(
  outTheDoorCents: Money,
  termMonths: number,
  bounds: DownBounds
): { min: Money; max: Money } {
  return {
    min: monthlyAt(outTheDoorCents, bounds.max, termMonths),
    max: monthlyAt(outTheDoorCents, bounds.min, termMonths),
  };
}

/**
 * The grid the monthly thumb travels on.
 *
 * Rounded INWARD from the real range, so every stop is a payment the down
 * payment can actually be snapped to. Rounding outward looks more generous and
 * is not: the extra stop needs a down payment a few dollars past the bound,
 * which `clampDown` then rounds back onto the bound, which pins the thumb a
 * step away from where it was released. The ends are handled by the pins in
 * `monthlyThumbFor` and `downForMonthly` instead, and the real figures are on
 * the labels — `monthlyBounds` — rather than inferred from this grid.
 */
export function monthlySliderRange(
  outTheDoorCents: Money,
  termMonths: number,
  bounds: DownBounds
): { min: Money; max: Money } {
  const real = monthlyBounds(outTheDoorCents, termMonths, bounds);
  const min = Math.ceil(real.min / MONTHLY_STEP) * MONTHLY_STEP;
  const max = Math.floor(real.max / MONTHLY_STEP) * MONTHLY_STEP;

  // A range narrower than one step — the down slider has only a stop or two to
  // give, on a car whose floor is most of its price. Two stops, both pinned.
  if (max <= min) {
    const base = Math.floor(real.min / MONTHLY_STEP) * MONTHLY_STEP;
    return { min: base, max: base + MONTHLY_STEP };
  }
  return { min, max };
}

/**
 * Where the monthly thumb sits for a given down payment.
 *
 * Pinned at the ends: at either bound of the down slider the thumb belongs at
 * the end of its own travel, not one grid step inside it. Without that, a drag
 * released past the last reachable payment would clamp the down payment and
 * then spring the thumb back a step — the exact jitter the shared grid exists
 * to prevent.
 *
 * This is a THUMB POSITION, never a disclosed figure. The payment a member
 * reads comes back from the server.
 */
export function monthlyThumbFor(
  outTheDoorCents: Money,
  downCents: Money,
  termMonths: number,
  bounds: DownBounds
): Money {
  const range = monthlySliderRange(outTheDoorCents, termMonths, bounds);
  if (downCents <= bounds.min) return range.max;
  if (downCents >= bounds.max) return range.min;
  return Math.min(
    range.max,
    Math.max(
      range.min,
      snap(monthlyAt(outTheDoorCents, downCents, termMonths), MONTHLY_STEP)
    )
  );
}

/**
 * The down payment a chosen monthly implies. The inverse of the above, and
 * pinned at the ends in the same way — the two have to agree about where the
 * travel stops.
 *
 * Without the pin, the outermost grid slot is unreachable: it sits past the
 * real payment range, so the down payment it implies rounds to just INSIDE the
 * bound, whose thumb is then one step lower. Releasing on the last stop would
 * snap back a step.
 */
export function downForMonthly(
  outTheDoorCents: Money,
  monthlyCents: Money,
  termMonths: number,
  bounds: DownBounds
): Money {
  const travel = monthlySliderRange(outTheDoorCents, termMonths, bounds);
  if (monthlyCents >= travel.max) return bounds.min;
  if (monthlyCents <= travel.min) return bounds.max;
  return clampDown(outTheDoorCents - monthlyCents * termMonths, bounds);
}
