import "server-only";
import { SUPPORTED_STATES } from "./deal-costs";
import type { ListingStatus } from "./types";

/**
 * Validation for admin-written inventory.
 *
 * This is the boundary where a typed-in figure becomes a stored one, so it is
 * the boundary where the integer-cents rule either holds or quietly stops
 * holding. Every money field arrives here as an integer count of cents and is
 * rejected if it is anything else — a float that survives this function ends up
 * in a retail installment contract.
 *
 * It is also where the status interlock gets a readable error. The database
 * enforces `listing_acquired_has_record` regardless, but a check constraint
 * violation surfaces as a Postgres error string; an operator moving a car to
 * "available" deserves to be told they have not recorded the purchase yet.
 */

export const LISTING_STATUSES: ListingStatus[] = [
  "sourced",
  "acquired",
  "available",
  "reserved",
  "sold",
];

const SOURCES = ["street", "dealer-lot", "trade-in", "auction"];
const TITLE_STATUSES = ["clean", "branded", "salvage"];
const TRANSMISSIONS = ["automatic", "manual"];

/** Statuses that assert we own the car. */
const OWNED: ListingStatus[] = ["available", "reserved", "sold"];

export interface ListingInput {
  id?: string;
  dealer_id?: string;
  source?: string;
  status?: ListingStatus;
  listing_url?: string | null;
  seller_name?: string | null;
  vin?: string | null;
  year?: number;
  make?: string;
  model?: string;
  trim?: string | null;
  mileage?: number;
  title_status?: string;
  transmission?: string | null;
  exterior_color?: string | null;
  interior_color?: string | null;
  body_style?: string | null;
  fuel_type?: string | null;
  asking_price_cents?: number;
  acquisition_target_cents?: number;
  estimated_recon_cents?: number;
  retail_price_cents?: number | null;
  acquired_price_cents?: number | null;
  acquired_at?: string | null;
  city?: string;
  state?: string;
  owner_count?: number | null;
  seller_warranty_months?: number | null;
  durability?: number;
  notes?: string[];
  description?: string | null;
}

export type ParseResult =
  | { ok: true; value: ListingInput }
  | { ok: false; errors: string[] };

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Parse a request body into a column map.
 *
 * `mode: "create"` requires the fields a row cannot exist without; `"update"`
 * accepts a partial and validates only what is present, so an admin editing one
 * field is not forced to resend the whole car.
 */
