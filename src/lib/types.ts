/**
 * DealerCars domain contract.
 *
 * RULE: all money is an integer count of cents. Never a float, never a string,
 * never dollars. A rounding error in a retail installment contract is a Reg Z
 * problem, not a display bug.
 */

/** Integer cents. */
export type Money = number;

/** Basis points. 2200 = 22.00% APR. */
export type Bps = number;

// ---------------------------------------------------------------- budget

export interface BudgetEnvelope {
  /** Cash the member can put down today. */
  downCents: Money;
  /** The monthly payment ceiling. A ceiling, not a wish. */
  monthlyCents: Money;
}

export interface CreditTerms {
  aprBps: Bps;
  termMonths: number;
}

/**
 * Everything between the auction hammer and the member's driveway.
 * Defaults live in `DEFAULT_DEAL_COSTS`; per-state values override.
 */
export interface DealCosts {
  /** e.g. 0.0625 for 6.25%. Applied to the retail price. */
  salesTaxRate: number;
  docFeeCents: Money;
  titleRegCents: Money;
  /** Budgeted recon before we know the real number. */
  reconEstimateCents: Money;
  transportCents: Money;
  buyFeeCents: Money;
  /** Front-end gross the dealer requires to take the deal. */
  targetGrossCents: Money;
}

/** The output of solving a budget backwards. */
export interface BidCeiling {
  maxAmountFinancedCents: Money;
  maxRetailPriceCents: Money;
  /** The only number the auction search actually needs. */
  maxAuctionBidCents: Money;
}

// ---------------------------------------------------------------- lending

export interface AmortizedLoan {
  amountFinancedCents: Money;
  monthlyPaymentCents: Money;
  totalOfPaymentsCents: Money;
  financeChargeCents: Money;
  aprBps: Bps;
  termMonths: number;
}

/**
 * The federal Truth-in-Lending box. Once signed this is immutable — snapshot it,
 * never recompute it from live rows.
 */
export interface TilaDisclosure {
  aprBps: Bps;
  financeChargeCents: Money;
  amountFinancedCents: Money;
  totalOfPaymentsCents: Money;
  paymentCents: Money;
  termMonths: number;
}

export interface Installment {
  number: number;
  dueDate: string; // ISO date
  paymentCents: Money;
  principalCents: Money;
  interestCents: Money;
  balanceAfterCents: Money;
}

// ---------------------------------------------------------------- inventory

export type AuctionSource = "manheim" | "openlane" | "acv";
/** Auction light: green = drivable and arbitratable, yellow = announced, red = as-is. */
export type ConditionLight = "green" | "yellow" | "red";
export type TitleStatus = "clean" | "branded" | "salvage";

export interface AuctionLot {
  id: string;
  source: AuctionSource;
  externalId: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  conditionLight: ConditionLight;
  /** Auction condition grade, 0.0–5.0. */
  conditionGrade: number;
  titleStatus: TitleStatus;
  /** Manheim Market Report valuation. */
  mmrCents: Money;
  estimatedReconCents: Money;
  distanceMiles: number;
  locationName: string;
  lane: number;
  run: number;
  saleEndsAt: string; // ISO datetime
  announcements: string[];
  /**
   * Expected repair burden for this model at this mileage band, 0..1 where 1 is
   * most durable. This is underwriting, not trivia: a car that breaks in month
   * four is a car that stops being paid for.
   */
  durability: number;
}

export interface ScoreBreakdown {
  mmrHeadroom: number;
  durability: number;
  condition: number;
  reconBurden: number;
  proximity: number;
}

export interface ScoredLot {
  lot: AuctionLot;
  score: number;
  breakdown: ScoreBreakdown;
  rejected: boolean;
  rejectReason?: string;
}

// ---------------------------------------------------------------- proposal

/** What a member actually receives: not a listing, a financed offer. */
export interface Proposal {
  lot: AuctionLot;
  retailPriceCents: Money;
  outTheDoorCents: Money;
  downCents: Money;
  loan: AmortizedLoan;
  /** maxAuctionBid − mmr. Positive means the lot clears with room. */
  headroomCents: Money;
  score: number;
}

// ---------------------------------------------------------------- defaults

/** Texas-shaped defaults. Per-state config overrides these. */
export const DEFAULT_DEAL_COSTS: DealCosts = {
  salesTaxRate: 0.0625,
  docFeeCents: 29900,
  titleRegCents: 25000,
  reconEstimateCents: 90000,
  transportCents: 35000,
  buyFeeCents: 30000,
  targetGrossCents: 279500,
};

export const DEFAULT_TERMS: CreditTerms = {
  aprBps: 2200,
  termMonths: 36,
};

/** Ability-to-pay guardrails. See spec: underwriting is capacity, not FICO. */
export const UNDERWRITING = {
  /** Payment-to-income hard cap. Above this, any shock ends the loan. */
  maxPtiRatio: 0.2,
  targetPtiRatio: 0.15,
  /** Down payment as share of out-the-door. Strongest default predictor in BHPH. */
  minDownRatio: 0.18,
  maxMileage: 150_000,
  maxTermMonths: 48,
} as const;
