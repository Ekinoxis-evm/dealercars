import { describe, it, expect } from "vitest";
import {
  cashPlan,
  financingComparison,
  installmentPlan,
  maxRetailForBudget,
  minDownFor,
  passesPlanUnderwriting,
  passesRetailUnderwriting,
  priceRetailListing,
  quoteListing,
  requiresTilaDisclosure,
  salesTaxOn,
  solveBidCeiling,
} from "./finance";
import { AVAILABLE_NOW, deliverableListings, findListing } from "./available-now";
import {
  FL_ORANGE_DEAL_COSTS,
  TX_DEAL_COSTS,
  dealCostsFor,
  hasDealCostsFor,
} from "./deal-costs";
import type { BudgetEnvelope, CreditTerms } from "./types";

const TERMS: CreditTerms = { aprBps: 2200, termMonths: 36 };
const ENVELOPE: BudgetEnvelope = { downCents: 250_000, monthlyCents: 40_000 };

describe("Florida sales tax with a capped county surtax", () => {
  it("applies the surtax to the whole price below the cap", () => {
    // $4,000 × 6% = $240.00, plus $4,000 × 0.5% = $20.00.
    expect(salesTaxOn(400_000, FL_ORANGE_DEAL_COSTS)).toBe(26_000);
  });

  it("caps the surtax base at $5,000 above it", () => {
    // $11,045 × 6% = $662.70, plus a flat $25.00 — NOT $55.23.
    expect(salesTaxOn(1_104_500, FL_ORANGE_DEAL_COSTS)).toBe(68_770);
  });

  it("is strictly cheaper than a naive blended rate on an expensive car", () => {
    const blended = Math.round(1_104_500 * 0.065);
    expect(salesTaxOn(1_104_500, FL_ORANGE_DEAL_COSTS)).toBeLessThan(blended);
  });

  it("leaves a no-surtax state exactly where it was", () => {
    expect(salesTaxOn(1_000_000, TX_DEAL_COSTS)).toBe(62_500);
  });
});

describe("maxRetailForBudget inverts salesTaxOn", () => {
  const cases = [
    { budget: 600_000, costs: FL_ORANGE_DEAL_COSTS },
    { budget: 1_300_000, costs: FL_ORANGE_DEAL_COSTS },
    { budget: 2_500_000, costs: FL_ORANGE_DEAL_COSTS },
    { budget: 1_300_000, costs: TX_DEAL_COSTS },
  ];

  it.each(cases)(
    "round-trips a $%s budget to within a cent",
    ({ budget, costs }) => {
      const retail = maxRetailForBudget(budget, costs);
      const spent =
        retail + salesTaxOn(retail, costs) + costs.docFeeCents + costs.titleRegCents;
      expect(Math.abs(spent - budget)).toBeLessThanOrEqual(1);
    }
  );

  it("crosses the cap boundary without a discontinuity", () => {
    // Either side of the $5,000 surtax cap the two branches must agree.
    const justBelow = maxRetailForBudget(1_636_00, FL_ORANGE_DEAL_COSTS);
    const justAbove = maxRetailForBudget(1_637_00, FL_ORANGE_DEAL_COSTS);
    expect(justAbove).toBeGreaterThanOrEqual(justBelow);
    expect(justAbove - justBelow).toBeLessThan(200);
  });
});

describe("the Orlando 2014 Mazda3", () => {
  const listing = findListing("listing_mazda3_orl_2014")!;
  const offer = priceRetailListing(
    listing,
    ENVELOPE,
    TERMS,
    FL_ORANGE_DEAL_COSTS
  );

  it("is sourced, not acquired — it cannot be delivered yet", () => {
    // A down payment must never be collectable against a car the dealer does
    // not own. This assertion is the guardrail, not a description.
    expect(listing.status).toBe("sourced");
    expect(deliverableListings()).toHaveLength(0);
  });

  it("prices off the acquisition target, never the seller's ask", () => {
    expect(listing.acquisitionTargetCents).toBeLessThan(listing.askingPriceCents);
    // $7,200 + $150 buy/PPI + $150 transport + $750 recon + $2,795 gross.
    expect(offer.retailPriceCents).toBe(1_104_500);
  });

  it("lands at $12,831.70 out the door", () => {
    expect(offer.salesTaxCents).toBe(68_770);
    expect(offer.outTheDoorCents).toBe(1_283_170);
  });

  it("needs $2,309.71 down and produces a $394.57 payment at $2,500", () => {
    expect(offer.minDownCents).toBe(230_971);
    expect(offer.loan.amountFinancedCents).toBe(1_033_170);
    expect(offer.loan.monthlyPaymentCents).toBe(39_457);
    expect(offer.loan.totalOfPaymentsCents).toBe(1_420_462);
  });

  it("clears underwriting at $2,400/mo gross and fails at $1,800", () => {
    expect(passesRetailUnderwriting(offer, 240_000).ok).toBe(true);
    const thin = passesRetailUnderwriting(offer, 180_000);
    expect(thin.ok).toBe(false);
    expect(thin.reasons[0]).toMatch(/Payment-to-income/);
  });

  it("reports the down payment shortfall instead of silently topping it up", () => {
    const short = priceRetailListing(
      listing,
      { downCents: 100_000, monthlyCents: 40_000 },
      TERMS,
      FL_ORANGE_DEAL_COSTS
    );
    expect(short.downCents).toBe(100_000);
    expect(short.minDownCents).toBe(230_971);
    expect(passesRetailUnderwriting(short, 300_000).reasons.join()).toMatch(
      /Down payment/
    );
  });

  it("does not carry the private-party warranty into the member's deal", () => {
    expect(listing.sellerWarrantyMonths).toBe(3);
    expect(listing.notes.join(" ")).toMatch(/does not survive the sale/i);
  });
});

