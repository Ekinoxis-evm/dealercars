"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Dealer } from "@/lib/dealers";
import { AdminGate } from "./AdminGate";

const INPUT =
  "w-full border border-rule-strong bg-paper px-3 py-2 font-mono text-[0.875rem] text-ink focus:outline-none";

type Form = {
  dbaName: string;
  legalName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  whatsapp: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  timeZone: string;
};

function fromDealer(d: Dealer): Form {
  return {
    dbaName: d.dbaName ?? "",
    legalName: d.legalName,
    streetAddress: d.streetAddress ?? "",
    city: d.city,
    state: d.state,
    postalCode: d.postalCode ?? "",
    whatsapp: d.whatsapp ?? "",
    instagramUrl: d.instagramUrl ?? "",
    facebookUrl: d.facebookUrl ?? "",
    tiktokUrl: d.tiktokUrl ?? "",
    timeZone: d.timeZone,
  };
}

/**
 * Everything the public site says about the business, in one form.
 *
 * What is missing is deliberate: the licence numbers, their verification
 * dates and the Stripe flags. They decide whether money may be taken, and
 * they are set by verification and by Stripe's webhook, not typed in here.
 */
export function AdminDealerEditor() {
  const { ready, user } = useAuth();
  const authenticated = user !== null;
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { dealer } = await apiFetch<{ dealer: Dealer }>("/api/admin/dealer");
      setDealer(dealer);
      setForm(fromDealer(dealer));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError(e instanceof ApiError ? e.message : "Could not load the dealer.");
    }
  }, []);

  useEffect(() => {
    if (ready && authenticated) load();
  }, [ready, authenticated, load]);

  const set = (k: keyof Form, v: string) => {
    setSaved(false);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setReasons(null);
    try {
      const { dealer } = await apiFetch<{ dealer: Dealer }>("/api/admin/dealer", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setDealer(dealer);
      setForm(fromDealer(dealer));
      setSaved(true);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setReasons(e.reasons ?? null);
      } else setError("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGate what="edit the dealer" forbidden={forbidden}>
      {!form || !dealer ? (
        error ? (
          <p role="alert" className="font-serif text-accent">{error}</p>
        ) : (
          <p className="font-serif text-ink-muted">Loading&hellip;</p>
        )
      ) : (
        <form onSubmit={save} className="space-y-8">
          <Section title="Name" hint="The trading name is what members see. The legal name goes on the contract.">
            <Row>
              <Field label="Trading name (DBA)">
                <input value={form.dbaName} onChange={(e) => set("dbaName", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Legal name" required>
                <input required value={form.legalName} onChange={(e) => set("legalName", e.target.value)} className={INPUT} />
              </Field>
            </Row>
          </Section>

          <Section title="Where members come" hint="Shown on the front page with a map, and in the visit confirmation. The state selects the tax profile — it is not cosmetic.">
            <Row>
              <Field label="Street address">
                <input value={form.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} className={INPUT} />
              </Field>
              <Field label="City" required>
                <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={INPUT} />
              </Field>
              <Field label="State" required>
                <input required maxLength={2} value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className={INPUT} />
              </Field>
              <Field label="ZIP">
                <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} className={INPUT} />
              </Field>
            </Row>
            <Row>
              <Field label="Time zone" hint="IANA name. Appointment slots are offered in this zone.">
                <input value={form.timeZone} onChange={(e) => set("timeZone", e.target.value)} className={INPUT} />
              </Field>
            </Row>
          </Section>

          <Section title="Contact" hint="WhatsApp is where every 'talk to an agent' button goes. Full number with country code; punctuation is fine, it is stripped.">
            <Row>
              <Field label="WhatsApp">
                <input inputMode="tel" placeholder="1 786 867 1441" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={INPUT} />
              </Field>
            </Row>
          </Section>

          <Section title="Social" hint="Full https:// links. Leave one blank and it disappears from the footer — no dead links.">
            <Row>
              <Field label="Instagram">
                <input type="url" value={form.instagramUrl} onChange={(e) => set("instagramUrl", e.target.value)} className={INPUT} />
              </Field>
              <Field label="Facebook">
                <input type="url" value={form.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} className={INPUT} />
              </Field>
              <Field label="TikTok">
                <input type="url" value={form.tiktokUrl} onChange={(e) => set("tiktokUrl", e.target.value)} className={INPUT} />
              </Field>
            </Row>
          </Section>

          <Section title="Not editable here" hint="Set by verification and by Stripe, because they decide whether money may be taken.">
            <dl className="grid gap-x-6 gap-y-2 font-mono text-[0.8125rem] sm:grid-cols-2">
              <Ro label="Dealer licence (Ch. 320.27)" value={dealer.dealerLicenseVerifiedAt ? `verified ${dealer.dealerLicenseVerifiedAt.slice(0, 10)}` : "not verified"} />
              <Ro label="Retail installment seller (Ch. 520)" value={dealer.licenseVerifiedAt ? `verified ${dealer.licenseVerifiedAt.slice(0, 10)}` : "not verified"} />
              <Ro label="Stripe charges" value={dealer.stripeChargesEnabled ? "enabled" : "not enabled"} />
              <Ro label="Stripe payouts" value={dealer.stripePayoutsEnabled ? "enabled" : "not enabled"} />
            </dl>
          </Section>

          <div className="flex flex-wrap items-center gap-4 border-t border-rule-strong pt-6">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent px-5 py-2.5 font-display text-sm font-bold tracking-tight text-accent-ink disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && <p role="status" className="font-serif text-[0.9375rem] text-ink-muted">Saved. The site picks it up within a minute.</p>}
            {error && (
              <div role="alert" className="font-serif text-[0.9375rem] text-accent">
                {error}
                {reasons && (
                  <ul className="mt-1 list-disc pl-5 text-ink-muted">
                    {reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </form>
      )}
    </AdminGate>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-extrabold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 font-serif text-[0.875rem] leading-snug text-ink-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}{required && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block font-serif text-[0.75rem] text-ink-faint">{hint}</span>}
    </label>
  );
}

function Ro({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-rule py-1.5">
      <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-faint">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
