import { describe, it, expect } from "vitest";
import {
  amortize,
  buildSchedule,
  formatBps,
  formatMoney,
  maxAmountFinanced,
  monthlyPayment,
  priceLot,
  ptiRatio,
  passesUnderwriting,
  solveBidCeiling,
  toTila,
} from "./finance";
import { buildDrop, rankLots, scoreLot } from "./scoring";
import { MOCK_LOTS } from "./mock-lots";
import type {
  AuctionLot,
  BudgetEnvelope,
  CreditTerms,
  DealCosts,
} from "./types";
import { DEFAULT_TERMS } from "./types";

// The canonical worked deal from the spec: $2,500 down / $400 monthly at
// 22% APR, 36 months, 7% tax state.
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

function lotWith(overrides: Partial<AuctionLot>): AuctionLot {
  return { ...MOCK_LOTS[0], ...overrides };
}

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

describe("solveBidCeiling", () => {
  it("matches the spec worked example within $5", () => {
    const c = solveBidCeiling(ENVELOPE, TERMS, COSTS);
    expect(Math.abs(c.maxAmountFinancedCents - 1_047_300)).toBeLessThanOrEqual(500);
    expect(Math.abs(c.maxRetailPriceCents - 1_161_000)).toBeLessThanOrEqual(500);
    expect(Math.abs(c.maxAuctionBidCents - 726_500)).toBeLessThanOrEqual(500);
  });

  it("never returns a negative bid ceiling", () => {
    const tiny: BudgetEnvelope = { downCents: 0, monthlyCents: 5_000 };
    const c = solveBidCeiling(tiny, TERMS, COSTS);
    expect(c.maxAuctionBidCents).toBe(0);
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

describe("priceLot", () => {
  it("works forward from MMR to a financed proposal", () => {
    const lot = lotWith({ mmrCents: 692_500 });
    const p = priceLot(lot, ENVELOPE, TERMS, COSTS);
    // retail = mmr + buyFee + transport + recon + targetGross
    expect(p.retailPriceCents).toBe(
      692_500 + 30_000 + 35_000 + 90_000 + 279_500
    );
    // OTD = retail * 1.07 + doc + title
    expect(p.outTheDoorCents).toBe(
      Math.round(p.retailPriceCents * 1.07) + 29_900 + 25_000
    );
    expect(p.loan.amountFinancedCents).toBe(p.outTheDoorCents - 250_000);
    // Headroom against the solved ceiling.
    const ceiling = solveBidCeiling(ENVELOPE, TERMS, COSTS);
    expect(p.headroomCents).toBe(ceiling.maxAuctionBidCents - lot.mmrCents);
  });
});

describe("underwriting", () => {
  it("computes PTI and enforces the 20% cap", () => {
    expect(ptiRatio(40_000, 200_000)).toBeCloseTo(0.2);
    const lot = lotWith({});
    const p = priceLot(lot, ENVELOPE, TERMS, COSTS);
    const poor = passesUnderwriting(p, 100_000); // $1,000/mo income
    expect(poor.ok).toBe(false);
    expect(poor.reasons.some((r) => /payment-to-income/i.test(r))).toBe(true);
  });

  it("flags thin down payments and long terms", () => {
    const lot = lotWith({});
    const thin = priceLot(
      lot,
      { downCents: 50_000, monthlyCents: 40_000 },
      { aprBps: 2200, termMonths: 60 },
      COSTS
    );
    const result = passesUnderwriting(thin, 400_000);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => /down payment/i.test(r))).toBe(true);
    expect(result.reasons.some((r) => /term/i.test(r))).toBe(true);
  });
});

describe("scoring hard rejects", () => {
  const ceiling = solveBidCeiling(ENVELOPE, TERMS, COSTS);

  it("rejects branded and salvage titles", () => {
    const s = scoreLot(lotWith({ titleStatus: "branded" }), ceiling, COSTS);
    expect(s.rejected).toBe(true);
    expect(s.score).toBe(0);
    expect(s.rejectReason).toMatch(/title/i);
  });

  it("rejects over-mileage lots", () => {
    const s = scoreLot(lotWith({ mileage: 160_300 }), ceiling, COSTS);
    expect(s.rejected).toBe(true);
    expect(s.rejectReason).toMatch(/mileage/i);
  });

  it("rejects lots priced over the ceiling", () => {
    const s = scoreLot(
      lotWith({ mmrCents: ceiling.maxAuctionBidCents + 1 }),
      ceiling,
      COSTS
    );
    expect(s.rejected).toBe(true);
    expect(s.rejectReason).toMatch(/bid/i);
  });

  it("rejects frame damage announcements", () => {
    const s = scoreLot(
      lotWith({ announcements: ["Frame damage"] }),
      ceiling,
      COSTS
    );
    expect(s.rejected).toBe(true);
    expect(s.rejectReason).toMatch(/frame/i);
  });

  it("scores a clean, in-budget lot between 0 and 1", () => {
    const s = scoreLot(MOCK_LOTS[0], ceiling, COSTS);
    expect(s.rejected).toBe(false);
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(1);
  });
});

describe("rankLots / buildDrop", () => {
  it("drops rejects and sorts descending", () => {
    const ceiling = solveBidCeiling(ENVELOPE, TERMS, COSTS);
    const ranked = rankLots(MOCK_LOTS, ceiling, COSTS);
    expect(ranked.every((s) => !s.rejected)).toBe(true);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    // The mock inventory purposely contains rejects, so some must be gone.
    expect(ranked.length).toBeLessThan(MOCK_LOTS.length);
  });

  it("returns at most `count` proposals, none from rejected lots", () => {
    const drop = buildDrop(MOCK_LOTS, ENVELOPE, TERMS, COSTS, 4);
    expect(drop.length).toBeLessThanOrEqual(4);
    expect(drop.length).toBeGreaterThan(0);
    for (const proposal of drop) {
      expect(proposal.lot.titleStatus).toBe("clean");
      expect(proposal.lot.mileage).toBeLessThanOrEqual(150_000);
      expect(proposal.headroomCents).toBeGreaterThanOrEqual(0);
      expect(proposal.score).toBeGreaterThan(0);
    }
  });

  it("uses DEFAULT_TERMS-compatible math end to end", () => {
    const drop = buildDrop(MOCK_LOTS, ENVELOPE, DEFAULT_TERMS, COSTS);
    for (const p of drop) {
      expect(p.loan.termMonths).toBe(DEFAULT_TERMS.termMonths);
      expect(p.loan.monthlyPaymentCents).toBeGreaterThan(0);
    }
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