describe("dealCostsFor", () => {
  it("maps known states and reports unknown ones honestly", () => {
    expect(dealCostsFor("FL")).toBe(FL_ORANGE_DEAL_COSTS);
    expect(dealCostsFor("fl")).toBe(FL_ORANGE_DEAL_COSTS);
    expect(hasDealCostsFor("CA")).toBe(false);
    // Falls back rather than throwing, but callers must check first.
    expect(dealCostsFor("CA")).toBe(TX_DEAL_COSTS);
  });

  it("changes the bid ceiling materially between states", () => {
    const tx = solveBidCeiling(ENVELOPE, TERMS, TX_DEAL_COSTS);
    const fl = solveBidCeiling(ENVELOPE, TERMS, FL_ORANGE_DEAL_COSTS);
    // Florida's $699 doc fee and $400 title eat straight into the ceiling.
    expect(fl.maxAuctionBidCents).not.toBe(tx.maxAuctionBidCents);
  });
});

describe("minDownFor", () => {
  it("rounds up so the stated minimum is never a cent short", () => {
    expect(minDownFor(1_283_170)).toBe(230_971); // 18% = 230970.6
    expect(minDownFor(100_001)).toBe(18_001); // 18% = 18000.18
  });
});

describe("inventory integrity", () => {
  it.each(AVAILABLE_NOW)("$id has coherent money and a mapped state", (l) => {
    expect(Number.isInteger(l.askingPriceCents)).toBe(true);
    expect(Number.isInteger(l.acquisitionTargetCents)).toBe(true);
    expect(l.acquisitionTargetCents).toBeGreaterThan(0);
    expect(hasDealCostsFor(l.state)).toBe(true);
    expect(l.durability).toBeGreaterThanOrEqual(0);
    expect(l.durability).toBeLessThanOrEqual(1);
  });
});


// ---------------------------------------------------------------------------
// The actual product: interest-free. The dealer's return is the gross on the
// car, not a finance charge on the member.
// ---------------------------------------------------------------------------

