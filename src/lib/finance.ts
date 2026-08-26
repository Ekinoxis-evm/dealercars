/**
 * Deal math. Pure functions, no I/O.
 *
 * Everything here is integer cents in, integer cents out. Intermediate math
 * runs in floats (the amortization factor is irrational anyway) and is rounded
 * exactly once at the boundary of each returned figure.
 */

import type {
  AmortizedLoan,
  AuctionLot,
  BidCeiling,
  Bps,
  BudgetEnvelope,
  CreditTerms,
  DealCosts,
  Installment,
  Money,
  Proposal,
  TilaDisclosure,
} from "./types";
import { UNDERWRITING } from "./types";

/** Periodic (monthly) rate as a float. 2200 bps → 0.22 / 12. */
function monthlyRate(aprBps: Bps): number {
  return aprBps / 10_000 / 12;
}

/**
 * Annuity factor: (1 - (1+i)^-n) / i. Payment = A / factor; A = payment * factor.
 * At i = 0 the limit is simply n, which is why the zero-APR paths below are
 * straight division/multiplication rather than a special formula.
 */
function annuityFactor(aprBps: Bps, termMonths: number): number {
  const i = monthlyRate(aprBps);
  if (i === 0) return termMonths;
  return (1 - Math.pow(1 + i, -termMonths)) / i;
}

/** Standard amortized payment: pmt = A * i / (1 - (1+i)^-n). Rounded to the cent. */
export function monthlyPayment(
  amountFinancedCents: Money,
  aprBps: Bps,
  termMonths: number
): Money {
  return Math.round(amountFinancedCents / annuityFactor(aprBps, termMonths));
}

/**
 * The inverse: the largest principal a fixed monthly payment can service.
 * A = M * (1 - (1+i)^-n) / i. This is the function that turns a verified
 * budget into purchasing power — everything downstream hangs off it.
 */
export function maxAmountFinanced(
  monthlyCents: Money,
  aprBps: Bps,
  termMonths: number
): Money {
  return Math.round(monthlyCents * annuityFactor(aprBps, termMonths));
}

/**
 * Solve the member's budget backwards into a maximum auction bid.
 *
 * 1. Monthly ceiling → max amount financed (inverse amortization).
 * 2. Amount financed + down covers the out-the-door number, so:
 *      maxRetail = (A_max + down − docFee − titleReg) / (1 + taxRate)
 *    (tax applies to the retail price, doc/title are flat).
 * 3. Strip out everything between hammer and retail:
 *      maxBid = maxRetail − recon − transport − buyFee − targetGross
 *
 * Clamped at 0 — a budget too small to reach the block yields a $0 ceiling,
 * never a negative one.
 */
export function solveBidCeiling(
  envelope: BudgetEnvelope,
  terms: CreditTerms,
  costs: DealCosts
): BidCeiling {
  const maxAmountFinancedCents = maxAmountFinanced(
    envelope.monthlyCents,
    terms.aprBps,
    terms.termMonths
  );

  const maxRetailPriceCents = Math.round(
    (maxAmountFinancedCents +
      envelope.downCents -
      costs.docFeeCents -
      costs.titleRegCents) /
      (1 + costs.salesTaxRate)
  );

  const maxAuctionBidCents = Math.max(
    0,
    maxRetailPriceCents -
      costs.reconEstimateCents -
      costs.transportCents -
      costs.buyFeeCents -
      costs.targetGrossCents
  );

  return { maxAmountFinancedCents, maxRetailPriceCents, maxAuctionBidCents };
}

/** Amortize a principal into the full loan figure set. */
export function amortize(
  amountFinancedCents: Money,
  aprBps: Bps,
  termMonths: number
): AmortizedLoan {
  const monthlyPaymentCents = monthlyPayment(
    amountFinancedCents,
    aprBps,
    termMonths
  );
  const totalOfPaymentsCents = monthlyPaymentCents * termMonths;
  return {
    amountFinancedCents,
    monthlyPaymentCents,
    totalOfPaymentsCents,
    financeChargeCents: totalOfPaymentsCents - amountFinancedCents,
    aprBps,
    termMonths,
  };
}

/** Advance an ISO date by whole calendar months (UTC, no DST surprises). */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/**
 * Build the real installment schedule. Each period: interest = balance * i
 * rounded to cents, principal = payment − interest.
 *
 * Because interest rounds every period, the level payment never divides the
 * principal exactly — a few cents of drift accumulate. The FINAL installment
 * absorbs it: its principal is forced to the remaining balance and its payment
 * recomputed as principal + interest, so the closing balance is exactly 0 and
 * sum(principal) === amountFinanced. That is what makes the schedule bookable.
 */
