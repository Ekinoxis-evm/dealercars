import { describe, it, expect } from "vitest";
import {
  DOWN_STEP,
  MAX_TERM_MONTHS,
  MIN_TERM_MONTHS,
  MONTHLY_STEP,
  clampDown,
  clampTerm,
  downBounds,
  downForMonthly,
  monthlyAt,
  monthlyBounds,
  monthlySliderRange,
  monthlyThumbFor,
  termForMonthly,
} from "./payment-slider";
import { installmentPlan, minDownFor, quoteListing } from "./finance";
import { FL_ORANGE_DEAL_COSTS } from "./deal-costs";
import { AVAILABLE_NOW } from "./available-now";
import { UNDERWRITING } from "./types";

/** A spread of real price points: a cheap runner up to a late-model truck. */
const RETAIL_PRICES = [6_000_00, 8_500_00, 11_499_00, 17_000_00, 25_000_00];

/** Out-the-door in Orange County, FL, from the same function the page uses. */
function otdFor(retailPriceCents: number): number {
  return quoteListing(
    { ...AVAILABLE_NOW[0], retailPriceCentsOverride: retailPriceCents },
    FL_ORANGE_DEAL_COSTS,
    0
  ).outTheDoorCents;
}

/** Every price, with its down-payment bounds. */
function cases(): { otd: number; bounds: ReturnType<typeof downBounds> }[] {
  return RETAIL_PRICES.map((retail) => {
    const otd = otdFor(retail);
    return { otd, bounds: downBounds(minDownFor(otd), otd) };
  });
}

describe("term range", () => {
  it("stops at the underwriting cap rather than a separate number", () => {
    // A term the builder offers but underwriting refuses is a promise the
    // checkout breaks.
    expect(MAX_TERM_MONTHS).toBe(UNDERWRITING.maxTermMonths);
  });

  it("keeps every plan a Reg Z credit sale", () => {
    // Four payments or fewer with no finance charge falls outside Reg Z
    // entirely, which would quietly change what is being sold.
    expect(MIN_TERM_MONTHS).toBeGreaterThan(4);
  });

  it("clamps into range and to whole months", () => {
    expect(clampTerm(0)).toBe(MIN_TERM_MONTHS);
    expect(clampTerm(999)).toBe(MAX_TERM_MONTHS);
    expect(clampTerm(18.4)).toBe(18);
  });
});

describe("downBounds", () => {
  it("never opens below the 18% underwriting floor", () => {
    // Rounding the floor DOWN onto the grid would offer a plan the
    // down-payment route then refuses, which is worse than not offering it.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      expect(downBounds(minDownFor(otd), otd).min).toBeGreaterThanOrEqual(
        minDownFor(otd)
      );
    }
  });

  it("gives a usable range on a cheap car and on an expensive one", () => {
    // The old hardcoded $2,000–$4,000 failed at both ends: too much down on a
    // $6k car, and below the floor entirely once the car passed ~$22k.
    const cheap = otdFor(6_000_00);
    expect(downBounds(minDownFor(cheap), cheap).min).toBeLessThan(2_000_00);

    const dear = otdFor(25_000_00);
    const dearBounds = downBounds(minDownFor(dear), dear);
    expect(dearBounds.min).toBeGreaterThan(4_000_00);
    expect(dearBounds.max).toBeGreaterThan(dearBounds.min);
  });

  it("still leaves the slider somewhere to move when half the price is under the floor", () => {
    const bounds = downBounds(5_000_00, 6_000_00);
    expect(bounds.max).toBeGreaterThan(bounds.min);
  });
});

describe("monthlyAt is the payment the server would quote", () => {
  it("agrees with installmentPlan to the cent, at every term", () => {
    // The labels under the payment slider are this function. If it drifted
    // from installmentPlan, the range on offer would not be the range shown.
    for (const { otd, bounds } of cases()) {
      for (const term of [MIN_TERM_MONTHS, 12, 23, 36, MAX_TERM_MONTHS]) {
        for (const down of [bounds.min, bounds.max]) {
          expect(monthlyAt(otd, down, term)).toBe(
            installmentPlan(otd, down, term).monthlyPaymentCents
          );
        }
      }
    }
  });
});