export function parseListingInput(
  body: any,
  mode: "create" | "update"
): ParseResult {
  const errors: string[] = [];
  const out: ListingInput = {};

  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Expected a JSON object."] };
  }

  const has = (k: string) => body[k] !== undefined && body[k] !== null;
  const required = mode === "create";

  // --------------------------------------------------------------- identity
  if (required) {
    const id = str(body.id);
    if (!id) {
      errors.push("id is required.");
    } else if (!/^[a-z0-9_]{3,64}$/.test(id)) {
      errors.push(
        "id must be 3-64 characters of lowercase letters, digits and underscores."
      );
    } else {
      out.id = id;
    }

    const dealerId = str(body.dealer_id);
    if (!dealerId) errors.push("dealer_id is required.");
    else out.dealer_id = dealerId;
  }

  // ------------------------------------------------------------ enumerations
  if (required || has("source")) {
    const source = str(body.source);
    if (!source || !SOURCES.includes(source)) {
      errors.push(`source must be one of: ${SOURCES.join(", ")}.`);
    } else out.source = source;
  }

  if (required || has("status")) {
    const status = str(body.status) as ListingStatus;
    if (!status || !LISTING_STATUSES.includes(status)) {
      errors.push(`status must be one of: ${LISTING_STATUSES.join(", ")}.`);
    } else out.status = status;
  }

  if (required || has("title_status")) {
    const t = str(body.title_status);
    if (!t || !TITLE_STATUSES.includes(t)) {
      errors.push(`title_status must be one of: ${TITLE_STATUSES.join(", ")}.`);
    } else out.title_status = t;
  }

  if (has("transmission")) {
    const t = str(body.transmission);
    if (!t || !TRANSMISSIONS.includes(t)) {
      errors.push(`transmission must be one of: ${TRANSMISSIONS.join(", ")}.`);
    } else out.transmission = t;
  }

  // ---------------------------------------------------------------- vehicle
  if (required || has("year")) {
    const y = int(body.year);
    if (y === null || y < 1980 || y > 2100) {
      errors.push("year must be a whole number between 1980 and 2100.");
    } else out.year = y;
  }

  for (const field of ["make", "model"] as const) {
    if (required || has(field)) {
      const v = str(body[field]);
      if (!v) errors.push(`${field} is required.`);
      else out[field] = v;
    }
  }

  if (required || has("mileage")) {
    const m = int(body.mileage);
    if (m === null || m < 0) {
      errors.push("mileage must be a whole number of miles, zero or more.");
    } else out.mileage = m;
  }

  if (required || has("city")) {
    const v = str(body.city);
    if (!v) errors.push("city is required.");
    else out.city = v;
  }

  if (required || has("state")) {
    const v = str(body.state)?.toUpperCase();
    if (!v || !/^[A-Z]{2}$/.test(v)) {
      errors.push("state must be a two-letter code.");
    } else {
      out.state = v;
      // Not an error. A car in an unmapped state is a legitimate thing to
      // record — we just cannot quote it, and `/cars/[id]` says so rather than
      // inventing a tax figure. Surfaced as a warning by the caller.
    }
  }

  // ------------------------------------------------------------------ money
  //
  // Every one of these is an integer count of cents. A non-integer here is not
  // a formatting quibble: it is a rounding error in a Reg Z disclosure.
  const moneyFields = [
    ["asking_price_cents", true],
    ["acquisition_target_cents", true],
    ["estimated_recon_cents", false],
  ] as const;

  for (const [field, requiredOnCreate] of moneyFields) {
    if ((required && requiredOnCreate) || has(field)) {
      const c = int(body[field]);
      if (c === null || c < 0) {
        errors.push(`${field} must be a whole number of cents, zero or more.`);
      } else out[field] = c;
    }
  }

  if (required && body.estimated_recon_cents === undefined) {
    out.estimated_recon_cents = 0;
  }

  // Nullable money: an explicit null clears the override and restores the
  // derived price, which is a meaningful thing for an admin to want.
  for (const field of ["retail_price_cents", "acquired_price_cents"] as const) {
    if (body[field] === null) {
      out[field] = null;
    } else if (body[field] !== undefined) {
      const c = int(body[field]);
      if (c === null || c < 0) {
        errors.push(`${field} must be a whole number of cents, zero or more.`);
      } else out[field] = c;
    }
  }

  // ----------------------------------------------------------- optional bits
  for (const field of [
    "listing_url",
    "seller_name",
    "vin",
    "trim",
    "exterior_color",
    "interior_color",
    "body_style",
    "fuel_type",
    "description",
  ] as const) {
    if (body[field] === null) out[field] = null;
    else if (body[field] !== undefined) out[field] = str(body[field]) ?? null;
  }

  if (out.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(out.vin)) {
    // Rejected rather than warned: a mistyped VIN is how a title check gets run
    // against the wrong car.
    errors.push(
      "vin must be 17 characters and may not contain I, O or Q. Leave it blank until it is known."
    );
  }

  for (const field of ["owner_count", "seller_warranty_months"] as const) {
    if (body[field] === null) out[field] = null;
    else if (body[field] !== undefined) {
      const n = int(body[field]);
      if (n === null || n < 0) errors.push(`${field} must be zero or more.`);
      else out[field] = n;
    }
  }

  if (required || has("durability")) {
    const d = num(body.durability);
    if (d === null || d < 0 || d > 1) {
      errors.push(
        "durability must be between 0 and 1. It is underwriting, not a rating out of five."
      );
    } else out.durability = d;
  }

  if (body.notes !== undefined) {
    if (!Array.isArray(body.notes) || body.notes.some((n: any) => typeof n !== "string")) {
      errors.push("notes must be an array of strings.");
    } else {
      out.notes = body.notes.map((n: string) => n.trim()).filter(Boolean);
    }
  }

  if (body.acquired_at === null) out.acquired_at = null;
  else if (body.acquired_at !== undefined) {
    const iso = str(body.acquired_at);
    if (!iso || Number.isNaN(Date.parse(iso))) {
      errors.push("acquired_at must be an ISO date.");
    } else out.acquired_at = new Date(iso).toISOString();
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: out };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * The ownership interlock, checked against the row as it will be after the
 * write rather than against the patch alone.
 *
 * A car may not be `available`, `reserved` or `sold` without an acquisition
 * record, because those states say we hold title and the down-payment route
 * will take money against them. `listing_acquired_has_record` enforces this in
 * the database; this exists so the admin gets a sentence instead of a
 * constraint name.
 */
export function ownershipProblem(merged: {
  status?: ListingStatus | null;
  acquired_at?: string | null;
  acquired_price_cents?: number | null;
}): string | null {
  if (!merged.status || !OWNED.includes(merged.status)) return null;
  if (merged.acquired_at && merged.acquired_price_cents !== null && merged.acquired_price_cents !== undefined) {
    return null;
  }
  return `A car cannot be "${merged.status}" without an acquisition record. Set what we paid for it and when, or leave it as "acquired" until we have.`;
}

/** True when we can produce an out-the-door figure for this state. */
export function quotableState(state: string | undefined): boolean {
  return !!state && (SUPPORTED_STATES as readonly string[]).includes(state);
}

// ------------------------------------------------------------------ coercion

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function int(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
    return null;
  }
  return v;
}

function num(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}
