"use client";

import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/finance";
import type { CarCardData } from "@/lib/inventory-card";
import { CarCard } from "./CarCard";

/**
 * The lot, sortable and filterable.
 *
 * Client-side because sorting a list a member is already looking at should not
 * cost a round trip, and because the whole lot fits in one payload — this is a
 * used-car dealership, not a national marketplace. It deliberately does NOT
 * price anything: every figure it sorts and filters on was computed on the
 * server in `toCardData`. The browser reorders cards; it never does money.
 *
 * The budget filter compares against the out-the-door price, not the sticker.
 * Tax, doc fee and title are several hundred dollars in Florida, and a filter
 * that ignored them would put cars in front of a member that their money does
 * not actually reach.
 */
type Sort = "price-asc" | "price-desc" | "mileage-asc" | "year-desc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" },
  { value: "mileage-asc", label: "Fewest miles" },
  { value: "year-desc", label: "Newest" },
];

/** Ceilings a BHPH buyer actually thinks in. Null is "show me everything". */
const BUDGETS: { value: number | null; label: string }[] = [
  { value: null, label: "Any price" },
  { value: 10_000_00, label: "Under $10k" },
  { value: 15_000_00, label: "Under $15k" },
  { value: 20_000_00, label: "Under $20k" },
];

export function InventoryGrid({ cars }: { cars: CarCardData[] }) {
  const [sort, setSort] = useState<Sort>("price-asc");
  const [maxCents, setMaxCents] = useState<number | null>(null);

  const shown = useMemo(() => {
    const filtered =
      maxCents === null
        ? cars
        : cars.filter(
            (c) => c.outTheDoorCents !== null && c.outTheDoorCents <= maxCents
          );

    // Unpriced cars sort last on a price sort rather than sorting as free.
    const priceOf = (c: CarCardData) => c.outTheDoorCents ?? Number.MAX_SAFE_INTEGER;

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return priceOf(a) - priceOf(b);
        case "price-desc":
          return priceOf(b) - priceOf(a);
        case "mileage-asc":
          return a.mileage - b.mileage;
        case "year-desc":
          return b.year - a.year;
      }
    });
  }, [cars, sort, maxCents]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-rule bg-paper-sunken px-3 py-2.5">
        <Toggles
          label="Budget"
          options={BUDGETS}
          selected={maxCents}
          onSelect={setMaxCents}
        />
        <Toggles
          label="Sort"
          options={SORTS}
          selected={sort}
          onSelect={setSort}
        />
      </div>

      <p
        aria-live="polite"
        className="mt-4 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint"
      >
        {shown.length} {shown.length === 1 ? "car" : "cars"}
        {maxCents !== null && ` under ${formatMoney(maxCents)} out the door`}
      </p>

      {shown.length === 0 ? (
        <p className="mt-6 border border-dashed border-rule-strong bg-paper-raised px-6 py-10 text-center font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          Nothing on the lot fits that budget today. Cars come in every week —
          the lot turns over faster than the filter suggests.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((car) => (
            <CarCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}

function Toggles<T extends string | number | null>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={option.value === selected}
            onClick={() => onSelect(option.value)}
            className={`border px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] ${
              option.value === selected
                ? "border-accent bg-accent text-accent-ink"
                : "border-rule-strong bg-paper text-ink-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
