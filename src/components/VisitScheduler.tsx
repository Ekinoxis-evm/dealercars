"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatSlotDate, groupSlotsByDay, type VisitSlot } from "@/lib/visits";

/**
 * Book a time at the dealer's office.
 *
 * Two shapes, one component, because the mechanics are identical and only the
 * copy differs. With a `listingId` it books a test drive of that car; without
 * one it books an auction-access appointment, where the whole point is that
 * there is no car yet. The route and the database both enforce that pairing,
 * so this only has to say which it is.
 *
 * Slot times are rendered in the DEALER's timezone and labelled as such. A
 * member browsing from another state must not turn up an hour late because we
 * quietly localised the appointment to their own clock.
 */
export function VisitScheduler({
  listingId,
  address,
}: {
  listingId?: string;
  /** Shown on an office appointment, where "come here" needs a here. */
  address?: string;
}) {
  const isAuctionAccess = listingId === undefined;
  const { authenticated, login } = usePrivy();

  const [slots, setSlots] = useState<VisitSlot[] | null>(null);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{
          slots: VisitSlot[];
          timeZone: string;
          unavailableReason?: string;
        }>(
          listingId
            ? `/api/visits?listingId=${encodeURIComponent(listingId)}`
            : "/api/visits",
          { authenticated: false }
        );
        if (cancelled) return;
        setSlots(data.slots);
        setTimeZone(data.timeZone);
        setUnavailable(data.unavailableReason ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Could not load times.");
          setSlots([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  async function book() {
    if (!selected) return;
    if (!authenticated) {
      login();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/visits", {
        method: "POST",
        body: JSON.stringify({
          listingId,
          scheduledAt: selected,
          memberNote: note || undefined,
        }),
      });
      setBooked(selected);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not book that time.");
    } finally {
      setSaving(false);
    }
  }

  const zoneLabel =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value ?? timeZone;

  if (booked) {
    return (
      <section
        role="status"
        className="border border-rule-strong bg-paper-raised px-4 py-5 sm:px-6"
      >
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          You&rsquo;re booked in.
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          {formatSlotDate(booked, timeZone)} at{" "}
          <span className="tnum font-mono text-[0.875rem] text-ink">
            {new Intl.DateTimeFormat("en-US", {
              timeZone,
              hour: "numeric",
              minute: "2-digit",
            }).format(new Date(booked))}{" "}
            {zoneLabel}
          </span>
          .{" "}
          {isAuctionAccess
            ? "Bring your driver's licence and a rough idea of what you are after. We will agree a shortlist and a ceiling before anything is bid on."
            : "Bring your driver's licence, proof of income, and proof of address. Nothing is committed until you sign at the lot."}
          {address && (
            <>
              {" "}
              We are at <span className="text-ink">{address}</span>.
            </>
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {isAuctionAccess ? "Book your appointment" : "Come and drive it"}
        </h2>
        <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">
          Times are the office&rsquo;s local clock ({zoneLabel}).
          {address ? ` ${address}.` : ""}
        </p>
      </header>

      <div className="px-4 py-5 sm:px-6">
        {unavailable && (
          <p className="border-l-2 border-rule-strong bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
            {unavailable}
          </p>
        )}

        {slots === null && (
          <p className="font-serif text-[0.875rem] text-ink-muted">
            Loading available times&hellip;
          </p>
        )}

        {slots !== null && slots.length > 0 && (
          <>
            <div className="max-h-80 overflow-y-auto pr-1">
              {groupSlotsByDay(slots).map((day) => (
                <div key={day.dateKey} className="mb-4">
                  <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                    {formatSlotDate(day.slots[0].startsAt, timeZone)}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {day.slots.map((slot) => {
                      const isSelected = selected === slot.startsAt;
                      return (
                        <button
                          key={slot.startsAt}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelected(slot.startsAt)}
                          className={`tnum border px-3 py-1.5 font-mono text-[0.8125rem] ${
                            isSelected
                              ? "border-accent bg-accent text-accent-ink"
                              : "border-rule-strong bg-paper text-ink hover:border-accent hover:text-accent"
                          }`}
                        >
                          {slot.localLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <label
              htmlFor="visit-note"
              className="mt-2 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint"
            >
              Anything the dealer should know (optional)
            </label>
            <textarea
              id="visit-note"
              rows={2}
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full border border-rule-strong bg-paper px-3 py-2 font-serif text-[0.9375rem] text-ink placeholder:text-ink-faint"
              placeholder="I can only come after 4pm on weekdays."
            />

            <button
              type="button"
              onClick={book}
              disabled={!selected || saving}
              className="mt-3 w-full border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Booking…"
                : !authenticated
                  ? "Sign in to book"
                  : selected
                    ? "Book this time"
                    : "Pick a time"}
            </button>
          </>
        )}

        {slots !== null && slots.length === 0 && !unavailable && (
          <p className="font-serif text-[0.875rem] text-ink-muted">
            No appointment times are open in the next two weeks.
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
