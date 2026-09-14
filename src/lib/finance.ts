/**
 * Deal math. Pure functions, no I/O.
 *
 * Everything here is integer cents in, integer cents out. Intermediate math
 * runs in floats (the amortization factor is irrational anyway) and is rounded
 * exactly once at the boundary of each returned figure.
 */

import type {
  Affordability,
  AmortizedLoan,
  Bps,
  BudgetEnvelope,
  CreditTerms,
  DealCosts,
  Installment,
  Money,
  PaymentPlan,
  PriceQuote,
  RetailListing,
  RetailOffer,
  TilaDisclosure,
} from "./types";
import {
  LEGACY_APR_BPS,
  OFFERED_TERMS_MONTHS,
  REG_Z_INSTALLMENT_THRESHOLD,
  UNDERWRITING,
  ZERO_APR_BPS,
} from "./types";

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
 * Sales tax on a retail price, state rate plus any capped county surtax.
 *
 * Florida is why the cap exists: the state rate applies to the whole price but
 * the county discretionary surtax only applies to the first $5,000, so a single
 * blended rate overstates the tax on every car above that. Rounded exactly once,
 * on the combined figure.
 */
export function salesTaxOn(retailPriceCents: Money, costs: DealCosts): Money {
  const surtaxRate = costs.countySurtaxRate ?? 0;
  const capCents = costs.countySurtaxCapCents ?? 0;
  const surtaxBase =
    capCents > 0 ? Math.min(retailPriceCents, capCents) : retailPriceCents;
  return Math.round(
    retailPriceCents * costs.salesTaxRate + surtaxBase * surtaxRate
  );
}

/**
 * The inverse of `salesTaxOn`: the largest retail price whose tax, doc fee and
 * title/registration still fit inside `budgetCents` (amount financed + down).
 *
 * Two branches, because the surtax cap makes the tax function piecewise linear:
 * below the cap the whole combined rate applies, above it the surtax is a flat
 * constant. Solve the below-cap branch first and fall through if it overshoots.
 */
export function maxRetailForBudget(
  budgetCents: Money,
  costs: DealCosts
): Money {
  const net = budgetCents - costs.docFeeCents - costs.titleRegCents;
  const surtaxRate = costs.countySurtaxRate ?? 0;
  const capCents = costs.countySurtaxCapCents ?? 0;

  const belowCap = net / (1 + costs.salesTaxRate + surtaxRate);
  if (capCents <= 0 || belowCap <= capCents) return Math.round(belowCap);

  return Math.round((net - capCents * surtaxRate) / (1 + costs.salesTaxRate));
}

/**
 * Solve the member's budget backwards into what they can shop for.
 *
 * 1. Monthly ceiling → max amount financed (inverse amortization).
 * 2. Amount financed + down covers the out-the-door number, inverted by
 *    `maxRetailForBudget` (tax applies to the retail price, doc/title are
 *    flat, and a capped county surtax makes that inversion piecewise).
 *
 * The out-the-door figure comes back out because that is what a car on the lot
 * is actually compared against — the price a member pays includes tax, doc fee
 * and title, and filtering inventory on a sticker price would show them cars
 * they cannot afford.
 *
 * Clamped at 0: a budget too small to reach any car yields nothing, never a
 * negative price.
 */
export function solveAffordability(
  envelope: BudgetEnvelope,
  terms: CreditTerms,
  costs: DealCosts
): Affordability {
  const maxAmountFinancedCents = maxAmountFinanced(
    envelope.monthlyCents,
    terms.aprBps,
    terms.termMonths
  );

  const maxOutTheDoorCents = Math.max(
    0,
    maxAmountFinancedCents + envelope.downCents
  );

  const maxRetailPriceCents = Math.max(
    0,
    maxRetailForBudget(maxOutTheDoorCents, costs)
  );

  return { maxAmountFinancedCents, maxRetailPriceCents, maxOutTheDoorCents };
}

