import type { Metadata } from "next";
import { isOnTheLot, listShopWindow } from "@/lib/listing-store";
import { toCardData } from "@/lib/inventory-card";
import { CarCard } from "@/components/CarCard";
import { InventoryGrid } from "@/components/InventoryGrid";

/**
 * The lot.
 *
 * Same sixty seconds of staleness as the per-car page, and for the same
 * reason: this is a marketing surface, not the enforcement boundary. Whether
 * money may actually be taken on any of these cars is re-decided server-side
 * on every request in the down-payment route, against the row rather than
 * against this page.
 */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Every car on the lot — DealerCars",
  description:
    "Every car we own, with the real out-the-door price: tax, title, registration and doc fee included. Interest-free payment plans on all of them.",
  // No down payment or monthly figure here on purpose. A search result is an
  // advertisement, and a trigger term in one would need the Reg Z disclosure
  // alongside it — which a meta description cannot carry.
};

export default async function CarsPage() {
  const listings = await listShopWindow();

  const onLot = listings.filter(isOnTheLot).map(toCardData);
  const incoming = listings.filter((l) => !isOnTheLot(l)).map(toCardData);

  return (
    <main>
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
            Our inventory
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            Every car we own.
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            One price per car, and it is the price you actually pay: tax,
            title, registration and doc fee already in it. Pay it in full or
            split it over 12, 24 or 36 months with no interest — the payment
            plan costs the same as the cash price, to the cent.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          {onLot.length > 0 ? (
            <InventoryGrid cars={onLot} />
          ) : (
            <p className="mt-8 border border-dashed border-rule-strong bg-paper-raised px-6 py-10 text-center font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              Nothing is on the lot this minute. We buy cars one at a time and
              put them up the day the title clears, so this page is worth
              checking again in a few days.
            </p>
          )}

          {incoming.length > 0 && (
            <section className="mt-16 border-t border-rule-strong pt-8">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                On the way
              </h2>
              <p className="mt-2 max-w-2xl font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                Cars we have found and are buying. We are not the owner yet, so
                none of these can be reserved or paid for — nobody should take
                money for a car nobody holds title to. The prices are what they
                will cost once they are on the lot.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {incoming.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
