import { describe, it, expect } from "vitest";
import {
  amortize,
  buildSchedule,
  formatBps,
  formatMoney,
  maxAmountFinanced,
  monthlyPayment,
  ptiRatio,
  solveAffordability,
  toTila,
} from "./finance";
import type { BudgetEnvelope, CreditTerms, DealCosts } from "./types";

// The interest-rate reference case, retained deliberately. The product is 0%,
// but this is the worked example the amortization is pinned to, and a rate is
// the only condition under which the schedule math is actually exercised:
// $2,500 down / $400 monthly at 22% APR, 36 months, 7% tax state.
const ENVELOPE: BudgetEnvelope = { downCents: 250_000, monthlyCents: 40_000 };
const TERMS: CreditTerms = { aprBps: 2200, termMonths: 36 };
const COSTS: DealCosts = {
  salesTaxRate: 0.07,
  docFeeCents: 29_900,
  titleRegCents: 25_000,
  reconEstimateCents: 90_000,
  transportCents: 35_000,
  buyFeeCents: 30_000,
  targetGrossCents: 279_500,
};

describe("monthlyPayment", () => {
  it("reproduces the $387 worked example ($10,135 @ 22%/36)", () => {
    const pmt = monthlyPayment(1_013_500, 2200, 36);
    expect(Math.abs(pmt - 38_700)).toBeLessThanOrEqual(100); // within $1
  });

  it("handles zero APR without dividing by zero", () => {
    expect(monthlyPayment(1_200_000, 0, 36)).toBe(33_333);
    expect(maxAmountFinanced(33_333, 0, 36)).toBe(1_199_988);
  });
});

describe("maxAmountFinanced / monthlyPayment inversion", () => {
  it("round-trips within a couple of cents", () => {
    const cases: Array<[number, number, number]> = [
      [40_000, 2200, 36],
      [38_710, 2200, 36],
      [25_000, 1800, 48],
      [55_000, 2999, 24],
      [30_000, 0, 36],
    ];
    for (const [monthly, apr, term] of cases) {
      const principal = maxAmountFinanced(monthly, apr, term);
      const back = monthlyPayment(principal, apr, term);
      expect(Math.abs(back - monthly)).toBeLessThanOrEqual(2);
    }
  });
});

describe("solveAffordability", () => {
  it("matches the spec worked example within $5", () => {
    const a = solveAffordability(ENVELOPE, TERMS, COSTS);
    expect(Math.abs(a.maxAmountFinancedCents - 1_047_300)).toBeLessThanOrEqual(500);
    expect(Math.abs(a.maxRetailPriceCents - 1_161_000)).toBeLessThanOrEqual(500);
    // Out the door is what a car on the lot is compared against: everything
    // the member finances plus everything they put down.
    expect(a.maxOutTheDoorCents).toBe(
      a.maxAmountFinancedCents + ENVELOPE.downCents
    );
  });

  it("inverts back through the tax and fee stack", () => {
    const a = solveAffordability(ENVELOPE, TERMS, COSTS);
    const otd =
      Math.round(a.maxRetailPriceCents * 1.07) +
      COSTS.docFeeCents +
      COSTS.titleRegCents;
    expect(Math.abs(otd - a.maxOutTheDoorCents)).toBeLessThanOrEqual(2);
  });

  it("never returns a negative price", () => {
    const tiny: BudgetEnvelope = { downCents: 0, monthlyCents: 1_00 };
    const a = solveAffordability(tiny, TERMS, COSTS);
    expect(a.maxRetailPriceCents).toBe(0);
  });
});

describe("amortize / toTila", () => {
  it("computes the full loan figure set for the $387 deal", () => {
    const loan = amortize(1_013_500, 2200, 36);
    // Total of payments is the sum of the SCHEDULED payments, which differs
    // from payment × term by the cents the final payment absorbs.
    const scheduled = buildSchedule(loan, new Date("2026-10-01T00:00:00Z"));
    const sum = scheduled.reduce((s, r) => s + r.paymentCents, 0);
    expect(loan.totalOfPaymentsCents).toBe(sum);
    expect(Math.abs(loan.totalOfPaymentsCents - loan.monthlyPaymentCents * 36))
      .toBeLessThan(100);
    expect(loan.financeChargeCents).toBe(
      loan.totalOfPaymentsCents - loan.amountFinancedCents
    );
    const tila = toTila(loan);
    expect(tila.paymentCents).toBe(loan.monthlyPaymentCents);
    expect(tila.amountFinancedCents).toBe(1_013_500);
    expect(tila.aprBps).toBe(2200);
  });
});

describe("buildSchedule", () => {
  it("closes to exactly zero and principal sums to the amount financed", () => {
    const loan = amortize(1_013_500, 2200, 36);
    const schedule = buildSchedule(loan, new Date("2026-10-01T00:00:00Z"));

    expect(schedule).toHaveLength(36);
    expect(schedule[schedule.length - 1].balanceAfterCents).toBe(0);

    const principalSum = schedule.reduce((s, p) => s + p.principalCents, 0);
    expect(principalSum).toBe(loan.amountFinancedCents);

    // Every row must be internally consistent.
    for (const row of schedule) {
      expect(row.paymentCents).toBe(row.principalCents + row.interestCents);
    }
  });

  it("advances due dates one calendar month at a time", () => {
    const loan = amortize(500_000, 2200, 3);
    const schedule = buildSchedule(loan, new Date("2026-11-15T00:00:00Z"));
    expect(schedule.map((r) => r.dueDate)).toEqual([
      "2026-11-15",
      "2026-12-15",
      "2027-01-15",
    ]);
  });

  it("discloses a true $0.00 finance charge at 0% APR", () => {
    // The main product is interest-free, so this is the disclosure that has to
    // be exactly right: not -$0.06, not +$0.08. Zero.
    for (const principal of [1_033_170, 1_000_000, 883_170, 7_777_777]) {
      for (const term of [12, 24, 36, 48]) {
        const loan = amortize(principal, 0, term);
        expect(loan.financeChargeCents).toBe(0);
        expect(loan.totalOfPaymentsCents).toBe(principal);
      }
    }
  });

  it("zero-APR schedule also closes to zero", () => {
    const loan = amortize(1_000_000, 0, 36);
    const schedule = buildSchedule(loan, new Date("2026-10-01T00:00:00Z"));
    expect(schedule[schedule.length - 1].balanceAfterCents).toBe(0);
    expect(schedule.every((r) => r.interestCents === 0)).toBe(true);
  });
});

describe("ptiRatio", () => {
  it("computes payment-to-income and treats no income as unaffordable", () => {
    expect(ptiRatio(40_000, 200_000)).toBeCloseTo(0.2);
    expect(ptiRatio(40_000, 0)).toBe(Infinity);
  });
});

describe("formatting", () => {
  it("formats whole dollars and cents", () => {
    expect(formatMoney(1_263_500)).toBe("$12,635");
    expect(formatMoney(38_710, { cents: true })).toBe("$387.10");
    expect(formatMoney(-5_000, { cents: true })).toBe("-$50.00");
  });

  it("formats basis points", () => {
    expect(formatBps(2200)).toBe("22.0%");
    expect(formatBps(625)).toBe("6.3%");
    expect(formatBps(0)).toBe("0.0%");
  });
});