export function buildSchedule(
  loan: AmortizedLoan,
  firstPaymentDate: Date
): Installment[] {
  const i = monthlyRate(loan.aprBps);
  const schedule: Installment[] = [];
  let balance = loan.amountFinancedCents;

  for (let n = 1; n <= loan.termMonths; n++) {
    const interestCents = Math.round(balance * i);
    let principalCents = loan.monthlyPaymentCents - interestCents;
    let paymentCents = loan.monthlyPaymentCents;

    if (n === loan.termMonths) {
      // Drift absorption: pay off whatever is actually left.
      principalCents = balance;
      paymentCents = principalCents + interestCents;
    }

    balance -= principalCents;
    schedule.push({
      number: n,
      dueDate: addMonths(firstPaymentDate, n - 1).toISOString().slice(0, 10),
      paymentCents,
      principalCents,
      interestCents,
      balanceAfterCents: balance,
    });
  }

  return schedule;
}

/** Snapshot the federal Truth-in-Lending box from a computed loan. */
export function toTila(loan: AmortizedLoan): TilaDisclosure {
  return {
    aprBps: loan.aprBps,
    financeChargeCents: loan.financeChargeCents,
    amountFinancedCents: loan.amountFinancedCents,
    totalOfPaymentsCents: loan.totalOfPaymentsCents,
    paymentCents: loan.monthlyPaymentCents,
    termMonths: loan.termMonths,
  };
}

/**
 * Price a specific lot FORWARD into a member offer. solveBidCeiling works
 * backwards from the budget; this is the other direction — start at the lot's
 * MMR, stack the real costs, and land on the member's actual numbers.
 */
export function priceLot(
  lot: AuctionLot,
  envelope: BudgetEnvelope,
  terms: CreditTerms,
  costs: DealCosts,
  score: number = 0
): Proposal {
  const retailPriceCents =
    lot.mmrCents +
    costs.buyFeeCents +
    costs.transportCents +
    costs.reconEstimateCents +
    costs.targetGrossCents;

  const outTheDoorCents =
    Math.round(retailPriceCents * (1 + costs.salesTaxRate)) +
    costs.docFeeCents +
    costs.titleRegCents;

  const amountFinancedCents = outTheDoorCents - envelope.downCents;
  const loan = amortize(amountFinancedCents, terms.aprBps, terms.termMonths);

  const ceiling = solveBidCeiling(envelope, terms, costs);

  return {
    lot,
    retailPriceCents,
    outTheDoorCents,
    downCents: envelope.downCents,
    loan,
    headroomCents: ceiling.maxAuctionBidCents - lot.mmrCents,
    score,
  };
}

/** Payment-to-income ratio. 0 income → Infinity, which correctly fails PTI. */
export function ptiRatio(
  monthlyPaymentCents: Money,
  grossMonthlyIncomeCents: Money
): number {
  if (grossMonthlyIncomeCents <= 0) return Infinity;
  return monthlyPaymentCents / grossMonthlyIncomeCents;
}

/**
 * Ability-to-pay gate against the UNDERWRITING constants. Capacity, not FICO:
 * PTI ≤ 20%, down ≥ 18% of out-the-door, mileage ≤ 150k, term ≤ 48.
 * Every failed check is reported — a member should see the whole picture, not
 * fix one reason and discover the next.
 */
export function passesUnderwriting(
  proposal: Proposal,
  grossMonthlyIncomeCents: Money
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const pti = ptiRatio(proposal.loan.monthlyPaymentCents, grossMonthlyIncomeCents);
  if (pti > UNDERWRITING.maxPtiRatio) {
    reasons.push(
      `Payment-to-income ${(pti * 100).toFixed(1)}% exceeds the ${
        UNDERWRITING.maxPtiRatio * 100
      }% cap`
    );
  }

  const downRatio =
    proposal.outTheDoorCents > 0
      ? proposal.downCents / proposal.outTheDoorCents
      : 0;
  if (downRatio < UNDERWRITING.minDownRatio) {
    reasons.push(
      `Down payment ${(downRatio * 100).toFixed(1)}% of out-the-door is below the ${
        UNDERWRITING.minDownRatio * 100
      }% minimum`
    );
  }

  if (proposal.lot.mileage > UNDERWRITING.maxMileage) {
    reasons.push(
      `Mileage ${proposal.lot.mileage.toLocaleString("en-US")} exceeds the ${UNDERWRITING.maxMileage.toLocaleString(
        "en-US"
      )} cap`
    );
  }

  if (proposal.loan.termMonths > UNDERWRITING.maxTermMonths) {
    reasons.push(
      `Term ${proposal.loan.termMonths} months exceeds the ${UNDERWRITING.maxTermMonths}-month cap`
    );
  }

  return { ok: reasons.length === 0, reasons };
}

/** "$12,635" by default; "$387.10" with { cents: true }. Negative-safe. */
export function formatMoney(
  cents: Money,
  opts?: { cents?: boolean }
): string {
  const showCents = opts?.cents ?? false;
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = showCents ? abs / 100 : Math.round(abs / 100);
  const formatted = dollars.toLocaleString("en-US", {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
  return `${sign}$${formatted}`;
}

/** 2200 → "22.0%". */
export function formatBps(bps: Bps): string {
  return `${(bps / 100).toFixed(1)}%`;
}