/**
 * Sum the payments actually scheduled, including the drift-absorbing final one.
 *
 * Reg Z defines the total of payments as "the sum of the payments you will have
 * made when you have made all scheduled payments" — which is this figure, not
 * `payment × term`. The two differ by a few cents because interest rounds every
 * period and the last payment is adjusted to close the balance at exactly zero.
 *
 * At 0% APR the difference stops being cosmetic. There, every period's interest
 * is zero, so this sum equals the amount financed exactly and the finance charge
 * comes out at a true $0.00. `payment × term` would instead disclose a few cents
 * of finance charge on an interest-free loan — or, when the rounding goes the
 * other way, a NEGATIVE one.
 */
function sumScheduledPayments(
  amountFinancedCents: Money,
  aprBps: Bps,
  termMonths: number,
  monthlyPaymentCents: Money
): Money {
  const i = monthlyRate(aprBps);
  let balance = amountFinancedCents;
  let total = 0;

  for (let n = 1; n <= termMonths; n++) {
    const interestCents = Math.round(balance * i);
    if (n === termMonths) {
      total += balance + interestCents;
      balance = 0;
    } else {
      total += monthlyPaymentCents;
      balance -= monthlyPaymentCents - interestCents;
    }
  }

  return total;
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
  const totalOfPaymentsCents = sumScheduledPayments(
    amountFinancedCents,
    aprBps,
    termMonths,
    monthlyPaymentCents
  );
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

/** The down payment floor for a given out-the-door price. Ceil, never short. */
export function minDownFor(outTheDoorCents: Money): Money {
  return Math.ceil(outTheDoorCents * UNDERWRITING.minDownRatio);
}

/**
 * The retail price of a car on the lot.
 *
 * Two modes, and the distinction matters. While a car is being *sourced*, its
 * price is derived: what it would have to retail for to leave the target gross
 * intact after acquisition, buy fee, transport and recon. Once the car is
 * actually owned and on the lot, the price is a decision somebody makes and
 * answers for, so `retailPriceCentsOverride` — set through the admin — wins.
 *
 * The derivation prices off `acquisitionTargetCents`, never the asking price.
 * What the seller wants is not a cost; what we pay is. Pricing off the ask
 * hands the seller our gross.
 */
export function retailPriceFor(
  listing: RetailListing,
  costs: DealCosts
): Money {
  if (listing.retailPriceCentsOverride !== undefined) {
    return listing.retailPriceCentsOverride;
  }
  return (
    listing.acquisitionTargetCents +
    costs.buyFeeCents +
    costs.transportCents +
    listing.estimatedReconCents +
    costs.targetGrossCents
  );
}

/**
 * Price a car on the lot into a financed offer against one member's budget.
 *
 * Two things about the base price are deliberate:
 *
 *  - It is `acquisitionTargetCents`, not the asking price. What the seller
 *    wants is not a cost; what we pay is. Pricing off the ask hands the seller
 *    our gross.
 *  - Recon is the listing's own per-car estimate rather than the state-level
 *    budget line, because on a car we can physically inspect we have a real
 *    number and should use it.
 *
 * The member's stated down payment is used as-is even when it falls below
 * `minDownCents`. Silently rounding it up would render a monthly payment the
 * member cannot actually get; the caller shows the shortfall instead.
 */
export function priceRetailListing(
  listing: RetailListing,
  envelope: BudgetEnvelope,
  terms: CreditTerms,
  costs: DealCosts
): RetailOffer {
  const retailPriceCents = retailPriceFor(listing, costs);

  const salesTaxCents = salesTaxOn(retailPriceCents, costs);
  const outTheDoorCents =
    retailPriceCents + salesTaxCents + costs.docFeeCents + costs.titleRegCents;

  const downCents = envelope.downCents;
  const amountFinancedCents = Math.max(0, outTheDoorCents - downCents);

  return {
    listing,
    retailPriceCents,
    salesTaxCents,
    outTheDoorCents,
    downCents,
    minDownCents: minDownFor(outTheDoorCents),
    loan: amortize(amountFinancedCents, terms.aprBps, terms.termMonths),
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
export function passesRetailUnderwriting(
  offer: RetailOffer,
  grossMonthlyIncomeCents: Money
): { ok: boolean; reasons: string[] } {
  return underwrite(
    {
      monthlyPaymentCents: offer.loan.monthlyPaymentCents,
      downCents: offer.downCents,
      outTheDoorCents: offer.outTheDoorCents,
      mileage: offer.listing.mileage,
      termMonths: offer.loan.termMonths,
    },
    grossMonthlyIncomeCents
  );
}

/**
 * The single implementation of the ability-to-pay gate. Both the
 * budget-shaped offer and the per-plan quote route through here, so the
 * thresholds cannot drift apart between the two callers.
 */
function underwrite(
  facts: {
    monthlyPaymentCents: Money;
    downCents: Money;
    outTheDoorCents: Money;
    mileage: number;
    termMonths: number;
  },
  grossMonthlyIncomeCents: Money
): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const pti = ptiRatio(facts.monthlyPaymentCents, grossMonthlyIncomeCents);
  if (pti > UNDERWRITING.maxPtiRatio) {
    reasons.push(
      `Payment-to-income ${(pti * 100).toFixed(1)}% exceeds the ${
        UNDERWRITING.maxPtiRatio * 100
      }% cap`
    );
  }

  const downRatio =
    facts.outTheDoorCents > 0 ? facts.downCents / facts.outTheDoorCents : 0;
  if (downRatio < UNDERWRITING.minDownRatio) {
    reasons.push(
      `Down payment ${(downRatio * 100).toFixed(1)}% of out-the-door is below the ${
        UNDERWRITING.minDownRatio * 100
      }% minimum`
    );
  }

  if (facts.mileage > UNDERWRITING.maxMileage) {
    reasons.push(
      `Mileage ${facts.mileage.toLocaleString("en-US")} exceeds the ${UNDERWRITING.maxMileage.toLocaleString(
        "en-US"
      )} cap`
    );
  }

  if (facts.termMonths > UNDERWRITING.maxTermMonths) {
    reasons.push(
      `Term ${facts.termMonths} months exceeds the ${UNDERWRITING.maxTermMonths}-month cap`
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

// -------------------------------------------------------------- payment plans

/**
 * Whether a plan is a Reg Z credit sale.
 *
 * True if a finance charge is imposed, OR if it is payable in more than four
 * installments — the second limb is the one that catches an interest-free
 * plan. See REG_Z_INSTALLMENT_THRESHOLD.
 */
export function requiresTilaDisclosure(
  termMonths: number,
  financeChargeCents: Money
): boolean {
  return financeChargeCents > 0 || termMonths > REG_Z_INSTALLMENT_THRESHOLD;
}

/** Paying the whole out-the-door price today. Not credit; no disclosure. */
export function cashPlan(outTheDoorCents: Money): PaymentPlan {
  return {
    kind: "cash",
    downCents: outTheDoorCents,
    termMonths: 0,
    amountFinancedCents: 0,
    monthlyPaymentCents: 0,
    finalPaymentCents: 0,
    totalOfPaymentsCents: outTheDoorCents,
    financeChargeCents: 0,
    aprBps: 0,
    requiresTila: false,
  };
}

/**
 * Cash down, then equal monthly payments — interest-free unless a rate is
 * explicitly passed.
 *
 * The balance divides into `termMonths` equal payments, rounded DOWN so no
 * member is ever billed a cent more per month than the schedule states, with
 * the remainder pushed into the final payment. Payments therefore sum to the
 * amount financed exactly, and on an interest-free plan the total of payments
 * equals the cash price to the cent — which is the whole promise of the
 * product, and has to be true in the arithmetic, not just the marketing.
 */
export function installmentPlan(
  outTheDoorCents: Money,
  downCents: Money,
  termMonths: number,
  aprBps: Bps = ZERO_APR_BPS
): PaymentPlan {
  const amountFinancedCents = Math.max(0, outTheDoorCents - downCents);

  if (aprBps !== 0) {
    // Interest-bearing fallback. Kept so a future state that requires a rate,
    // and the illustrative comparison below, can share this shape.
    const loan = amortize(amountFinancedCents, aprBps, termMonths);
    const finalPaymentCents =
      loan.totalOfPaymentsCents - loan.monthlyPaymentCents * (termMonths - 1);
    return {
      kind: "installments",
      downCents,
      termMonths,
      amountFinancedCents,
      monthlyPaymentCents: loan.monthlyPaymentCents,
      finalPaymentCents,
      totalOfPaymentsCents: loan.totalOfPaymentsCents,
      financeChargeCents: loan.financeChargeCents,
      aprBps,
      requiresTila: requiresTilaDisclosure(termMonths, loan.financeChargeCents),
    };
  }

  const monthlyPaymentCents = Math.floor(amountFinancedCents / termMonths);
  const finalPaymentCents =
    amountFinancedCents - monthlyPaymentCents * (termMonths - 1);

  return {
    kind: "installments",
    downCents,
    termMonths,
    amountFinancedCents,
    monthlyPaymentCents,
    finalPaymentCents,
    totalOfPaymentsCents: amountFinancedCents,
    financeChargeCents: 0,
    aprBps: 0,
    requiresTila: requiresTilaDisclosure(termMonths, 0),
  };
}

/**
 * Quote one car every way a member can buy it.
 *
 * Cash first, then each offered term. Terms beyond UNDERWRITING.maxTermMonths
 * are dropped rather than quoted-and-rejected: showing a payment the member
 * cannot actually be approved for is worse than not showing it.
 */
export function quoteListing(
  listing: RetailListing,
  costs: DealCosts,
  downCents: Money,
  termsMonths: readonly number[] = OFFERED_TERMS_MONTHS,
  aprBps: Bps = ZERO_APR_BPS
): PriceQuote {
  const retailPriceCents = retailPriceFor(listing, costs);

  const salesTaxCents = salesTaxOn(retailPriceCents, costs);
  const outTheDoorCents =
    retailPriceCents + salesTaxCents + costs.docFeeCents + costs.titleRegCents;

  const plans: PaymentPlan[] = [cashPlan(outTheDoorCents)];
  for (const term of termsMonths) {
    if (term > UNDERWRITING.maxTermMonths) continue;
    plans.push(installmentPlan(outTheDoorCents, downCents, term, aprBps));
  }

  return {
    listing,
    retailPriceCents,
    salesTaxCents,
    docFeeCents: costs.docFeeCents,
    titleRegCents: costs.titleRegCents,
    outTheDoorCents,
    downCents,
    minDownCents: minDownFor(outTheDoorCents),
    plans,
  };
}

/**
 * The ability-to-pay gate for an interest-free plan. Same thresholds as the
 * financed path — a zero rate does not make an unaffordable payment
 * affordable, and PTI is the check that keeps this population out of a loan
 * that any shock would end.
 */
export function passesPlanUnderwriting(
  quote: PriceQuote,
  plan: PaymentPlan,
  grossMonthlyIncomeCents: Money
): { ok: boolean; reasons: string[] } {
  if (plan.kind === "cash") return { ok: true, reasons: [] };
  return underwrite(
    {
      monthlyPaymentCents: plan.monthlyPaymentCents,
      downCents: plan.downCents,
      outTheDoorCents: quote.outTheDoorCents,
      mileage: quote.listing.mileage,
      termMonths: plan.termMonths,
    },
    grossMonthlyIncomeCents
  );
}

/**
 * What the same car would cost at a conventional buy-here-pay-here rate.
 *
 * Shown next to the real offer so a member can see what the zero rate is
 * actually worth to them — on a $12,800 car that is thousands of dollars.
 *
 * This is a COMPARISON, not an offer, and the distinction is legal rather than
 * stylistic. Reg Z advertising rules cover terms that are actually available;
 * a rate we do not offer must never be presented as one. Whatever renders this
 * has to label it as illustrative, state the assumed rate, and never let it sit
 * where it could be mistaken for the terms on the table.
 *
 * `extraCostCents` is the honest number: the finance charge the member does not
 * pay. It is the difference in total of payments, not a percentage.
 */
export function financingComparison(
  outTheDoorCents: Money,
  downCents: Money,
  termMonths: number,
  comparisonAprBps: Bps = LEGACY_APR_BPS
): { plan: PaymentPlan; extraCostCents: Money; extraPerMonthCents: Money } {
  const ours = installmentPlan(outTheDoorCents, downCents, termMonths, ZERO_APR_BPS);
  const theirs = installmentPlan(
    outTheDoorCents,
    downCents,
    termMonths,
    comparisonAprBps
  );

  return {
    plan: theirs,
    extraCostCents: theirs.totalOfPaymentsCents - ours.totalOfPaymentsCents,
    extraPerMonthCents: theirs.monthlyPaymentCents - ours.monthlyPaymentCents,
  };
}
