"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/finance";
import type { DealCosts, Money } from "@/lib/types";
import { useI18n } from "@/i18n/client";

/**
 * The whole price, first, with every piece of it and why.
 *
 * A member who is about to put $2,000 down deserves to see the number that
 * actually leaves their pocket before anything else on the page, and to see
 * what is inside it: the car, the tax, the doc fee, title and plates. Each
 * line opens to a sentence saying what it is based on, with a link to the
 * public schedule it comes from — a fee with no source reads as a fee we
 * made up.
 *
 * Nothing is computed here. Every figure arrives from `quoteListing` on the
 * server, which is the same function that would price the contract.
 */
export function PriceBreakdown({
  state,
  costs,
  retailPriceCents,
  salesTaxCents,
  docFeeCents,
  titleRegCents,
  outTheDoorCents,
}: {
  state: string;
  costs: Pick<DealCosts, "salesTaxRate" | "countySurtaxRate" | "countySurtaxCapCents" | "sources">;
  retailPriceCents: Money;
  salesTaxCents: Money;
  docFeeCents: Money;
  titleRegCents: Money;
  outTheDoorCents: Money;
}) {
  const { dict } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const t = dict.price;
  const pct = (rate: number) => `${(rate * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

  const rows: Array<{ id: string; label: string; cents: Money; why: string; source?: string }> = [
    { id: "vehicle", label: dict.car.vehicle, cents: retailPriceCents, why: t.vehicleWhy },
    {
      id: "tax",
      label: `${state} ${dict.car.tax}`,
      cents: salesTaxCents,
      why: t.taxWhy(
        pct(costs.salesTaxRate),
        costs.countySurtaxRate ? pct(costs.countySurtaxRate) : null,
        costs.countySurtaxCapCents ? formatMoney(costs.countySurtaxCapCents) : null
      ),
      source: costs.sources?.salesTax,
    },
    { id: "doc", label: dict.car.docFee, cents: docFeeCents, why: t.docWhy, source: costs.sources?.docFee },
    { id: "title", label: dict.car.titleReg, cents: titleRegCents, why: t.titleWhy, source: costs.sources?.titleReg },
  ];

  return (
    <section className="border border-rule-strong bg-paper-raised">
      {/* The big figure is in the page header just above; repeating it here
          would be two identical numbers stacked. This is the ledger. */}
      <div className="px-4 pt-3 sm:px-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-accent">
          {t.heading}
        </p>
        <p className="mt-0.5 max-w-prose font-serif text-[0.875rem] leading-snug text-ink-muted">
          {t.lede}
        </p>
      </div>

      <dl className="tnum mt-3 border-t border-rule px-4 font-mono text-[0.8125rem] sm:px-6">
        {rows.map((row) => {
          const expanded = open === row.id;
          return (
            <div key={row.id} className="border-b border-rule py-2">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-baseline gap-2 uppercase tracking-[0.06em] text-ink-faint">
                  {row.label}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`why-${row.id}`}
                    aria-label={t.why}
                    onClick={() => setOpen(expanded ? null : row.id)}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border font-serif text-[0.75rem] normal-case tracking-normal ${
                      expanded ? "border-accent bg-accent text-accent-ink" : "border-rule-strong text-ink-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    ?
                  </button>
                </dt>
                <dd className="text-right text-ink">{formatMoney(row.cents, { cents: true })}</dd>
              </div>
              {expanded && (
                <p
                  id={`why-${row.id}`}
                  className="mt-1.5 max-w-prose font-serif text-[0.875rem] leading-snug text-ink-muted"
                >
                  {row.why}
                  {row.source && (
                    <>
                      {" "}
                      <a
                        href={row.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink underline underline-offset-4 hover:text-accent"
                      >
                        {t.source} ↗
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          );
        })}
        <div className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="uppercase tracking-[0.06em] text-ink">{dict.car.outTheDoorRow}</dt>
          <dd className="text-right font-semibold text-ink">{formatMoney(outTheDoorCents, { cents: true })}</dd>
        </div>
      </dl>
      <p className="border-t border-rule px-4 py-2 font-serif text-[0.8125rem] leading-snug text-ink-muted sm:px-6">
        {t.nothingElse} {dict.car.creditorNote}
      </p>
    </section>
  );
}
