import type { Money } from "./types";
import { formatMoney } from "./finance";

/**
 * The "contact us" link, and what it says.
 *
 * A member who has just built a payment should not have to retype it. The
 * button carries the quote into WhatsApp — the car, the down payment, the
 * monthly, the term — so the conversation opens with the thing they were
 * looking at rather than "hi, I'm interested in a car".
 *
 * Two rules about the figures in that message.
 *
 * They are FORMATTED, not recomputed. Everything here arrives already priced
 * by the server; this file does no arithmetic, so a message can never quote a
 * number the page did not show.
 *
 * And they never travel alone. The message states the rate beside the payment
 * and carries the car's URL, which is the page holding the full Reg Z
 * disclosure. A down payment and a monthly payment quoted with no rate and no
 * route back to the terms is the shape of a misleading credit advertisement,
 * even when the person sending it is the customer.
 */

export interface QuotedPlan {
  /** Absolute URL of the car, or of the page the quote was built on. */
  url: string;
  /** "2014 Mazda3", or undefined when no specific car is in play. */
  vehicle?: string;
  downCents: Money;
  monthlyPaymentCents: Money;
  termMonths: number;
  outTheDoorCents: Money;
  /** "jueves, 24 de septiembre, 10:00 AM EDT" — the visit the member asked for, if any. */
  visit?: string;
}

/** A budget with no specific car attached — from the affordability worksheet. */
export interface QuotedBudget {
  url: string;
  downCents: Money;
  monthlyCents: Money;
  maxOutTheDoorCents: Money;
}

export type ContactPayload =
  | { kind: "plan"; plan: QuotedPlan }
  | { kind: "budget"; budget: QuotedBudget }
  | { kind: "general"; url: string };

/** Copy for the message body, supplied by the active dictionary. */
export interface ContactStrings {
  greeting: string;
  interestedIn: string;
  myPlan: string;
  down: string;
  monthly: string;
  term: string;
  outTheDoor: string;
  months: string;
  zeroApr: string;
  lookingWithBudget: string;
  maxMonthly: string;
  reaches: string;
  general: string;
  visit: string;
}

/**
 * Build the message body.
 *
 * Plain text with newlines — WhatsApp has no rich formatting in a deep link,
 * and anything cleverer arrives as literal asterisks on somebody's phone.
 */
export function contactMessage(
  payload: ContactPayload,
  t: ContactStrings
): string {
  const money = (cents: Money) => formatMoney(cents, { cents: true });

  if (payload.kind === "plan") {
    const p = payload.plan;
    return [
      t.greeting,
      "",
      t.interestedIn,
      p.vehicle ? `${p.vehicle} — ${p.url}` : p.url,
      "",
      t.myPlan,
      `• ${t.down}: ${money(p.downCents)}`,
      `• ${t.monthly}: ${money(p.monthlyPaymentCents)}`,
      `• ${t.term}: ${p.termMonths} ${t.months}`,
      `• ${t.outTheDoor}: ${money(p.outTheDoorCents)} (${t.zeroApr})`,
      ...(p.visit ? ["", `${t.visit}: ${p.visit}`] : []),
    ].join("\n");
  }

  if (payload.kind === "budget") {
    const b = payload.budget;
    return [
      t.greeting,
      "",
      t.lookingWithBudget,
      `• ${t.down}: ${money(b.downCents)}`,
      `• ${t.maxMonthly}: ${money(b.monthlyCents)}`,
      `• ${t.reaches}: ${money(b.maxOutTheDoorCents)} (${t.zeroApr})`,
      "",
      b.url,
    ].join("\n");
  }

  // From the footer there is no particular page to point at; the URL line is
  // simply left out rather than sent empty.
  const lines = [t.greeting, "", t.general];
  if (payload.url) lines.push(payload.url);
  return lines.join("\n");
}

/**
 * The wa.me link.
 *
 * `wa.me` rather than `api.whatsapp.com`: it opens the native app on a phone
 * and WhatsApp Web on a desktop, which is the whole point of a button that has
 * to work for somebody standing on a lot.
 *
 * Returns null without a number, so the caller renders nothing rather than a
 * button that goes somewhere broken.
 */
export function whatsappUrl(
  number: string | undefined,
  message: string
): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
