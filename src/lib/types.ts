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
  /**
   * County discretionary surtax stacked on top of the state rate. Florida
   * charges one; Texas does not. Omit or 0 where the state has none.
   */
  countySurtaxRate?: number;
  /**
   * The surtax applies only to the first N cents of the price. Florida caps
   * the vehicle surtax base at $5,000, which is why a flat blended rate gets
   * the tax wrong on anything above that. 0 or omitted = no cap.
   */
  countySurtaxCapCents?: Money;
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

/**
 * The product's APR. Zero, and a named constant so it cannot drift silently.
 *
 * Declared here rather than beside the payment-plan types below because
 * DEFAULT_TERMS consumes it — a `const` referenced before its declaration is a
 * temporal-dead-zone crash at import, not a type error.
 */
export const ZERO_APR_BPS: Bps = 0;

/**
 * The product's standard terms: interest-free, 36 months.
 *
 * The APR was 22% until 2026-08-26. It is now zero, and that is a product
 * decision rather than a config tweak — the dealer's entire return is the
 * front-end gross on the car, not a finance charge on the member.
 *
 * Keep it at zero everywhere it is rendered. A page that advertises 0% in one
 * component and 22% in another is not just inconsistent, it is misleading
 * credit advertising.
 */
export const DEFAULT_TERMS: CreditTerms = {
  aprBps: ZERO_APR_BPS,
  termMonths: 36,
};

/**
 * The old interest-bearing band, retained only as the reference case the
 * finance tests pin ($10,135 at 22% over 36 months is $387/month) and as the
 * shape to reach for if a state ever requires a rate. Not offered to anyone.
 */
export const LEGACY_APR_BPS: Bps = 2200;

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

// ------------------------------------------------------- available-now retail

/**
 * Where a car came from when it is NOT an auction lot.
 *
 * "street" is a private-party listing (Facebook Marketplace, Craigslist) that
 * the partner dealer acquires and then retails. It matters that this is a
 * two-step: we cannot finance a private-party sale, because the seller is not
 * a licensed creditor and cannot hold the paper. The dealer buys it, titles it,
 * recons it, and sells it — same as an auction car, different sourcing.
 */
export type ListingSource = "street" | "dealer-lot" | "trade-in";

export type ListingStatus =
  /** Seen in the wild; the dealer has not bought it. */
  | "sourced"
  /** Dealer owns it, recon in progress. Cannot be delivered yet. */
  | "acquired"
  /** Titled, reconned, on the lot. A member can take delivery. */
  | "available"
  /** A member has paid a deposit and holds it. */
  | "reserved"
  | "sold";

/**
 * A specific car available now, priced forward from a real asking price rather
 * than backward from an MMR valuation. This is the "there are pretty good
 * deals, pay the down payment and drive it" path — no Thursday auction, no
 * bidding, delivery as soon as the paperwork clears.
 */
export interface RetailListing {
  id: string;
  source: ListingSource;
  status: ListingStatus;
  /** Public listing this came from, for provenance. */
  listingUrl?: string;
  sellerName?: string;

  vin?: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  titleStatus: TitleStatus;
  transmission: "automatic" | "manual";
  exteriorColor: string;
  interiorColor: string;

  /** What the seller is asking. Not what the dealer should pay. */
  askingPriceCents: Money;
  /** What the dealer should actually pay. Below ask on a private-party car. */
  acquisitionTargetCents: Money;
  estimatedReconCents: Money;

  city: string;
  /** Two-letter state. Selects the DealCosts profile — this is not cosmetic. */
  state: string;
  /** The licensed dealer who will be the seller and creditor. */
  dealerId: string;

  ownerCount?: number;
  /** Powertrain warranty the seller is offering, in months. Underwriting signal. */
  sellerWarrantyMonths?: number;
  notes: string[];
  /** See AuctionLot.durability. Same 0..1 scale, same meaning. */
  durability: number;
}

/**
 * The available-now analogue of `Proposal`. No headroom and no score: there is
 * no auction to be outbid at, so the only questions are what it costs out the
 * door and whether the member clears underwriting on it.
 */
export interface RetailOffer {
  listing: RetailListing;
  retailPriceCents: Money;
  salesTaxCents: Money;
  outTheDoorCents: Money;
  downCents: Money;
  /** UNDERWRITING.minDownRatio × out-the-door. The floor, not a suggestion. */
  minDownCents: Money;
  loan: AmortizedLoan;
}

// ---------------------------------------------------------------- membership

export type MembershipStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

// ---------------------------------------------------------------- profile

/**
 * Documentary proof behind a stated figure. Underwriting here is capacity, not
 * FICO — which only works if the capacity numbers are actually verified.
 */
export type VerificationStatus = "unverified" | "pending" | "verified" | "failed";

export type EmploymentType =
  | "w2_fulltime"
  | "w2_parttime"
  | "1099"
  | "cash"
  | "benefits"
  | "self_employed";

/**
 * The member. Keyed by Privy DID for login, stored in Postgres for everything
 * else — Privy owns the session, Supabase owns the record.
 *
 * Nothing here is client-writable. Income and residence drive underwriting, so
 * they are written server-side only, after verification.
 */
export interface MemberProfile {
  id: string;
  /** Privy decentralized identifier, e.g. "did:privy:abc123". The login key. */
  privyDid: string;
  email?: string;
  phone?: string;
  fullName?: string;

  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  /** Drives the DealCosts profile, the RISC form, and the usury cap. */
  state?: string;
  postalCode?: string;

