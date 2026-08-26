/**
 * Lot scoring and ranking. Pure functions, no I/O.
 *
 * A hard reject is a car we will not put a member in regardless of price;
 * the weighted score only exists for lots that survived the gates.
 */

import type {
  AuctionLot,
  BidCeiling,
  BudgetEnvelope,
  CreditTerms,
  DealCosts,
  Proposal,
  ScoreBreakdown,
  ScoredLot,
} from "./types";
import { UNDERWRITING } from "./types";
import { priceLot, solveBidCeiling } from "./finance";

/**
 * Score weights, sum to 1.0. The ordering is deliberate:
 *  - mmrHeadroom (0.30): room under the ceiling is margin of safety at the
 *    block — the single best predictor of a deal that closes.
 *  - durability  (0.25): a car that breaks in month four stops being paid for.
 *  - condition   (0.20): auction grade, discounted for yellow/red lights.
 *  - reconBurden (0.15): recon above budget eats the dealer's gross directly.
 *  - proximity   (0.10): transport is already costed; distance mostly adds
 *    delay and arbitration friction, so it carries the least weight.
 */
const WEIGHTS: ScoreBreakdown = {
  mmrHeadroom: 0.3,
  durability: 0.25,
  condition: 0.2,
  reconBurden: 0.15,
  proximity: 0.1,
};

/** Announcements that mean the car is a hard no, whatever the price. */
const KILLER_ANNOUNCEMENT = /frame|structural|flood|engine|transmission/i;

/** Distance beyond which hauling a sub-$10k car stops making sense. */
const MAX_PRACTICAL_MILES = 300;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function rejected(lot: AuctionLot, reason: string): ScoredLot {
  return {
    lot,
    score: 0,
    breakdown: {
      mmrHeadroom: 0,
      durability: 0,
      condition: 0,
      reconBurden: 0,
      proximity: 0,
    },
    rejected: true,
    rejectReason: reason,
  };
}

/**
 * Score one lot against a member's bid ceiling. Hard rejects first (branded
 * title, over-mileage, over-ceiling, killer announcement), then a weighted
 * 0..1 composite of the five breakdown components.
 */
export function scoreLot(
  lot: AuctionLot,
  ceiling: BidCeiling,
  costs: DealCosts
): ScoredLot {
  // --- hard gates -----------------------------------------------------
  if (lot.titleStatus !== "clean") {
    return rejected(lot, `Title is ${lot.titleStatus}, not clean`);
  }
  if (lot.mileage > UNDERWRITING.maxMileage) {
    return rejected(
      lot,
      `Mileage ${lot.mileage.toLocaleString("en-US")} exceeds the ${UNDERWRITING.maxMileage.toLocaleString(
        "en-US"
      )} cap`
    );
  }
  if (lot.mmrCents > ceiling.maxAuctionBidCents) {
    return rejected(lot, "MMR is above the member's maximum auction bid");
  }
  const killer = lot.announcements.find((a) => KILLER_ANNOUNCEMENT.test(a));
  if (killer !== undefined) {
    return rejected(lot, `Disqualifying announcement: ${killer}`);
  }

  // --- weighted components, each normalized to 0..1 -------------------

  // Headroom as a share of the ceiling itself: a lot at MMR = ceiling scores
  // 0 (no room to be outbid), a free car would score 1.
  const mmrHeadroom =
    ceiling.maxAuctionBidCents > 0
      ? clamp01(
          (ceiling.maxAuctionBidCents - lot.mmrCents) /
            ceiling.maxAuctionBidCents
        )
      : 0;

  const durability = clamp01(lot.durability);

  // Grade on a 0–5 scale, discounted by the light: yellow = announced issues,
  // red = as-is with no arbitration — the grade can't be taken at face value.
  const lightPenalty =
    lot.conditionLight === "green" ? 1 : lot.conditionLight === "yellow" ? 0.75 : 0.4;
  const condition = clamp01((lot.conditionGrade / 5) * lightPenalty);

  // Recon vs the budgeted allowance: on-budget scores 0.5, half-budget 0.75,
  // double-budget 0. Linear in the ratio so overruns hurt as much as savings help.
  const reconRatio =
    costs.reconEstimateCents > 0
      ? lot.estimatedReconCents / costs.reconEstimateCents
      : 1;
  const reconBurden = clamp01(1 - reconRatio / 2);

  // Linear falloff to zero at ~300 miles, the practical hauling limit.
  const proximity = clamp01(1 - lot.distanceMiles / MAX_PRACTICAL_MILES);

  const breakdown: ScoreBreakdown = {
    mmrHeadroom,
    durability,
    condition,
    reconBurden,
    proximity,
  };

  const score =
    mmrHeadroom * WEIGHTS.mmrHeadroom +
    durability * WEIGHTS.durability +
    condition * WEIGHTS.condition +
    reconBurden * WEIGHTS.reconBurden +
    proximity * WEIGHTS.proximity;

  return { lot, score, breakdown, rejected: false };
}

/** Score every lot, drop rejects, best first. */
export function rankLots(
  lots: AuctionLot[],
  ceiling: BidCeiling,
  costs: DealCosts
): ScoredLot[] {
  return lots
    .map((lot) => scoreLot(lot, ceiling, costs))
    .filter((s) => !s.rejected)
    .sort((a, b) => b.score - a.score);
}

/**
 * The member's drop: rank the live inventory against their ceiling and price
 * the top `count` survivors into real financed offers.
 */
export function buildDrop(
  lots: AuctionLot[],
  envelope: BudgetEnvelope,
  terms: CreditTerms,
  costs: DealCosts,
  count: number = 4
): Proposal[] {
  const ceiling = solveBidCeiling(envelope, terms, costs);
  return rankLots(lots, ceiling, costs)
    .slice(0, count)
    .map((s) => priceLot(s.lot, envelope, terms, costs, s.score));
}
