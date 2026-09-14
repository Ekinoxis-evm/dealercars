import type { ListingPhoto } from "@/lib/types";

/**
 * The photographs, on the member's listing page.
 *
 * A server component with no JavaScript. A lightbox would cost a hydration
 * bundle on the one page this audience is most likely to open on a phone on
 * metered data — the same argument that put every Privy component behind a
 * lazy boundary. Scroll-snap gives a swipeable strip for nothing, and the
 * native `loading="lazy"` handles the rest.
 *
 * The first photo is eager and `fetchPriority="high"`: it is almost always the
 * largest contentful paint on this page, and lazy-loading it would delay the
 * very thing the member came to look at.
 */
export function CarGallery({
  photos,
  label,
}: {
  photos: ListingPhoto[];
  label: string;
}) {
  if (!photos.length) {
    return (
      <div className="mt-6 flex aspect-[16/7] items-center justify-center border border-dashed border-rule-strong bg-paper-raised">
        <p className="px-6 text-center font-serif text-[0.9375rem] text-ink-muted">
          Photographs of this car are being taken.
        </p>
      </div>
    );
  }

  const [lead, ...rest] = photos;

  return (
    <div className="mt-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lead.url}
        alt={lead.alt ?? `${label}, exterior`}
        width={lead.width}
        height={lead.height}
        fetchPriority="high"
        className="aspect-[16/9] w-full border border-rule object-cover"
      />

      {rest.length > 0 && (
        <ul
          className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
          aria-label={`More photographs of the ${label}`}
        >
          {rest.map((photo, index) => (
            <li key={photo.id} className="shrink-0 snap-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.alt ?? `${label}, photograph ${index + 2}`}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                className="h-24 w-36 border border-rule object-cover sm:h-32 sm:w-48"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
