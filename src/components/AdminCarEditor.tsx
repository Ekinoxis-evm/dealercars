"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { centsToInput, dollarsToCents } from "@/lib/money-input";
import { SUPPORTED_STATES } from "@/lib/deal-costs";
import { AdminPhotoManager } from "./AdminPhotoManager";
import { STATUS_LABELS } from "./AdminInventory";
import type { ListingPhoto, ListingStatus, RetailListing } from "@/lib/types";

/**
 * Add or edit one car.
 *
 * Two things here are load-bearing rather than cosmetic.
 *
 * Every money field is typed in dollars and converted with `dollarsToCents`,
 * which is string-based on purpose — `parseFloat * 100` lands a cent low often
 * enough to matter, and a cent that is wrong here is wrong in a Reg Z
 * disclosure later. Nothing in this component ever holds a float.
 *
 * Photographs are only editable once the car exists. They are rows keyed by
 * listing id and files in a bucket keyed by the same, so there is nothing to
 * attach them to until the row is saved. Rather than buffer uploads in memory
 * and hope the save succeeds, the form saves first and then opens the gallery.
 */

const SOURCES = [
  ["street", "Private party (street)"],
  ["dealer-lot", "Another dealer's lot"],
  ["trade-in", "Trade-in"],
  ["auction", "Auction"],
] as const;

const STATUSES: ListingStatus[] = [
  "sourced",
  "acquired",
  "available",
  "reserved",
  "sold",
];

/** Statuses that assert we hold title, and therefore need an acquisition record. */
const OWNED: ListingStatus[] = ["available", "reserved", "sold"];

type FormState = Record<string, string>;

const EMPTY: FormState = {
  id: "",
  dealerId: "dealer_orl_001",
  source: "street",
  status: "sourced",
  listingUrl: "",
  sellerName: "",
  vin: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  mileage: "",
  titleStatus: "clean",
  transmission: "automatic",
  exteriorColor: "",
  interiorColor: "",
  bodyStyle: "",
  fuelType: "",
  askingPrice: "",
  acquisitionTarget: "",
  estimatedRecon: "",
  retailPrice: "",
  acquiredPrice: "",
  acquiredAt: "",
  city: "",
  state: "FL",
  ownerCount: "",
  sellerWarrantyMonths: "",
  durability: "0.80",
  description: "",
  notes: "",
};

