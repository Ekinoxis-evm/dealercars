"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatMoney } from "@/lib/finance";
import type { ListingStatus, RetailListing } from "@/lib/types";

/**
 * The lot, as the operator sees it.
 *
 * Everything on this screen is admin-only, and not merely because writes are.
 * The acquisition target is what we intend to pay a private seller; it is on
 * this page because the operator needs it, and it must never appear on a member
 * surface.
 */

export const STATUS_LABELS: Record<ListingStatus, string> = {
  sourced: "Sourced",
  acquired: "Acquired",
  available: "Available",
  reserved: "Reserved",
  sold: "Sold",
};

/** Chip colour carries meaning: green = we can take money, amber = we cannot yet. */
const STATUS_TONE: Record<ListingStatus, string> = {
  sourced: "text-ink-faint",
  acquired: "text-light-amber",
  available: "text-light-green",
  reserved: "text-light-amber",
  sold: "text-ink-muted",
};

export function AdminInventory() {
  const { ready, user } = useAuth();
  const authenticated = user !== null;
  const [listings, setListings] = useState<RetailListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const { listings } = await apiFetch<{ listings: RetailListing[] }>(
        "/api/admin/listings"
      );
      setListings(listings);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setForbidden(true);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not load inventory.");
      }
    }
  }, []);

  useEffect(() => {
    if (!ready || !authenticated) return;
    load();
  }, [ready, authenticated, load]);

  // Signed-out visitors never reach this: AdminShell shows the sign-in instead.
  if (!ready || !authenticated) {
    return <p className="font-serif text-ink-muted">Loading&hellip;</p>;
  }

  if (forbidden) {
    return (
      <div className="border-l-2 border-accent bg-paper-raised px-4 py-4 sm:px-6">
        <h2 className="font-display text-base font-bold tracking-tight">
          This account is not an admin.
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          An existing admin can add you from the Admins screen by the email you
          sign in with. Make sure you signed in with that address.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule-strong pb-4">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
          {listings ? `${listings.length} vehicles` : "Loading"}
        </p>
        <Link
          href="/admin/cars/new"
          className="bg-accent px-4 py-2 font-display text-sm font-bold tracking-tight text-accent-ink"
        >
          Add a car
        </Link>
      </div>

      {error && (
        <p className="mt-4 border-l-2 border-accent bg-paper-raised px-4 py-3 font-serif text-[0.9375rem] text-ink-muted">
          {error}
        </p>
      )}

      {listings?.length === 0 && (
        <p className="mt-8 font-serif text-ink-muted">
          Nothing on the lot yet. Add the first car.
        </p>
      )}

      <ul className="mt-4">
        {listings?.map((listing) => (
          <li key={listing.id} className="border-b border-rule">
            <Link
              href={`/admin/cars/${listing.id}`}
              className="flex items-center gap-4 py-3 hover:bg-paper-raised"
            >
              <Thumb listing={listing} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[0.9375rem] font-bold tracking-tight">
                  {listing.year} {listing.make} {listing.model}
                  {listing.trim ? ` ${listing.trim}` : ""}
                </p>
                <p className="tnum truncate font-mono text-[0.75rem] text-ink-faint">
                  {listing.mileage === undefined
                    ? "mileage unknown"
                    : `${listing.mileage.toLocaleString("en-US")} mi`}{" "}
                  &middot;{" "}
                  {listing.city}, {listing.state} &middot; {listing.photos.length}{" "}
                  {listing.photos.length === 1 ? "photo" : "photos"}
                </p>
              </div>

              <div className="hidden text-right sm:block">
                <p className="tnum font-mono text-[0.8125rem]">
                  {listing.retailPriceCentsOverride !== undefined
                    ? formatMoney(listing.retailPriceCentsOverride)
                    : "—"}
                </p>
                <p className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-faint">
                  retail
                </p>
              </div>

              <span
                className={`w-24 shrink-0 text-right font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${STATUS_TONE[listing.status]}`}
              >
                {STATUS_LABELS[listing.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The card image, or a marker that there isn't one.
 *
 * A car with no photograph is flagged rather than padded with a placeholder,
 * because on a used-car lot that is a job that has not been done — a listing
 * without pictures does not sell, and the operator should see it from here.
 */
function Thumb({ listing }: { listing: RetailListing }) {
  const photo = listing.photos[0];
  if (!photo) {
    return (
      <span className="flex h-12 w-16 shrink-0 items-center justify-center border border-dashed border-rule-strong font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-ink-faint">
        No photo
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.url}
      alt={photo.alt ?? ""}
      width={64}
      height={48}
      loading="lazy"
      className="h-12 w-16 shrink-0 border border-rule object-cover"
    />
  );
}
