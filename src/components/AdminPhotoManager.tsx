"use client";

import { useRef, useState } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/api-client";
import type { ListingPhoto } from "@/lib/types";

/**
 * The gallery editor.
 *
 * Reordering is done with explicit move buttons rather than drag-and-drop. Drag
 * needs a pointer, a mouse-sized target and a steady hand; this gets used on a
 * phone, standing on a lot, next to the car being photographed. The buttons are
 * also the only version that works with a keyboard or a screen reader without
 * building a parallel interaction from scratch.
 *
 * Order is saved as the whole arrangement, not as a move instruction — the
 * server rewrites every `sort_order`, so a retry cannot half-apply.
 */
export function AdminPhotoManager({
  listingId,
  photos,
  onChange,
}: {
  listingId: string;
  photos: ListingPhoto[];
  onChange: (photos: ListingPhoto[]) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("photos", file);
      await apiUpload(`/api/admin/listings/${listingId}/photos`, form);
      await refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  /**
   * Re-read from the server rather than merging the upload response locally.
   * The server owns `sort_order` and the public URL; trusting it here means the
   * screen cannot drift from what a member would see.
   */
  async function refresh() {
    const { listing } = await apiFetch<{ listing: { photos: ListingPhoto[] } }>(
      `/api/admin/listings/${listingId}`
    );
    onChange(listing.photos);
  }

  async function persistOrder(next: ListingPhoto[]) {
    onChange(next); // Optimistic: the arrangement is already on screen.
    try {
      await apiFetch(`/api/admin/listings/${listingId}/photos`, {
        method: "PATCH",
        body: JSON.stringify({
          photos: next.map((p, i) => ({ id: p.id, sortOrder: i, alt: p.alt ?? null })),
        }),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save the order.");
      await refresh(); // Put the screen back to the truth.
    }
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    persistOrder(next);
  }

  async function remove(photo: ListingPhoto) {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/listings/${listingId}/photos/${photo.id}`, {
        method: "DELETE",
      });
      onChange(photos.filter((p) => p.id !== photo.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete it.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAlt(photo: ListingPhoto, alt: string) {
    const trimmed = alt.trim();
    if ((photo.alt ?? "") === trimmed) return;
    onChange(
      photos.map((p) => (p.id === photo.id ? { ...p, alt: trimmed || undefined } : p))
    );
    try {
      await apiFetch(`/api/admin/listings/${listingId}/photos`, {
        method: "PATCH",
        body: JSON.stringify({ photos: [{ id: photo.id, alt: trimmed || null }] }),
      });
    } catch {
      setError("Could not save that caption.");
    }
  }

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Photographs
        </h2>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
          {photos.length} &middot; first is the card image
        </p>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={busy}
          onChange={(e) => upload(e.target.files)}
          className="block w-full font-mono text-[0.8125rem] text-ink-muted file:mr-3 file:border file:border-rule-strong file:bg-paper file:px-3 file:py-1.5 file:font-display file:text-[0.8125rem] file:font-bold file:text-ink"
        />
        <p className="mt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
          JPEG, PNG, WebP or AVIF, up to 10&nbsp;MB each. Shoot the car from all
          four corners, the interior, the odometer and anything wrong with it —
          a dent the member finds at delivery costs more than the one they saw.
        </p>

        {error && (
          <p className="mt-3 border-l-2 border-accent px-3 py-2 font-serif text-[0.875rem] text-ink-muted">
            {error}
          </p>
        )}

        {photos.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {photos.map((photo, index) => (
              <li key={photo.id} className="border border-rule bg-paper">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.alt ?? ""}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-0 top-0 bg-accent px-2 py-0.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.08em] text-accent-ink">
                      Card image
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 border-t border-rule px-2 py-1.5">
                  <MoveButton
                    label="Move earlier"
                    glyph="←"
                    disabled={busy || index === 0}
                    onClick={() => move(index, -1)}
                  />
                  <MoveButton
                    label="Move later"
                    glyph="→"
                    disabled={busy || index === photos.length - 1}
                    onClick={() => move(index, 1)}
                  />
                  <span className="tnum ml-1 font-mono text-[0.6875rem] text-ink-faint">
                    {index + 1}/{photos.length}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(photo)}
                    className="ml-auto font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-accent disabled:opacity-40"
                  >
                    Delete
                  </button>
                </div>

                <label className="block border-t border-rule px-2 py-1.5">
                  <span className="sr-only">Caption for photograph {index + 1}</span>
                  <input
                    type="text"
                    defaultValue={photo.alt ?? ""}
                    placeholder="Describe it — read aloud to blind buyers"
                    onBlur={(e) => saveAlt(photo, e.target.value)}
                    className="w-full bg-transparent font-serif text-[0.8125rem] text-ink placeholder:text-ink-faint focus:outline-none"
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MoveButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="border border-rule-strong px-2 py-0.5 font-mono text-[0.75rem] text-ink disabled:opacity-30"
    >
      {glyph}
    </button>
  );
}