describe("interest-free plans on the Orlando Mazda3", () => {
  const listing = findListing("listing_mazda3_orl_2014")!;

  it("charges exactly the cash price no matter how it is paid", () => {
    // This is the promise of the product. If it is not true to the cent, the
    // product is not interest-free and the disclosure is a misstatement.
    for (const down of [200_000, 250_000, 300_000, 400_000]) {
      const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, down);
      for (const plan of quote.plans) {
        expect(plan.financeChargeCents).toBe(0);
        expect(plan.aprBps).toBe(0);
        if (plan.kind === "cash") {
          expect(plan.totalOfPaymentsCents).toBe(quote.outTheDoorCents);
        } else {
          // Down plus every scheduled payment equals the cash price exactly.
          expect(plan.downCents + plan.totalOfPaymentsCents).toBe(
            quote.outTheDoorCents
          );
        }
      }
    }
  });

  it("pays $4,000 down and $245.32 a month for 36 months", () => {
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 400_000);
    const plan = quote.plans.find((p) => p.termMonths === 36)!;
    expect(plan.amountFinancedCents).toBe(883_170);
    expect(plan.monthlyPaymentCents).toBe(24_532);
    // The last payment absorbs the cents that do not divide evenly.
    expect(plan.finalPaymentCents).toBe(24_550);
    expect(
      plan.monthlyPaymentCents * 35 + plan.finalPaymentCents
    ).toBe(883_170);
  });

  it("pays $2,500 down and $286.99 a month for 36 months", () => {
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 250_000);
    const plan = quote.plans.find((p) => p.termMonths === 36)!;
    expect(plan.monthlyPaymentCents).toBe(28_699);
    expect(plan.finalPaymentCents).toBe(28_705);
  });

  it("never rounds a monthly payment UP past the stated figure", () => {
    // Rounding up would bill every member a cent more per month than the
    // schedule they signed. The remainder belongs in the final payment.
    for (const down of [200_000, 250_000, 333_333, 400_000]) {
      for (const term of [12, 24, 36]) {
        const plan = installmentPlan(1_283_170, down, term);
        expect(plan.monthlyPaymentCents * term).toBeLessThanOrEqual(
          plan.amountFinancedCents
        );
        expect(plan.finalPaymentCents).toBeGreaterThanOrEqual(
          plan.monthlyPaymentCents
        );
      }
    }
  });

  it("opens the car to a far thinner income than a 22% loan would", () => {
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 400_000);
    const plan = quote.plans.find((p) => p.termMonths === 36)!;
    // $245.32 clears the 20% PTI cap at $1,300/mo gross. The same car at 22%
    // needed nearly $2,000.
    expect(passesPlanUnderwriting(quote, plan, 130_000).ok).toBe(true);
    expect(passesPlanUnderwriting(quote, plan, 110_000).ok).toBe(false);
  });

  it("still enforces the 18% down floor at a zero rate", () => {
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 150_000);
    const plan = quote.plans.find((p) => p.termMonths === 36)!;
    const result = passesPlanUnderwriting(quote, plan, 500_000);
    expect(result.ok).toBe(false);
    expect(result.reasons.join()).toMatch(/Down payment/);
  });

  it("quotes cash as well, at the same out-the-door price", () => {
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 400_000);
    const cash = quote.plans[0];
    expect(cash.kind).toBe("cash");
    expect(cash.totalOfPaymentsCents).toBe(quote.outTheDoorCents);
    expect(cash.requiresTila).toBe(false);
  });
});

describe("Reg Z applies to interest-free credit above four installments", () => {
  it("treats 0% over more than four payments as a credit sale", () => {
    // 12 CFR 1026.2(a)(17): a creditor extends credit payable in more than
    // four installments OR for which a finance charge is imposed.
    expect(requiresTilaDisclosure(36, 0)).toBe(true);
    expect(requiresTilaDisclosure(24, 0)).toBe(true);
    expect(requiresTilaDisclosure(5, 0)).toBe(true);
  });

  it("falls outside Reg Z at four payments or fewer with no finance charge", () => {
    expect(requiresTilaDisclosure(4, 0)).toBe(false);
    expect(requiresTilaDisclosure(3, 0)).toBe(false);
  });

  it("catches a finance charge at any term length", () => {
    expect(requiresTilaDisclosure(3, 1)).toBe(true);
  });

  it("flags every offered installment plan as requiring the TILA box", () => {
    const listing = findListing("listing_mazda3_orl_2014")!;
    const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 400_000);
    for (const plan of quote.plans) {
      expect(plan.requiresTila).toBe(plan.kind === "installments");
    }
  });

  it("does not treat a cash sale as credit", () => {
    expect(cashPlan(1_283_170).requiresTila).toBe(false);
  });
});

describe("financing comparison (illustrative, never an offer)", () => {
  const listing = findListing("listing_mazda3_orl_2014")!;
  const quote = quoteListing(listing, FL_ORANGE_DEAL_COSTS, 400_000);

  it("shows what a 22% BHPH lender would charge on the same car", () => {
    const { plan, extraCostCents, extraPerMonthCents } = financingComparison(
      quote.outTheDoorCents,
      400_000,
      36
    );
    expect(plan.aprBps).toBe(2200);
    // The comparison must actually cost more, or it is not a comparison.
    expect(plan.monthlyPaymentCents).toBeGreaterThan(24_532);
    expect(extraPerMonthCents).toBe(plan.monthlyPaymentCents - 24_532);
    expect(extraCostCents).toBe(plan.financeChargeCents);
    // On a car this size the zero rate is worth thousands, not tens.
    expect(extraCostCents).toBeGreaterThan(300_000);
  });

  it("reports the saving as the finance charge that is not paid", () => {
    for (const term of [12, 24, 36]) {
      const { plan, extraCostCents } = financingComparison(
        quote.outTheDoorCents,
        400_000,
        term
      );
      // Our total is the amount financed; theirs is that plus interest.
      expect(extraCostCents).toBe(plan.totalOfPaymentsCents - plan.amountFinancedCents);
      expect(extraCostCents).toBeGreaterThan(0);
    }
  });

  it("is zero when the comparison rate is itself zero", () => {
    const { extraCostCents, extraPerMonthCents } = financingComparison(
      quote.outTheDoorCents,
      400_000,
      36,
      0
    );
    expect(extraCostCents).toBe(0);
    expect(extraPerMonthCents).toBe(0);
  });
});
