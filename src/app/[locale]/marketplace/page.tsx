import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "@/i18n";
import { isOnTheLot, listShopWindow } from "@/lib/listing-store";
import { toCardData } from "@/lib/inventory-card";
import { CarCard } from "@/components/CarCard";
import { InventoryGrid } from "@/components/InventoryGrid";
import { Steps } from "@/components/Steps";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "es");
  return {
    title: `${t.cars.title} — MGM Auto`,
    description: t.cars.lede,
    // No down payment or monthly figure here on purpose. A search result is
    // an advertisement, and a trigger term in one would need the Reg Z
    // disclosure alongside it — which a meta description cannot carry.
  };
}

export default async function CarsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const listings = await listShopWindow();

  const onLot = listings.filter(isOnTheLot).map(toCardData);
  const incoming = listings.filter((l) => !isOnTheLot(l)).map(toCardData);

  return (
    <main>
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
            {t.cars.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {t.cars.title}
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-relaxed text-ink-muted">
            {t.cars.lede}
          </p>
        </div>
      </section>

      <Steps id="how" title={t.cars.howTitle} steps={t.cars.steps} tone="sunken" />

      <section>
        <div className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
          {onLot.length > 0 ? (
            <InventoryGrid cars={onLot} locale={locale} />
          ) : (
            <p className="mt-8 border border-dashed border-rule-strong bg-paper-raised px-6 py-10 text-center font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              {t.cars.empty}
            </p>
          )}

          {incoming.length > 0 && (
            <section className="mt-16 border-t border-rule-strong pt-8">
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                {t.cars.onTheWay}
              </h2>
              <p className="mt-2 max-w-2xl font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
                {t.cars.onTheWayLede}
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {incoming.map((car) => (
                  <CarCard key={car.id} car={car} locale={locale} />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
