"use client";

import { useEffect, useMemo, useState } from "react";
import { groupSlotsByDay, type VisitSlot } from "@/lib/visits";
import { useI18n } from "@/i18n/client";

/**
 * "When do you want to come and see it?" — a sheet that opens off the
 * WhatsApp button on a car page.
 *
 * A calendar of the next two weeks with the open days tappable, then the hours
 * of the chosen day as chips, then one button that sends the plan AND the
 * chosen time into the WhatsApp message. Nothing is booked here: the agent
 * confirms on WhatsApp, which is what the member expects from a button that
 * says "talk to an agent". The slots themselves come from the same endpoint
 * the old scheduler used, so they respect opening hours, the 24-hour lead and
 * the times already taken.
 *
 * Times are the DEALER's wall clock, labelled with the zone. A member browsing
 * from another state must not turn up an hour late because the page quietly
 * localised the appointment to their own clock.
 */
export interface PickedVisit {
  /** Instant, ISO. */
  startsAt: string;
  /** "jueves, 24 de septiembre, 10:00 AM EDT" — in the page's language. */
  label: string;
}

export function VisitPicker({
  listingId,
  open,
  onClose,
  renderSend,
}: {
  listingId: string;
  open: boolean;
  onClose: () => void;
  /** The send control, given the chosen visit (or null for "no appointment"). */
  renderSend: (visit: PickedVisit | null) => React.ReactNode;
}) {
  const { dict, locale } = useI18n();
  const [slots, setSlots] = useState<VisitSlot[] | null>(null);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<VisitSlot | null>(null);

  // Load once the sheet is first opened, not on page load: most visitors
  // never tap the button, and the request is only useful once they have.
  useEffect(() => {
    if (!open || slots !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/visits?listingId=${encodeURIComponent(listingId)}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { slots: VisitSlot[]; timeZone: string };
        if (cancelled) return;
        setSlots(data.slots);
        setTimeZone(data.timeZone);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSlots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slots, listingId]);

  // Escape closes; the page underneath does not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const days = useMemo(() => groupSlotsByDay(slots ?? []), [slots]);
  const byDay = useMemo(() => new Map(days.map((d) => [d.dateKey, d.slots])), [days]);
  const grid = useMemo(() => calendarCells(days.map((d) => d.dateKey)), [days]);

  const lang = locale === "es" ? "es-US" : "en-US";
  const zoneLabel =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat(lang, { timeZone, weekday: "long", month: "long", day: "numeric" }).format(new Date(iso));
  const picked: PickedVisit | null = slot
    ? { startsAt: slot.startsAt, label: `${dayLabel(slot.startsAt)}, ${slot.localLabel} ${zoneLabel}` }
    : null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full overflow-y-auto border-t border-rule-strong bg-paper sm:max-w-lg sm:border"
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule-strong px-4 py-3 sm:px-6">
          <div>
            <h2 id="visit-picker-title" className="font-display text-lg font-extrabold tracking-tight">
              {dict.visit.sheetTitle}
            </h2>
            <p className="mt-0.5 font-serif text-[0.875rem] leading-snug text-ink-muted">
              {dict.visit.sheetLede} {dict.visit.timesIn(zoneLabel)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.gallery.close}
            className="shrink-0 border border-rule-strong px-2.5 py-1 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted hover:border-accent hover:text-accent"
          >
            ✕
          </button>
        </header>

        <div className="px-4 py-4 sm:px-6">
          {slots === null && (
            <p className="font-serif text-[0.875rem] text-ink-muted">{dict.visit.loading}</p>
          )}

          {slots !== null && days.length === 0 && (
            <p className="border-l-2 border-rule-strong bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
              {failed ? dict.visit.couldNotLoad : dict.visit.none}
            </p>
          )}

          {days.length > 0 && (
            <>
              {/* ------------------------------------------------ calendar */}
              <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                {dict.visit.pickDay} · {grid.monthLabel(lang)}
              </p>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                {grid.weekdayLabels(lang).map((w) => (
                  <span key={w} className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-ink-faint">
                    {w}
                  </span>
                ))}
                {grid.cells.map((cell) => {
                  const openDay = byDay.has(cell.key);
                  const isPicked = day === cell.key;
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      disabled={!openDay}
                      aria-pressed={isPicked}
                      onClick={() => {
                        setDay(cell.key);
                        setSlot(null);
                      }}
                      className={`tnum flex aspect-square flex-col items-center justify-center border font-mono text-[0.9375rem] ${
                        isPicked
                          ? "border-accent bg-accent text-accent-ink"
                          : openDay
                            ? "border-rule-strong bg-paper-raised text-ink hover:border-accent hover:text-accent"
                            : "border-transparent text-ink-faint/50"
                      }`}
                    >
                      {cell.day}
                      {cell.day === 1 && (
                        <span className="text-[0.5625rem] uppercase leading-none">{cell.monthShort(lang)}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* --------------------------------------------------- hours */}
              {day && (
                <>
                  <p className="mt-5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                    {dict.visit.pickTime} · {dayLabel(byDay.get(day)![0].startsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {byDay.get(day)!.map((s) => {
                      const isPicked = slot?.startsAt === s.startsAt;
                      return (
                        <button
                          key={s.startsAt}
                          type="button"
                          aria-pressed={isPicked}
                          onClick={() => setSlot(s)}
                          className={`tnum border px-3 py-2 font-mono text-[0.875rem] ${
                            isPicked
                              ? "border-accent bg-accent text-accent-ink"
                              : "border-rule-strong bg-paper-raised text-ink hover:border-accent hover:text-accent"
                          }`}
                        >
                          {s.localLabel}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* ---------------------------------------------------------- send */}
          <div className="mt-6 space-y-2 border-t border-rule pt-4">
            {picked && (
              <p className="font-serif text-[0.875rem] leading-snug text-ink-muted">
                {dict.visit.chosen} <span className="tnum font-mono text-ink">{picked.label}</span>
              </p>
            )}
            {picked ? (
              renderSend(picked)
            ) : (
              <button
                type="button"
                disabled
                className="flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white opacity-40"
              >
                {dict.visit.sendWith}
              </button>
            )}
            <div className="text-center">
              <span className="inline-block font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted underline underline-offset-4 hover:text-accent [&>a]:inline-flex [&>a]:items-center [&>a]:gap-1.5">
                {renderSend(null)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The cells of a calendar that covers every open day: from the Sunday on or
 * before the first to the Saturday on or after the last. Keys are the dealer's
 * local `YYYY-MM-DD`, so no zone arithmetic happens here — the server already
 * did it when it labelled each slot with its local day.
 */
function calendarCells(dateKeys: string[]) {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const keyOf = (t: number) => new Date(t).toISOString().slice(0, 10);
  const DAY = 86_400_000;

  if (dateKeys.length === 0) {
    return { cells: [] as Cell[], monthLabel: () => "", weekdayLabels: () => [] as string[] };
  }
  const first = parse(dateKeys[0]);
  const last = parse(dateKeys[dateKeys.length - 1]);
  const start = first - new Date(first).getUTCDay() * DAY;
  const end = last + (6 - new Date(last).getUTCDay()) * DAY;

  const cells: Cell[] = [];
  for (let t = start; t <= end; t += DAY) {
    const at = new Date(t);
    cells.push({
      key: keyOf(t),
      day: at.getUTCDate(),
      monthShort: (lang: string) =>
        new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" }).format(at),
    });
  }

  const monthLabel = (lang: string) => {
    const month = new Intl.DateTimeFormat(lang, { month: "long", timeZone: "UTC" });
    const year = new Intl.DateTimeFormat(lang, { year: "numeric", timeZone: "UTC" });
    const a = month.format(new Date(first));
    const b = month.format(new Date(last));
    const ya = year.format(new Date(first));
    const yb = year.format(new Date(last));
    if (a === b && ya === yb) return `${a} ${ya}`;
    if (ya === yb) return `${a} – ${b} ${ya}`;
    return `${a} ${ya} – ${b} ${yb}`;
  };
  const weekdayLabels = (lang: string) =>
    Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(lang, { weekday: "narrow", timeZone: "UTC" }).format(
        new Date(Date.UTC(2023, 0, 1 + i)) // 2023-01-01 was a Sunday
      )
    );

  return { cells, monthLabel, weekdayLabels };
}

interface Cell {
  key: string;
  day: number;
  monthShort: (lang: string) => string;
}
