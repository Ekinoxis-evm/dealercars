import type { Dictionary } from "@/i18n";

/**
 * The wholesale auctions we buy through, as a row of logos.
 *
 * A statement about supply, not a product: a member never bids, and there is
 * nothing here to sign up for. It is on the front page because "we buy at the
 * same auctions the big dealers do" is the sentence that explains the prices.
 *
 * Auction marks are used with the permission the operator holds. Keep that
 * permission on file for EACH house — a licence to BID at Copart, ADESA or
 * Manheim is not a licence to use their trademark, and the two are granted
 * separately by different parties. If a permission lapses, drop that logo and
 * leave the plain name, which is a factual statement and needs nobody's
 * consent.
 */
const HOUSES = [
  { name: "Copart", href: "https://www.copart.com", logo: "/brand/copart.svg", width: 140, height: 53 },
  { name: "ADESA", href: "https://www.adesa.com", logo: "/brand/adesa.png", width: 467, height: 211 },
  // A square mark next to two wide wordmarks reads small at the same height,
  // so it gets a little more.
  { name: "Manheim", href: "https://www.manheim.com", logo: "/brand/manheim.svg", width: 167, height: 167, tall: true },
] as const;

export function AuctionHouses({ dict }: { dict: Dictionary }) {
  return (
    <section className="border-b border-rule-strong bg-paper-sunken">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-accent">
          {dict.auction.licensedToBid}
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
          {dict.home.auctionsTitle}
        </h2>
        <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
          {dict.home.auctionsLede}
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {HOUSES.map((h) => (
            <li key={h.name}>
              <a
                href={h.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-28 items-center justify-center border border-rule-strong bg-white px-6 hover:border-accent"
                aria-label={`${h.name} — ${dict.home.auctionsOpen}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={h.logo}
                  alt={h.name}
                  width={h.width}
                  height={h.height}
                  loading="lazy"
                  className={`w-auto max-w-[70%] object-contain ${"tall" in h && h.tall ? "max-h-16" : "max-h-12"}`}
                />
              </a>
              <p className="mt-2 text-center font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                {h.name} · {dict.home.auctionsOpen} ↗
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
