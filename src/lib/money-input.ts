import type { Money } from "./types";

/**
 * Parse a typed dollar amount into integer cents.
 *
 * Deliberately string-based. `Math.round(parseFloat("1234.56") * 100)` is the
 * obvious version and it is wrong often enough to matter — binary floating
 * point cannot represent most two-decimal values exactly, so the product can
 * land a cent low before rounding. Splitting on the decimal point and padding
 * the fraction keeps the whole path integer, which is the rule everywhere else
 * in this codebase and should not stop being the rule at the input boundary.
 *
 * Returns null for anything that is not a clean non-negative amount.
 */
export function dollarsToCents(input: string): Money | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned)) return null;

  const [whole, fraction = ""] = cleaned.split(".");
  const dollars = whole === "" ? 0 : Number(whole);
  if (!Number.isSafeInteger(dollars)) return null;

  const cents = Number(fraction.padEnd(2, "0"));
  return dollars * 100 + cents;
}

/** Integer cents → a plain editable string. No currency symbol. */
export function centsToInput(cents: Money | undefined): string {
  if (cents === undefined || cents === null) return "";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