  employmentType?: EmploymentType;
  employerName?: string;
  monthsAtEmployer?: number;
  /** Gross, not net. PTI is computed against gross. */
  grossMonthlyIncomeCents?: Money;
  incomeVerification: VerificationStatus;
  identityVerification: VerificationStatus;
  residenceVerification: VerificationStatus;

  /** The budget the member has stated and we have verified. */
  statedDownCents?: Money;
  statedMonthlyCents?: Money;

  membershipStatus: MembershipStatus;
  /** Stripe customer on the PLATFORM account — this is our subscription revenue. */
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  createdAt: string;
  updatedAt: string;
}

/** True when we can put a real offer in front of this member. */
export function isUnderwritable(p: MemberProfile): boolean {
  return (
    p.incomeVerification === "verified" &&
    p.identityVerification === "verified" &&
    (p.grossMonthlyIncomeCents ?? 0) > 0
  );
}

// ---------------------------------------------------------------- scheduling

export type VisitStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "no_show"
  | "canceled";

/**
 * An appointment at the dealer to see and drive a specific car. This is the
 * step the money hangs off: the deposit holds the car until the visit, and the
 * down payment is only non-refundable once the RISC is signed at the visit.
 */
export interface Visit {
  id: string;
  profileId: string;
  listingId: string;
  dealerId: string;
  /** ISO datetime, UTC. Rendered in the dealer's local zone. */
  scheduledAt: string;
  /** IANA zone of the dealer, e.g. "America/New_York". */
  timeZone: string;
  durationMinutes: number;
  status: VisitStatus;
  /** Deposit that holds the car for this appointment, if one was taken. */
  depositPaymentId?: string;
  memberNote?: string;
  createdAt: string;
}

// ------------------------------------------------------------------ payments

/**
 * Every kind of money this system moves, and — critically — where it lands.
 *
 * `membership` is DealerCars revenue and settles to the PLATFORM account: we
 * are selling software, which we are licensed to do. Everything else is the
 * dealer's money and settles to the DEALER's connected account via a direct
 * charge. Funds never rest in a DealerCars balance; that is the line between
 * being software and being a money transmitter.
 */
export type PaymentKind =
  /** Our subscription. Platform account. */
  | "membership"
  /** Refundable hold that reserves a car until the visit. Dealer account. */
  | "visit_deposit"
  /** Cash down at contract signing. Dealer account. */
  | "down_payment"
  /** A scheduled installment against a signed RISC. Dealer account. */
  | "installment";

export type PaymentStatus =
  | "requires_payment"
  | "processing"
  | "succeeded"
  | "refunded"
  | "failed"
  | "canceled";

export interface PaymentRecord {
  id: string;
  profileId: string;
  kind: PaymentKind;
  amountCents: Money;
  status: PaymentStatus;
  /** Null for membership: that one is ours. Set for every dealer-side payment. */
  connectedAccountId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  listingId?: string;
  visitId?: string;
  dealId?: string;
  /**
   * A deposit or down payment taken BEFORE the RISC is signed is refundable.
   * It becomes the member's cash down only at signature. Tracking this is what
   * keeps an unsigned deal from looking like a completed sale.
   */
  refundableUntilSignature: boolean;
  createdAt: string;
}

// -------------------------------------------------------------- payment plans

/**
 * How the member pays. The product is deliberately interest-free: the dealer's
 * return is the front-end gross on the car, not a finance charge on the member.
 */
export type PlanKind =
  /** Pay the out-the-door price in full. Not credit at all. */
  | "cash"
  /** Cash down, then equal monthly payments at 0% APR. */
  | "installments";

/**
 * Reg Z attaches to a consumer credit sale payable in MORE THAN FOUR
 * installments even when no finance charge is imposed — 12 CFR 1026.2(a)(17)
 * defines a creditor as one who extends credit payable by written agreement in
 * more than four installments OR for which a finance charge is imposed.
 *
 * So "0% interest" does not mean "no TILA". It means the disclosure gets
 * simple and attractive: APR 0.00%, finance charge $0.00, total of payments
 * equal to the cash price. Four payments or fewer with no finance charge falls
 * outside Reg Z entirely, which is why the threshold is a named constant and
 * not a magic 4 buried in a conditional.
 */
export const REG_Z_INSTALLMENT_THRESHOLD = 4;

/** Terms offered on the interest-free plan. */
export const OFFERED_TERMS_MONTHS = [12, 24, 36] as const;

export interface PaymentPlan {
  kind: PlanKind;
  downCents: Money;
  /** 0 for cash. */
  termMonths: number;
  amountFinancedCents: Money;
  monthlyPaymentCents: Money;
  /**
   * The last payment absorbs the cents that do not divide evenly, so the
   * balance closes at exactly zero and the payments sum to the cash price.
   */
  finalPaymentCents: Money;
  totalOfPaymentsCents: Money;
  /** $0.00 on every interest-free plan. If this is ever non-zero, so is the APR. */
  financeChargeCents: Money;
  aprBps: Bps;
  /** Whether this plan is a Reg Z credit sale requiring the TILA box. */
  requiresTila: boolean;
}

/**
 * Everything a member needs to choose how to pay for one specific car: the
 * cash price, and every interest-free plan available at their down payment.
 */
export interface PriceQuote {
  listing: RetailListing;
  retailPriceCents: Money;
  salesTaxCents: Money;
  docFeeCents: Money;
  titleRegCents: Money;
  /** The full out-the-door price. Identical whether they finance it or not. */
  outTheDoorCents: Money;
  downCents: Money;
  minDownCents: Money;
  /** Cash first, then the installment plans, shortest term first. */
  plans: PaymentPlan[];
}
