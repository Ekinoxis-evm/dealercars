"use client";

import { useCallback, useEffect, useState } from "react";
import type { ListingPhoto } from "@/lib/types";
import { useI18n } from "@/i18n/client";

/**
 * The photographs, on the member's listing page.
 *
 * Tap a thumbnail and it becomes the big picture; tap the big picture and it
 * fills the screen, with the rest of the gallery a swipe or an arrow key away.
 * This used to be a server component with no JavaScript, on the argument that
 * a lightbox costs a hydration bundle on a metered phone. The bundle here is a
 * few hundred bytes of state and no library, which is a price worth paying to
 * let somebody look closely at a dent before they drive an hour to see it.
 *
 * The first photo is server-rendered eager with `fetchPriority="high"`: it is
 * almost always the largest contentful paint on this page. Which photo that
 * is — the cover — is the admin's choice, made in the photo manager.
 */
export function CarGallery({
  photos,
  label,
}: {
  photos: ListingPhoto[];
  label: string;
}) {
  const { dict } = useI18n();
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const count = photos.length;

  const step = useCallback(
    (delta: number) => setCurrent((i) => (i + delta + count) % count),
    [count]
  );

  // Keyboard on the full-screen view: arrows move, Escape closes. Scrolling
  // the page underneath is locked while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, step]);

  if (!count) {
    return (
      <div className="mt-6 flex aspect-[16/7] items-center justify-center border border-dashed border-rule-strong bg-paper-raised">
        <p className="px-6 text-center font-serif text-[0.9375rem] text-ink-muted">
          {dict.card.photosComing}
        </p>
      </div>
    );
  }

  const photo = photos[current];
  const altOf = (p: ListingPhoto, i: number) =>
    p.alt ?? `${label}, ${dict.gallery.photo(i + 1, count)}`;

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={dict.gallery.viewLarger}
        className="group relative block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={altOf(photo, current)}
          width={photo.width}
          height={photo.height}
          fetchPriority={current === 0 ? "high" : undefined}
          className="aspect-[16/9] w-full border border-rule object-cover"
        />
        <span className="tnum pointer-events-none absolute bottom-2 right-2 bg-paper/90 px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink">
          {current + 1} / {count}
        </span>
      </button>

      {count > 1 && (
        <ul
          className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
          aria-label={dict.gallery.more(label)}
        >
          {photos.map((p, i) => (
            <li key={p.id} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-current={i === current ? "true" : undefined}
                aria-label={altOf(p, i)}
                className={`block border ${
                  i === current ? "border-accent" : "border-rule opacity-80 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  width={p.width}
                  height={p.height}
                  loading={i < 4 ? undefined : "lazy"}
                  className="h-20 w-28 object-cover sm:h-24 sm:w-36"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={altOf(photo, current)}
          className="fixed inset-0 z-50 flex flex-col bg-black/95"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="tnum font-mono text-[0.75rem] uppercase tracking-[0.08em]">
              {label} · {current + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={dict.gallery.close}
              className="border border-white/40 px-3 py-1 font-mono text-[0.75rem] uppercase tracking-[0.08em] hover:border-white"
            >
              {dict.gallery.close} ✕
            </button>
          </div>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt={altOf(photo, current)}
              className="max-h-full max-w-full object-contain"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label={dict.gallery.previous}
                  className="absolute left-2 top-1/2 -translate-y-1/2 border border-white/40 bg-black/50 px-3 py-4 font-mono text-lg text-white hover:border-white"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label={dict.gallery.next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 border border-white/40 bg-black/50 px-3 py-4 font-mono text-lg text-white hover:border-white"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
