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
 * Everything between what we pay for a car and the member's driveway.
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
  /**
   * Where each public figure comes from, as links a member can follow. Shown
   * beside the price breakdown on the car page: a fee with no source reads as
   * a fee somebody made up. Optional so an unmapped state still type-checks.
   */
  sources?: {
    salesTax: string;
    docFee: string;
    titleReg: string;
  };
}

/**
 * The output of solving a budget backwards: what a member can actually shop
 * for. Not a bid ceiling — there is no auction to bid at. `maxOutTheDoorCents`
 * is the figure the inventory filter runs on, because the out-the-door price
 * is the number a car is compared against, tax and fees included.
 */
export interface Affordability {
  maxAmountFinancedCents: Money;
  maxRetailPriceCents: Money;
  maxOutTheDoorCents: Money;
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

/** Title brand, as reported on the certificate of title. */
export type TitleStatus = "clean" | "branded" | "salvage";

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
 * How we came by a car. Provenance for the lot, not a product line — every one
 * of these ends up in the same place, retailed by us under the same contract.
 *
 * "street" is a private-party listing (Facebook Marketplace, Craigslist) that
 * we acquire and then retail. It matters that this is a two-step: a
 * private-party sale cannot be financed, because the seller is not a licensed
 * creditor and cannot hold the paper. We buy it, title it, recon it, and sell
 * it. "auction" is the same two-step with a wholesale lane as the source; it
 * is a purchasing channel of ours and never something a member participates in.
 */
export type ListingSource = "street" | "dealer-lot" | "trade-in" | "auction";

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
 * A photograph of a car on the lot.
 *
 * `path` is a location inside the storage bucket, never a URL. The bucket is
 * public today; storing an absolute URL would bake that decision into every
 * row and make it expensive to revisit.
 */
export interface ListingPhoto {
  id: string;
  /** Location inside the storage bucket. */
  path: string;
  /** Fully-qualified public URL, built server-side so only one place knows the bucket. */
  url: string;
  /** Accessibility requirement — and on a page carrying Reg Z trigger terms, part of the ad. */
  alt?: string;
  sortOrder: number;
  width?: number;
  height?: number;
  contentType: string;
}

/**
 * One car on the lot. The whole product: a specific vehicle with a specific
 * price, priced forward from what we actually paid for it. Pay the down
 * payment, take delivery as soon as the paperwork clears.
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
  /**
   * Odometer, in miles. Undefined when nobody has recorded it yet — the lot is
   * seeded from the dealer's own site, which states a mileage for few cars.
   * Rendered as "to be confirmed", and it fails underwriting until it is.
   */
  mileage?: number;
  titleStatus: TitleStatus;
  transmission: "automatic" | "manual";
  exteriorColor: string;
  interiorColor: string;

  /** What the seller is asking. Not what the dealer should pay. */
  askingPriceCents: Money;
  /** What the dealer should actually pay. Below ask on a private-party car. */
  acquisitionTargetCents: Money;
  estimatedReconCents: Money;
  /**
   * The retail price, set deliberately rather than derived.
   *
   * Undefined means "derive it" — acquisition target plus buy fee, transport,
   * recon and target gross — which is the right model while sourcing a car
   * nobody owns yet. Once the car is on the lot, the price is a decision
   * somebody makes and answers for, not an output of a formula, so the admin
   * sets it here and `quoteListing()` honours it.
   */
  retailPriceCentsOverride?: Money;

  city: string;
  /** Two-letter state. Selects the DealCosts profile — this is not cosmetic. */
  state: string;
  /** The licensed dealer who will be the seller and creditor. */
  dealerId: string;

  ownerCount?: number;
  /** Powertrain warranty the seller is offering, in months. Underwriting signal. */
  sellerWarrantyMonths?: number;
  /**
   * Underwriting record: what is unverified, what the seller claimed, what a
   * later inspection changed. NOT marketing copy — see `description`.
   */
  notes: string[];
  /** Listing copy for the shop window. Editorial, and shown to the member. */
  description?: string;
  bodyStyle?: string;
  fuelType?: string;
  /** Ordered gallery. First photo is the card image. */
  photos: ListingPhoto[];
  /**
   * Expected repair burden for this model at this mileage band, 0..1 where 1
   * is most durable. This is underwriting, not trivia: a car that breaks in
   * month four is a car that stops being paid for.
   */
  durability: number;
}

/**
 * One car costed against one budget. The only two questions are what it costs
 * out the door and whether the member clears underwriting on it.
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

/**
 * What an appointment is for.
 *
 * A test drive is about one specific car and cannot exist without it. An
 * auction-access appointment is the opposite: the whole point is that the car
 * does not exist yet. The database enforces the pairing in
 * `visit_kind_matches_listing`.
 */
export type VisitKind = "test_drive" | "auction_access";

export type VisitStatus =
  | "requested"
  | "confirmed"
  | "completed"
  | "no_show"
  | "canceled";

/**
 * An appointment at the dealer's office.
 *
 * On a test drive this is the step the money hangs off: the deposit holds the
 * car until the visit, and the down payment is only non-refundable once the
 * RISC is signed there. On an auction-access appointment it is where the
 * member and the broker agree what to bid on, and what to stop at.
 */
export interface Visit {
  id: string;
  profileId: string;
  kind: VisitKind;
  /** The car, on a test drive. Absent on an auction-access appointment. */
  listingId?: string;
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
 * Every kind below is the dealer's money and settles to the DEALER's connected
 * account via a direct charge. Funds never rest in a DealerCars balance, and
 * keeping that true is what makes a second dealer a configuration change
 * rather than a rewrite of the money path.
 *
 * `membership` is historical only. It was the auction-access subscription, the
 * one charge that settled to the platform; the auction product is gone and
 * nothing creates one of these any more. The variant survives because paid
 * rows do, and a type that cannot describe a row in the table is a type that
 * lies about the database.
 */
export type PaymentKind =
  /** HISTORICAL. The retired subscription. Platform account. Never created. */
  | "membership"
  /**
   * Flat fee for the auction brokerage service. Dealer account.
   *
   * NOT credit, and not a condition of it — see `auction-access.ts`. A charge
   * imposed as a condition of extending credit would be a finance charge under
   * 12 CFR 1026.4(a), which this product must never become.
   */
  | "auction_access"
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
  /** Set on every payment we take. Null only on the retired membership rows. */
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
