"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/finance";
import { carTitle, type CarCardData } from "@/lib/inventory-card";
import { localePath, type Locale } from "@/i18n";
import { useI18n } from "@/i18n/client";

/**
 * One car in the grid.
 *
 * States a price and an APR and nothing else about money. Neither is a
 * Regulation Z trigger term — 12 CFR 1026.24(d)(1) triggers on a down payment
 * amount, a payment amount, a number of payments, a period of repayment, or a
 * finance charge amount, and a rate stated on its own is expressly not one. So
 * this card carries no <RegZDisclosure />, and it stays that way only as long
 * as no monthly figure appears on it. Adding "from $245/mo" here obliges the
 * disclosure on every card in the grid; the per-car page is where payments and
 * their disclosure belong.
 */
export function CarCard({ car, locale }: { car: CarCardData; locale: Locale }) {
  const { dict } = useI18n();
  const title = carTitle(car);
  const sellable = car.status === "available" || car.status === "reserved";

  return (
    <article className="flex flex-col border border-rule-strong bg-paper-raised">
      <Link href={localePath(locale, `/marketplace/${car.id}`)} className="group flex flex-1 flex-col">
        <div className="relative">
          {car.photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={car.photoUrl}
              alt={car.photoAlt ?? title}
              loading="lazy"
              className="aspect-[4/3] w-full border-b border-rule object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full items-center justify-center border-b border-dashed border-rule bg-paper-sunken">
              <p className="px-4 text-center font-serif text-[0.8125rem] text-ink-faint">
                {dict.card.photosComing}
              </p>
            </div>
          )}
          {car.status !== "available" && (
            <span className="absolute left-0 top-0 bg-paper px-2 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-accent">
              {dict.card.status[car.status]}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-4 py-3">
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight group-hover:text-accent">
            {title}
          </h3>
          <p className="mt-0.5 font-serif text-[0.875rem] leading-snug text-ink-muted">
            {[car.trim, car.bodyStyle].filter(Boolean).join(" · ") || " "}
          </p>

          <dl className="tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.75rem] text-ink-muted">
            <div className="flex gap-1">
              <dt className="sr-only">Mileage</dt>
              <dd>
                {car.mileage === undefined
                  ? dict.card.mileageUnknown
                  : `${car.mileage.toLocaleString("en-US")} mi`}
              </dd>
            </div>
            <div className="flex gap-1">
              <dt className="sr-only">Location</dt>
              <dd>
                {car.city}, {car.state}
              </dd>
            </div>
            <div className="flex gap-1">
              <dt className="sr-only">Durability score</dt>
              <dd>
                {Math.round(car.durability * 100)}/100 {dict.card.durability}
              </dd>
            </div>
          </dl>

          <div className="mt-auto pt-4">
            {car.outTheDoorCents === null ? (
              <p className="font-serif text-[0.875rem] text-ink-muted">
                {dict.card.notPriced(car.state)}
              </p>
            ) : (
              <>
                <p className="tnum font-display text-2xl font-extrabold leading-none tracking-tight text-brass">
                  {formatMoney(car.outTheDoorCents, { cents: true })}
                </p>
                <p className="mt-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                  {dict.card.outTheDoor} ·{" "}
                  <span className="text-accent">
                    {sellable ? dict.card.zeroApr : dict.card.notForSale}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
