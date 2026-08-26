/**
 * Drop-week arithmetic. The cadence is fixed: lots drop Monday, members
 * commit by Wednesday evening, the dealer bids Thursday.
 */

const DAY_MS = 86_400_000;

/** The upcoming drop Monday (today, if today is Monday). UTC-based so server render is stable. */
export function nextDropMonday(now: Date = new Date()): Date {
  const day = now.getUTCDay(); // 0 Sun … 6 Sat
  const daysUntilMonday = (8 - day) % 7; // Mon -> 0
  const monday = new Date(now.getTime() + daysUntilMonday * DAY_MS);
  return new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
  );
}

/** The commit deadline for a given drop Monday: the following Wednesday. */
export function commitWednesday(dropMonday: Date): Date {
  return new Date(dropMonday.getTime() + 2 * DAY_MS);
}

export function formatDropDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
