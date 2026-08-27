/**
 * Per-state deal cost profiles.
 *
 * The operating state is an open product decision (see CLAUDE.md), and it is
 * not cosmetic: it selects the RISC form, the sales finance licensing regime,
 * the usury cap, and the tax/title math in the solver. `DEFAULT_DEAL_COSTS` in
 * types.ts is Texas-shaped; anything sold outside Texas needs its own profile
 * or the out-the-door number is simply wrong.
 *
 * ⚠️ The figures below are researched starting points, not legal advice, and
 * every one of them needs confirmation against the current state schedule and
 * the partner dealer's actual fee sheet before a contract is generated.
 */

import type { DealCosts } from "./types";
import { DEFAULT_DEAL_COSTS } from "./types";

/**
 * Texas. The repo's original default, unchanged: 6.25% motor vehicle sales
 * tax, no county surtax, $299 doc fee, auction-sourced cost stack.
 */
export const TX_DEAL_COSTS: DealCosts = { ...DEFAULT_DEAL_COSTS };

/**
 * Florida — Orange County (Orlando).
 *
 * Three things differ from Texas in ways that move the number:
 *
 *  1. Tax is 6% state PLUS a county discretionary surtax — 0.5% in Orange
 *     County — and that surtax applies only to the first $5,000 of the price.
 *     Blending it into one rate overstates tax on every car above $5,000.
 *  2. Florida does not cap dealer documentary fees, so they run far above the
 *     Texas $299. $699 is a defensible BHPH number; the partner dealer's real
 *     fee schedule governs.
 *  3. Title plus an initial registration (the one-time new-plate fee is the
 *     large piece) lands near $400 rather than $250.
 *
 * ⚠️ APR: this profile does NOT set a rate. The 22% used throughout the repo is
 * a Texas-shaped assumption. Florida retail installment sales of motor vehicles
 * run under Chapter 520, F.S., which has its own rate structure keyed to model
 * year — confirm the cap for a 2014 vehicle before quoting 22% in Florida.
 */
export const FL_ORANGE_DEAL_COSTS: DealCosts = {
  salesTaxRate: 0.06,
  countySurtaxRate: 0.005,
  countySurtaxCapCents: 5000_00,
  docFeeCents: 699_00,
  titleRegCents: 400_00,
  reconEstimateCents: 900_00,
  /** Local Orlando pickup, not a multi-state haul off an auction block. */
  transportCents: 150_00,
  /**
   * No auction buy fee on a private-party car. This is a pre-purchase
   * inspection and title work instead — and on a street car the PPI is not
   * optional, it is the only condition report that exists.
   */
  buyFeeCents: 150_00,
  targetGrossCents: 2795_00,
};

const BY_STATE: Record<string, DealCosts> = {
  TX: TX_DEAL_COSTS,
  FL: FL_ORANGE_DEAL_COSTS,
};

/**
 * Cost profile for a two-letter state code. Falls back to Texas so the solver
 * always has something to work with — but an unmapped state means the tax,
 * doc fee and title math are wrong, so callers that generate a disclosure
 * should check `hasDealCostsFor` first rather than quietly taking the default.
 */
export function dealCostsFor(state: string | undefined): DealCosts {
  if (!state) return TX_DEAL_COSTS;
  return BY_STATE[state.toUpperCase()] ?? TX_DEAL_COSTS;
}

export function hasDealCostsFor(state: string | undefined): boolean {
  return state !== undefined && state.toUpperCase() in BY_STATE;
}

/** States we can currently price a real out-the-door number in. */
export const SUPPORTED_STATES = Object.keys(BY_STATE);
