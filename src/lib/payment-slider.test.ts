import { describe, it, expect } from "vitest";
import {
  DOWN_STEP,
  MONTHLY_STEP,
  clampDown,
  downBounds,
  downForMonthly,
  monthlyAt,
  monthlyBounds,
  monthlySliderRange,
  monthlyThumbFor,
} from "./payment-slider";
import { installmentPlan, minDownFor, quoteListing } from "./finance";
import { FL_ORANGE_DEAL_COSTS } from "./deal-costs";
import { AVAILABLE_NOW } from "./available-now";
import { OFFERED_TERMS_MONTHS } from "./types";

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

describe("downBounds", () => {
  it("never opens below the 18% underwriting floor", () => {
    // Rounding the floor DOWN onto the grid would offer a plan the
    // down-payment route then refuses, which is worse than not offering it.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      const floor = minDownFor(otd);
      expect(downBounds(floor, otd).min).toBeGreaterThanOrEqual(floor);
    }
  });

  it("gives a usable range on a cheap car and on an expensive one", () => {
    // The old hardcoded $2,000–$4,000 failed at both ends: too much down on a
    // $6k car, and below the floor entirely once the car passed ~$22k.
    const cheap = otdFor(6_000_00);
    const cheapBounds = downBounds(minDownFor(cheap), cheap);
    expect(cheapBounds.min).toBeLessThan(2_000_00);

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

describe("the two sliders are one dial", () => {
  it("round-trips without jitter at every price, term and stop", () => {
    // The monthly slider sets the down payment it implies. If reading that
    // down payment back gave a different monthly, the thumb would jump a step
    // away from where it was released and fight the finger.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      const bounds = downBounds(minDownFor(otd), otd);

      for (const term of OFFERED_TERMS_MONTHS) {
        const travel = monthlySliderRange(otd, term, bounds);
        expect(travel.max).toBeGreaterThan(travel.min);

        for (let m = travel.min; m <= travel.max; m += MONTHLY_STEP) {
          const down = downForMonthly(otd, m, term, bounds);
          expect(monthlyThumbFor(otd, down, term, bounds)).toBe(m);
        }
      }
    }
  });

  it("agrees with the payment the server would actually quote", () => {
    // The thumb is a projection; the figure a member reads comes from
    // installmentPlan. They must land on the same cents, or the slider would
    // be pointing at a payment that is not on offer.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      const bounds = downBounds(minDownFor(otd), otd);

      for (const term of OFFERED_TERMS_MONTHS) {
        for (const down of [bounds.min, bounds.max, clampDown((bounds.min + bounds.max) / 2, bounds)]) {
          const plan = installmentPlan(otd, down, term);
          // The labels are exact: monthlyAt IS the payment installmentPlan
          // quotes, so the range under the slider is the range on offer.
          expect(monthlyAt(otd, down, term)).toBe(plan.monthlyPaymentCents);

          // The thumb only positions; it may sit up to a whole grid step away
          // at the pinned ends, and never further.
          const thumb = monthlyThumbFor(otd, down, term, bounds);
          expect(Math.abs(thumb - plan.monthlyPaymentCents)).toBeLessThanOrEqual(
            MONTHLY_STEP
          );
        }
      }
    }
  });
});

describe("the stated monthly range is the range on offer", () => {
  it("labels the ends with the payment the server would quote there", () => {
    // The labels are exact rather than snapped. A stated maximum rounded to
    // the nearest $5 sat two dollars BELOW a payment the slider could reach,
    // which made the range under the slider disagree with the figure above it.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      const bounds = downBounds(minDownFor(otd), otd);
      for (const term of OFFERED_TERMS_MONTHS) {
        const range = monthlyBounds(otd, term, bounds);
        expect(range.max).toBe(
          installmentPlan(otd, bounds.min, term).monthlyPaymentCents
        );
        expect(range.min).toBe(
          installmentPlan(otd, bounds.max, term).monthlyPaymentCents
        );
      }
    }
  });

  it("reaches both labelled ends, even though the grid stops short of them", () => {
    // The travel is rounded inward so every stop is reachable, so the extremes
    // are reached by the pins instead. Dragging fully either way must land on
    // the down payment whose payment is on the label.
    for (const retail of RETAIL_PRICES) {
      const otd = otdFor(retail);
      const bounds = downBounds(minDownFor(otd), otd);
      for (const term of OFFERED_TERMS_MONTHS) {
        const travel = monthlySliderRange(otd, term, bounds);
        expect(downForMonthly(otd, travel.max, term, bounds)).toBe(bounds.min);
        expect(downForMonthly(otd, travel.min, term, bounds)).toBe(bounds.max);
      }
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