describe("solving for term", () => {
  it("reaches both ends of the term range", () => {
    for (const { otd, bounds } of cases()) {
      const down = bounds.min;
      const travel = monthlySliderRange(otd, "term", down, 36, bounds);
      // Smallest payment is the longest term, and vice versa.
      expect(termForMonthly(otd, down, travel.min, travel)).toBe(MAX_TERM_MONTHS);
      expect(termForMonthly(otd, down, travel.max, travel)).toBe(MIN_TERM_MONTHS);
    }
  });

  it("never returns a term outside the range, at any stop", () => {
    for (const { otd, bounds } of cases()) {
      const down = bounds.min;
      const travel = monthlySliderRange(otd, "term", down, 36, bounds);
      for (let m = travel.min; m <= travel.max; m += MONTHLY_STEP) {
        const term = termForMonthly(otd, down, m, travel);
        expect(Number.isInteger(term)).toBe(true);
        expect(term).toBeGreaterThanOrEqual(MIN_TERM_MONTHS);
        expect(term).toBeLessThanOrEqual(MAX_TERM_MONTHS);
      }
    }
  });

  it("never answers with a payment higher than the one asked for", () => {
    // The guarantee this control exists for. Someone dragging "payment I can
    // make" to $400 is stating a ceiling; coming back with $420 because the
    // term rounded to the nearest month would break exactly the budget they
    // were describing.
    for (const { otd, bounds } of cases()) {
      for (const down of [bounds.min, bounds.max]) {
        const travel = monthlySliderRange(otd, "term", down, 36, bounds);
        for (let m = travel.min; m <= travel.max; m += MONTHLY_STEP) {
          const term = termForMonthly(otd, down, m, travel);
          expect(monthlyAt(otd, down, term)).toBeLessThanOrEqual(m);
        }
      }
    }
  });

  it("gives the shortest term that stays inside that ceiling", () => {
    // Cheapest total time in debt for the payment they named: one month less
    // would push the payment back above their ceiling.
    for (const { otd, bounds } of cases()) {
      const down = bounds.min;
      const travel = monthlySliderRange(otd, "term", down, 36, bounds);
      for (let m = travel.min + MONTHLY_STEP; m < travel.max; m += MONTHLY_STEP) {
        const term = termForMonthly(otd, down, m, travel);
        if (term > MIN_TERM_MONTHS) {
          expect(monthlyAt(otd, down, term - 1)).toBeGreaterThan(m);
        }
      }
    }
  });
});

describe("solving for down", () => {
  it("reaches both ends of the down range", () => {
    for (const { otd, bounds } of cases()) {
      for (const term of [MIN_TERM_MONTHS, 24, MAX_TERM_MONTHS]) {
        const travel = monthlySliderRange(otd, "down", bounds.min, term, bounds);
        // More down is a smaller payment, so the ends cross over.
        expect(downForMonthly(otd, travel.min, term, bounds, travel)).toBe(bounds.max);
        expect(downForMonthly(otd, travel.max, term, bounds, travel)).toBe(bounds.min);
      }
    }
  });

  it("round-trips without jitter at every stop", () => {
    // The payment slider sets the down payment it implies. If reading that
    // back gave a different payment, the thumb would jump a step away from
    // where it was released and fight the finger.
    for (const { otd, bounds } of cases()) {
      for (const term of [MIN_TERM_MONTHS, 12, 36, MAX_TERM_MONTHS]) {
        const travel = monthlySliderRange(otd, "down", bounds.min, term, bounds);
        for (let m = travel.min; m <= travel.max; m += MONTHLY_STEP) {
          const down = downForMonthly(otd, m, term, bounds, travel);
          expect(monthlyThumbFor(otd, down, term, travel)).toBe(m);
        }
      }
    }
  });

  it("stays on the down-payment grid and inside the bounds", () => {
    for (const { otd, bounds } of cases()) {
      const term = 24;
      const travel = monthlySliderRange(otd, "down", bounds.min, term, bounds);
      for (let m = travel.min; m <= travel.max; m += MONTHLY_STEP) {
        const down = downForMonthly(otd, m, term, bounds, travel);
        expect(down % DOWN_STEP).toBe(0);
        expect(down).toBeGreaterThanOrEqual(bounds.min);
        expect(down).toBeLessThanOrEqual(bounds.max);
      }
    }
  });
});

describe("the stated payment range is the range on offer", () => {
  it("labels the ends with the payment the server would quote there", () => {
    for (const { otd, bounds } of cases()) {
      // Solving for term: the down payment is pinned, the term sweeps.
      const byTerm = monthlyBounds(otd, "term", bounds.min, 36, bounds);
      expect(byTerm.max).toBe(
        installmentPlan(otd, bounds.min, MIN_TERM_MONTHS).monthlyPaymentCents
      );
      expect(byTerm.min).toBe(
        installmentPlan(otd, bounds.min, MAX_TERM_MONTHS).monthlyPaymentCents
      );

      // Solving for down: the term is pinned, the down payment sweeps.
      const byDown = monthlyBounds(otd, "down", bounds.min, 24, bounds);
      expect(byDown.max).toBe(
        installmentPlan(otd, bounds.min, 24).monthlyPaymentCents
      );
      expect(byDown.min).toBe(
        installmentPlan(otd, bounds.max, 24).monthlyPaymentCents
      );
    }
  });
});

describe("clampDown", () => {
  it("holds the ends and lands on the grid", () => {
    const bounds = { min: 1_350_00, max: 3_740_00 };
    expect(clampDown(0, bounds)).toBe(bounds.min);
    expect(clampDown(99_999_00, bounds)).toBe(bounds.max);
    expect(clampDown(2_001_00, bounds) % DOWN_STEP).toBe(0);
  });
});
