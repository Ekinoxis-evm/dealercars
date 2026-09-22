/**
 * Visit scheduling. Pure functions, no I/O.
 *
 * Slots are generated in the DEALER's local time, not the server's and not the
 * member's. A member in another timezone browsing at 11pm must still see the
 * dealer's Tuesday 10:00 as Tuesday 10:00 at the lot.
 */

/** Dealer opening hours, local wall clock, 24h. Closed on absent days. */
export interface OpeningHours {
  /** 0 = Sunday … 6 = Saturday. */
  [weekday: number]: { open: number; close: number } | undefined;
}

export const DEFAULT_HOURS: OpeningHours = {
  1: { open: 9, close: 18 },
  2: { open: 9, close: 18 },
  3: { open: 9, close: 18 },
  4: { open: 9, close: 18 },
  5: { open: 9, close: 18 },
  6: { open: 10, close: 16 },
  // Sunday closed — most US dealers are, and several states require it.
};

export const SLOT_MINUTES = 45;

/**
 * How far ahead of a slot it can still be booked. A test drive needs the car
 * pulled, cleaned, and plated; an hour's notice is not a real appointment.
 */
export const MIN_LEAD_HOURS = 24;

export interface VisitSlot {
  /** Instant in UTC, ISO. What gets stored. */
  startsAt: string;
  /** The dealer's local wall clock for that instant, for rendering. */
  localLabel: string;
  localDateKey: string;
}

/*
 * A note on the shape of every Intl call in this file: the property is always
 * written out as `timeZone: zone`, never as the `{ timeZone }` shorthand. The
 * production minifier inlines these small helpers into their callers and, with
 * the shorthand, left `timeZone` referring to a parameter that no longer
 * existed — "ReferenceError: timeZone is not defined", a 500 on every
 * appointment request, and nothing wrong in the source. Keep it explicit.
 */

/**
 * Milliseconds a zone is ahead of UTC at a given instant.
 * Formats the instant in the zone, reads the wall clock back, and diffs.
 */
function zoneOffsetMs(at: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return asUtc - at.getTime();
}

/**
 * A wall-clock time in a zone → the UTC instant.
 *
 * Two passes: the offset depends on the instant, and the instant depends on
 * the offset. Guessing with UTC then correcting with the offset at the guessed
 * instant resolves every case except the hour that does not exist on a
 * spring-forward morning, which lands on the following hour rather than
 * throwing — acceptable for a 9-to-6 appointment book.
 */
export function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const firstPass = guess - zoneOffsetMs(new Date(guess), timeZone);
  const refined = guess - zoneOffsetMs(new Date(firstPass), timeZone);
  return new Date(refined);
}

/** The dealer-local calendar date parts for an instant. */
function localParts(at: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function weekdayIn(at: Date, zone: string): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
  }).format(at);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/**
 * Bookable slots for the next `days` days at one dealer.
 *
 * `taken` is the set of already-booked start instants (ISO), which the caller
 * loads from the visits table. Filtering here keeps the UI honest, but it is
 * NOT the concurrency guarantee — two members can render the same free slot at
 * the same moment. The unique index `visits_one_live_hold_per_listing` is what
 * actually prevents the double booking.
 */
export function availableSlots(params: {
  timeZone: string;
  now?: Date;
  days?: number;
  hours?: OpeningHours;
  taken?: Set<string>;
}): VisitSlot[] {
  const {
    timeZone,
    now = new Date(),
    days = 14,
    hours = DEFAULT_HOURS,
    taken = new Set<string>(),
  } = params;

  const earliest = now.getTime() + MIN_LEAD_HOURS * 3_600_000;
  const slots: VisitSlot[] = [];

  for (let dayOffset = 0; dayOffset <= days; dayOffset++) {
    const probe = new Date(now.getTime() + dayOffset * 86_400_000);
    const weekday = weekdayIn(probe, timeZone);
    const window = hours[weekday];
    if (!window) continue;

    const { year, month, day, dateKey } = localParts(probe, timeZone);

    for (let h = window.open; h < window.close; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        if (m + SLOT_MINUTES > 60) continue;
        const startsAt = zonedWallClockToUtc(year, month, day, h, m, timeZone);
        if (startsAt.getTime() < earliest) continue;

        const iso = startsAt.toISOString();
        if (taken.has(iso)) continue;

        slots.push({
          startsAt: iso,
          localDateKey: dateKey,
          localLabel: new Intl.DateTimeFormat("en-US", {
            timeZone: timeZone,
            hour: "numeric",
            minute: "2-digit",
          }).format(startsAt),
        });
      }
    }
  }

  return slots;
}

/** "Thursday, August 27" in the dealer's zone. */
export function formatSlotDate(iso: string, zone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

/** Group slots by dealer-local day, preserving order. */
export function groupSlotsByDay(slots: VisitSlot[]): Array<{
  dateKey: string;
  slots: VisitSlot[];
}> {
  const days: Array<{ dateKey: string; slots: VisitSlot[] }> = [];
  for (const slot of slots) {
    const last = days[days.length - 1];
    if (last && last.dateKey === slot.localDateKey) last.slots.push(slot);
    else days.push({ dateKey: slot.localDateKey, slots: [slot] });
  }
  return days;
}