export function AdminCarEditor({ listingId }: { listingId?: string }) {
  const { ready, user } = useAuth();
  const authenticated = user !== null;
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [loaded, setLoaded] = useState(!listingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const load = useCallback(async () => {
    if (!listingId) return;
    try {
      const { listing } = await apiFetch<{ listing: RetailListing }>(
        `/api/admin/listings/${listingId}`
      );
      setForm({
        id: listing.id,
        dealerId: listing.dealerId,
        source: listing.source,
        status: listing.status,
        listingUrl: listing.listingUrl ?? "",
        sellerName: listing.sellerName ?? "",
        vin: listing.vin ?? "",
        year: String(listing.year),
        make: listing.make,
        model: listing.model,
        trim: listing.trim ?? "",
        mileage: listing.mileage === undefined ? "" : String(listing.mileage),
        titleStatus: listing.titleStatus,
        transmission: listing.transmission,
        exteriorColor: listing.exteriorColor ?? "",
        interiorColor: listing.interiorColor ?? "",
        bodyStyle: listing.bodyStyle ?? "",
        fuelType: listing.fuelType ?? "",
        askingPrice: centsToInput(listing.askingPriceCents),
        acquisitionTarget: centsToInput(listing.acquisitionTargetCents),
        estimatedRecon: centsToInput(listing.estimatedReconCents),
        retailPrice: centsToInput(listing.retailPriceCentsOverride),
        acquiredPrice: "",
        acquiredAt: "",
        city: listing.city,
        state: listing.state,
        ownerCount: listing.ownerCount ? String(listing.ownerCount) : "",
        sellerWarrantyMonths: listing.sellerWarrantyMonths
          ? String(listing.sellerWarrantyMonths)
          : "",
        durability: String(listing.durability),
        description: listing.description ?? "",
        notes: listing.notes.join("\n"),
      });
      setPhotos(listing.photos);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load that car.");
      setLoaded(true);
    }
  }, [listingId]);

  useEffect(() => {
    if (!ready || !authenticated) return;
    load();
  }, [ready, authenticated, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setReasons(null);
    setSaved(false);

    // Money in, cents out. A field left blank stays undefined rather than
    // becoming 0 — "not stated" and "zero dollars" are different claims.
    const money = (v: string) => {
      const t = v.trim();
      if (t === "") return undefined;
      const cents = dollarsToCents(t);
      return cents === null ? "invalid" : cents;
    };

    const askingPrice = money(form.askingPrice);
    const acquisitionTarget = money(form.acquisitionTarget);
    const estimatedRecon = money(form.estimatedRecon);
    const retailPrice = money(form.retailPrice);
    const acquiredPrice = money(form.acquiredPrice);

    const bad = [
      ["Asking price", askingPrice],
      ["Acquisition target", acquisitionTarget],
      ["Estimated recon", estimatedRecon],
      ["Retail price", retailPrice],
      ["Acquired price", acquiredPrice],
    ].filter(([, v]) => v === "invalid");

    if (bad.length) {
      setSaving(false);
      setReasons(bad.map(([label]) => `${label} is not a valid dollar amount.`));
      setError("Check the figures.");
      return;
    }

    const intOrUndefined = (v: string) => {
      const t = v.trim();
      if (t === "") return undefined;
      const n = Number(t);
      return Number.isInteger(n) ? n : undefined;
    };

    const payload: Record<string, unknown> = {
      source: form.source,
      status: form.status,
      listing_url: form.listingUrl.trim() || null,
      seller_name: form.sellerName.trim() || null,
      vin: form.vin.trim().toUpperCase() || null,
      year: intOrUndefined(form.year),
      make: form.make.trim(),
      model: form.model.trim(),
      trim: form.trim.trim() || null,
      // Blank clears it: unknown mileage is a real state, shown as "to be
      // confirmed", and it fails underwriting until somebody records it.
      mileage: form.mileage.trim() === "" ? null : intOrUndefined(form.mileage),
      title_status: form.titleStatus,
      transmission: form.transmission,
      exterior_color: form.exteriorColor.trim() || null,
      interior_color: form.interiorColor.trim() || null,
      body_style: form.bodyStyle.trim() || null,
      fuel_type: form.fuelType.trim() || null,
      asking_price_cents: askingPrice,
      acquisition_target_cents: acquisitionTarget,
      estimated_recon_cents: estimatedRecon ?? 0,
      // An emptied retail price is an explicit null, which restores the derived
      // price. Omitting it would silently leave the old override in place.
      retail_price_cents: retailPrice === undefined ? null : retailPrice,
      city: form.city.trim(),
      state: form.state,
      owner_count: intOrUndefined(form.ownerCount) ?? null,
      seller_warranty_months: intOrUndefined(form.sellerWarrantyMonths) ?? null,
      durability: Number(form.durability),
      description: form.description.trim() || null,
      notes: form.notes
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
    };

    if (acquiredPrice !== undefined) payload.acquired_price_cents = acquiredPrice;
    if (form.acquiredAt.trim()) {
      payload.acquired_at = new Date(form.acquiredAt).toISOString();
    }
    if (!listingId) {
      payload.id = form.id.trim();
      payload.dealer_id = form.dealerId.trim();
    }

    try {
      if (listingId) {
        const res = await apiFetch<{ warning?: string }>(
          `/api/admin/listings/${listingId}`,
          { method: "PATCH", body: JSON.stringify(payload) }
        );
        setWarning(res.warning ?? null);
        setSaved(true);
      } else {
        const res = await apiFetch<{ id: string; warning?: string }>(
          "/api/admin/listings",
          { method: "POST", body: JSON.stringify(payload) }
        );
        // Straight to the editor for the new car, which is where the photo
        // manager lives — a car with no pictures is not yet a listing.
        router.push(`/admin/cars/${res.id}`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
      setReasons(e instanceof ApiError ? (e.reasons ?? null) : null);
    } finally {
      setSaving(false);
    }
  }

  // Signed-out visitors never reach this: AdminShell shows the sign-in instead.
  if (!ready || !authenticated) return <p className="font-serif text-ink-muted">Loading&hellip;</p>;

  if (!loaded) return <p className="font-serif text-ink-muted">Loading&hellip;</p>;

  const needsAcquisition = OWNED.includes(form.status as ListingStatus);

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="flex flex-col gap-8">
        {/* ------------------------------------------------------ vehicle */}
        <Section title="The car">
          <Row>
            <Field label="Year" required>
              <input
                type="number"
                required
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Make" required>
              <input
                required
                value={form.make}
                onChange={(e) => set("make", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Model" required>
              <input
                required
                value={form.model}
                onChange={(e) => set("model", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Trim">
              <input
                value={form.trim}
                onChange={(e) => set("trim", e.target.value)}
                className={INPUT}
              />
            </Field>
          </Row>

          <Row>
            <Field
              label="Mileage"
              hint="Over 150,000 fails underwriting outright. Blank shows as “to be confirmed” and fails it too."
            >
              <input
                type="number"
                value={form.mileage}
                onChange={(e) => set("mileage", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Transmission">
              <select
                value={form.transmission}
                onChange={(e) => set("transmission", e.target.value)}
                className={INPUT}
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Body style">
              <input
                value={form.bodyStyle}
                onChange={(e) => set("bodyStyle", e.target.value)}
                placeholder="Sedan"
                className={INPUT}
              />
            </Field>
            <Field label="Fuel">
              <input
                value={form.fuelType}
                onChange={(e) => set("fuelType", e.target.value)}
                placeholder="Gasoline"
                className={INPUT}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Exterior colour">
              <input
                value={form.exteriorColor}
                onChange={(e) => set("exteriorColor", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Interior colour">
              <input
                value={form.interiorColor}
                onChange={(e) => set("interiorColor", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field
              label="VIN"
              hint="17 characters. Leave blank until it is actually known — a guessed VIN runs the title check on the wrong car."
            >
              <input
                value={form.vin}
                onChange={(e) => set("vin", e.target.value)}
                className={`${INPUT} uppercase`}
              />
            </Field>
            <Field label="Title">
              <select
                value={form.titleStatus}
                onChange={(e) => set("titleStatus", e.target.value)}
                className={INPUT}
              >
                <option value="clean">Clean</option>
                <option value="branded">Branded</option>
                <option value="salvage">Salvage</option>
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="City" required>
              <input
                required
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field
              label="State"
              required
              hint="Selects the tax, title and fee profile. An unmapped state cannot be quoted."
            >
              <select
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
                className={INPUT}
              >
                {SUPPORTED_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Owners">
              <input
                type="number"
                value={form.ownerCount}
                onChange={(e) => set("ownerCount", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field
              label="Durability"
              hint="0 to 1. Underwriting, not a star rating — a car that breaks in month four stops being paid for."
            >
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.durability}
                onChange={(e) => set("durability", e.target.value)}
                className={INPUT}
              />
            </Field>
          </Row>
        </Section>

        {/* -------------------------------------------------------- money */}
        <Section
          title="Money"
          note="Every figure is dollars and cents. Acquisition target and asking price are internal — they never reach a member."
        >
          <Row>
            <Field label="Asking price" required hint="What the seller wants.">
              <MoneyInput
                value={form.askingPrice}
                onChange={(v) => set("askingPrice", v)}
                required
              />
            </Field>
            <Field
              label="Acquisition target"
              required
              hint="What we should actually pay. Pricing off the ask hands the seller our gross."
            >
              <MoneyInput
                value={form.acquisitionTarget}
                onChange={(v) => set("acquisitionTarget", v)}
                required
              />
            </Field>
            <Field label="Estimated recon">
              <MoneyInput
                value={form.estimatedRecon}
                onChange={(v) => set("estimatedRecon", v)}
              />
            </Field>
            <Field
              label="Retail price"
              hint="What the member pays for the car. Leave blank to derive it from the acquisition target plus fees and target gross."
            >
              <MoneyInput
                value={form.retailPrice}
                onChange={(v) => set("retailPrice", v)}
              />
            </Field>
          </Row>
        </Section>

        {/* ------------------------------------------------------- status */}
        <Section
          title="Status"
          note="A car may only be paid for once it is available or reserved. Anything past 'acquired' asserts we hold title, so it needs the purchase on record."
        >
          <Row>
            <Field label="Status" required>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={INPUT}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source" required>
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className={INPUT}
              >
                {SOURCES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Seller name">
              <input
                value={form.sellerName}
                onChange={(e) => set("sellerName", e.target.value)}
                className={INPUT}
              />
            </Field>
            <Field label="Original listing URL">
              <input
                type="url"
                value={form.listingUrl}
                onChange={(e) => set("listingUrl", e.target.value)}
                className={INPUT}
              />
            </Field>
          </Row>

          {needsAcquisition && (
            <div className="mt-4 border-l-2 border-accent bg-paper px-4 py-3">
              <p className="font-serif text-[0.875rem] leading-relaxed text-ink-muted">
                <strong className="font-display font-bold text-ink">
                  {STATUS_LABELS[form.status as ListingStatus]}
                </strong>{" "}
                says we own this car. Record what we paid and when — the database
                refuses the status otherwise, and it is right to.
              </p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Acquired price">
                  <MoneyInput
                    value={form.acquiredPrice}
                    onChange={(v) => set("acquiredPrice", v)}
                  />
                </Field>
                <Field label="Acquired on">
                  <input
                    type="date"
                    value={form.acquiredAt}
                    onChange={(e) => set("acquiredAt", e.target.value)}
                    className={INPUT}
                  />
                </Field>
              </div>
              <p className="mt-2 font-serif text-[0.8125rem] text-ink-muted">
                Already recorded? Leave both blank and the stored values stand.
              </p>
            </div>
          )}
        </Section>

        {/* ---------------------------------------------------- editorial */}
        <Section title="Words">
          <Field
            label="Description"
            hint="Shown to the member on the listing page."
          >
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={INPUT}
            />
          </Field>
          <div className="mt-4">
            <Field
              label="Notes"
              hint="One per line. The underwriting record — what is unverified, what the seller claimed. Shown on the car page as caveats, so write them as such."
            >
              <textarea
                rows={5}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>
        </Section>

        {/* -------------------------------------------------------- new id */}
        {!listingId && (
          <Section
            title="Identity"
            note="Permanent. It appears in the car's URL and is referenced by every payment against it, so it cannot be changed later."
          >
            <Row>
              <Field label="Listing id" required hint="lowercase, digits, underscores">
                <input
                  required
                  value={form.id}
                  onChange={(e) => set("id", e.target.value)}
                  placeholder="listing_mazda3_orl_2014"
                  className={INPUT}
                />
              </Field>
              <Field label="Dealer id" required>
                <input
                  required
                  value={form.dealerId}
                  onChange={(e) => set("dealerId", e.target.value)}
                  className={INPUT}
                />
              </Field>
            </Row>
          </Section>
        )}

        {/* -------------------------------------------------------- errors */}
        {error && (
          <div className="border-l-2 border-accent bg-paper-raised px-4 py-3">
            <p className="font-display text-[0.9375rem] font-bold tracking-tight">
              {error}
            </p>
            {reasons?.length ? (
              <ul className="mt-2">
                {reasons.map((r) => (
                  <li
                    key={r}
                    className="font-serif text-[0.875rem] leading-relaxed text-ink-muted"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {warning && (
          <p className="border-l-2 border-light-amber bg-paper-raised px-4 py-3 font-serif text-[0.875rem] text-ink-muted">
            {warning}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent px-5 py-2.5 font-display text-sm font-bold tracking-tight text-accent-ink disabled:opacity-50"
          >
            {saving ? "Saving…" : listingId ? "Save changes" : "Add the car"}
          </button>
          {saved && (
            <span className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-light-green">
              Saved
            </span>
          )}
          <Link
            href="/admin"
            className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted underline"
          >
            Back to inventory
          </Link>
        </div>
      </form>

      {/* ------------------------------------------------------- photos */}
      {listingId ? (
        <AdminPhotoManager
          listingId={listingId}
          photos={photos}
          onChange={setPhotos}
        />
      ) : (
        <p className="border border-dashed border-rule-strong px-4 py-4 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
          Photographs can be added once the car is saved — they attach to its id.
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ pieces

const INPUT =
  "w-full border border-rule-strong bg-paper px-3 py-2 font-mono text-[0.875rem] text-ink focus:outline-none";

function MoneyInput({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center border border-rule-strong bg-paper">
      <span className="pl-3 font-mono text-[0.875rem] text-ink-faint">$</span>
      <input
        inputMode="decimal"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="tnum w-full bg-transparent px-2 py-2 font-mono text-[0.875rem] text-ink focus:outline-none"
      />
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-rule-strong bg-paper-raised">
      <div className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {title}
        </h2>
        {note && (
          <p className="mt-1 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
            {note}
          </p>
        )}
      </div>
      <div className="px-4 py-4 sm:px-6">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <span className="mt-1 block">{children}</span>
      {hint && (
        <span className="mt-1 block font-serif text-[0.75rem] leading-snug text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}
