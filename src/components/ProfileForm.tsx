"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { centsToInput, dollarsToCents } from "@/lib/money-input";
import { formatMoney } from "@/lib/finance";
import type { EmploymentType, MemberProfile } from "@/lib/types";
import { SUPPORTED_STATES } from "@/lib/deal-costs";
import { useI18n } from "@/i18n/client";
import { useAuth } from "./AuthProvider";
import { SignIn } from "./SignIn";
import { PhoneField } from "./PhoneField";
import { AddressField, lookupZip } from "./AddressField";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "w2_fulltime",
  "w2_parttime",
  "1099",
  "cash",
  "benefits",
  "self_employed",
];

/**
 * The member's own record, as a three-step wizard.
 *
 *   1. Name.
 *   2. How to reach them — a phone with its country code, and an address that
 *      fills itself in from Google Places (street, city, state, ZIP, county).
 *   3. Finances — how they are paid, income, what they can put down.
 *
 * Each step saves when the member continues, so a phone that dies after step
 * two has lost nothing. Note what this form collects and what it does not: it
 * asks for gross monthly income, employment and time at employer — capacity —
 * and never asks for a credit score. This population has thin or damaged files
 * by definition; a FICO-first form rejects the entire market before
 * underwriting starts.
 *
 * Stating a figure here is an application, not a verification. The server
 * refuses to let this form touch the verification columns, so an income typed
 * in remains "unverified" until it is actually proved.
 */
type Form = {
  firstName: string;
  lastName: string;
  /** E.164 or "". Null while the typed number is not valid for its country. */
  phone: string | null;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  county: string;
  employmentType: EmploymentType | "";
  employerName: string;
  monthsAtEmployer: string;
  grossMonthlyIncome: string;
  statedDown: string;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  county: "",
  employmentType: "",
  employerName: "",
  monthsAtEmployer: "",
  grossMonthlyIncome: "",
  statedDown: "",
};

function fromProfile(p: MemberProfile): Form {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    phone: p.phone ?? "",
    addressLine1: p.addressLine1 ?? "",
    addressLine2: p.addressLine2 ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    postalCode: p.postalCode ?? "",
    county: p.county ?? "",
    employmentType: p.employmentType ?? "",
    employerName: p.employerName ?? "",
    monthsAtEmployer: p.monthsAtEmployer !== undefined ? String(p.monthsAtEmployer) : "",
    grossMonthlyIncome: centsToInput(p.grossMonthlyIncomeCents),
    statedDown: centsToInput(p.statedDownCents),
  };
}

/** Which step a saved profile is up to: the first one with something missing. */
function firstIncompleteStep(p: MemberProfile): number {
  if (!p.firstName || !p.lastName) return 0;
  if (!p.phone || !p.addressLine1 || !p.city || !p.state || !p.postalCode) return 1;
  if (!p.employmentType || !p.grossMonthlyIncomeCents) return 2;
  return 3;
}

export function ProfileForm() {
  const { ready, user, signOut } = useAuth();
  const authenticated = user !== null;
  const { dict } = useI18n();
  const t = dict.account;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reasons, setReasons] = useState<string[] | null>(null);

  useEffect(() => {
    if (!ready || !authenticated) return;
    let cancelled = false;
    (async () => {
      try {
        const { profile } = await apiFetch<{ profile: MemberProfile }>("/api/profile");
        if (cancelled) return;
        setProfile(profile);
        setForm(fromProfile(profile));
        setStep(firstIncompleteStep(profile));
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : t.couldNotLoad);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Save one step's fields; returns false if the server refused. */
  async function save(payload: Record<string, unknown>): Promise<boolean> {
    setSaving(true);
    setError(null);
    setReasons(null);
    try {
      const { profile } = await apiFetch<{ profile: MemberProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setProfile(profile);
      return true;
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        setReasons(e.reasons ?? null);
      } else setError(t.couldNotSave);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function next(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0) {
      if (await save({ firstName: form.firstName, lastName: form.lastName })) setStep(1);
    } else if (step === 1) {
      if (form.phone === null) {
        setError(t.phoneInvalid);
        return;
      }
      const ok = await save({
        phone: form.phone,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        county: form.county,
      });
      if (ok) setStep(2);
    } else {
      const income = form.grossMonthlyIncome ? dollarsToCents(form.grossMonthlyIncome) : undefined;
      if (form.grossMonthlyIncome && income === null) {
        setError(t.badIncome);
        return;
      }
      const down = form.statedDown ? dollarsToCents(form.statedDown) : undefined;
      if (form.statedDown && down === null) {
        setError(t.badDown);
        return;
      }
      const ok = await save({
        employmentType: form.employmentType || undefined,
        employerName: form.employerName || null,
        monthsAtEmployer: form.monthsAtEmployer ? Number(form.monthsAtEmployer) : undefined,
        grossMonthlyIncomeCents: income,
        statedDownCents: down,
      });
      if (ok) setStep(3);
    }
  }

  if (!ready) return <p className="font-serif text-ink-muted">{t.loading}</p>;

  if (!authenticated) {
    return (
      <div className="max-w-md">
        <SignIn title={t.signInTitle} />
        <p className="mt-3 max-w-prose font-serif text-[0.875rem] leading-relaxed text-ink-muted">
          {t.signInLede}
        </p>
      </div>
    );
  }

  const unsupportedState =
    form.state.length === 2 && !SUPPORTED_STATES.includes(form.state.toUpperCase());

  return (
    <section className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-lg font-extrabold tracking-tight">
            {step < 3 ? t.steps[step] : t.yourDetails}
          </h2>
          {step < 3 && (
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
              {t.stepOf(step + 1, 3)}
            </span>
          )}
        </div>
        {/* Progress: three segments, filled as far as the member has got. */}
        <div className="mt-2 grid grid-cols-3 gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1 ${i < step || step === 3 ? "bg-accent" : i === step ? "bg-brass" : "bg-rule"}`} />
          ))}
        </div>
        {user?.email && (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
            <span>
              {t.signedInAs} <span className="font-mono text-[0.8125rem] text-ink">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted underline underline-offset-4 hover:text-accent"
            >
              {t.signOut}
            </button>
          </p>
        )}
      </header>

      {step === 3 && profile ? (
        <Summary profile={profile} onEdit={(s) => setStep(s)} />
      ) : (
        <form onSubmit={next} noValidate>
          <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
            {step === 0 && (
              <>
                <Field label={t.firstName}>
                  <input value={form.firstName} required autoComplete="given-name" onChange={(e) => set("firstName", e.target.value)} className={inputClass} />
                </Field>
                <Field label={t.lastName}>
                  <input value={form.lastName} required autoComplete="family-name" onChange={(e) => set("lastName", e.target.value)} className={inputClass} />
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <div className="sm:col-span-2">
                  <PhoneField
                    id="profile-phone"
                    label={t.phone}
                    hint={t.phoneHint}
                    value={form.phone ?? ""}
                    onChange={(e164) => set("phone", e164)}
                    inputClass={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <AddressField
                    id="profile-address"
                    label={t.addressSearch}
                    placeholder={t.addressPlaceholder}
                    value={form.addressLine1}
                    onChange={(line1) => set("addressLine1", line1)}
                    onResolve={(parts) =>
                      setForm((f) => ({
                        ...f,
                        addressLine1: parts.line1 || f.addressLine1,
                        city: parts.city,
                        state: parts.state,
                        postalCode: parts.postalCode,
                        county: parts.county,
                      }))
                    }
                    inputClass={inputClass}
                  />
                </div>
                <Field label={t.line2} className="sm:col-span-2">
                  <input value={form.addressLine2} autoComplete="address-line2" onChange={(e) => set("addressLine2", e.target.value)} className={inputClass} />
                </Field>
                <Field label={t.city}>
                  <input value={form.city} autoComplete="address-level2" onChange={(e) => set("city", e.target.value)} className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t.state}>
                    <input value={form.state} maxLength={2} autoComplete="address-level1" onChange={(e) => set("state", e.target.value.toUpperCase())} className={inputClass} />
                  </Field>
                  <Field label={t.zip}>
                    <input
                      value={form.postalCode}
                      inputMode="numeric"
                      autoComplete="postal-code"
                      onChange={(e) => set("postalCode", e.target.value)}
                      onBlur={async (e) => {
                        // Keyless fallback: a ZIP is enough to fill city and state.
                        if (form.city && form.state) return;
                        const hit = await lookupZip(e.target.value.trim());
                        if (hit) setForm((f) => ({ ...f, city: f.city || hit.city, state: f.state || hit.state }));
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>
                {form.county && (
                  <p className="sm:col-span-2 font-mono text-[0.75rem] text-ink-muted">
                    {t.county}: <span className="text-ink">{form.county}</span>
                  </p>
                )}
                {unsupportedState && (
                  <p className="sm:col-span-2 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
                    {t.notOpenIn(form.state, SUPPORTED_STATES.join(", "))}
                  </p>
                )}
              </>
            )}

            {step === 2 && (
              <>
                <Field label={t.howPaid}>
                  <select value={form.employmentType} onChange={(e) => set("employmentType", e.target.value as EmploymentType)} className={inputClass}>
                    <option value="">{t.select}</option>
                    {EMPLOYMENT_TYPES.map((k) => (
                      <option key={k} value={k}>{t.employment[k]}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t.employer}>
                  <input value={form.employerName} onChange={(e) => set("employerName", e.target.value)} className={inputClass} />
                </Field>
                <Field label={t.monthsAtJob}>
                  <input value={form.monthsAtEmployer} inputMode="numeric" onChange={(e) => set("monthsAtEmployer", e.target.value.replace(/\D/g, ""))} className={inputClass} />
                </Field>
                <Field label={t.grossIncome} hint={t.grossIncomeHint}>
                  <input value={form.grossMonthlyIncome} inputMode="decimal" onChange={(e) => set("grossMonthlyIncome", e.target.value)} className={inputClass} />
                </Field>
                <Field label={t.cashDown} className="sm:col-span-2">
                  <input value={form.statedDown} inputMode="decimal" onChange={(e) => set("statedDown", e.target.value)} className={inputClass} />
                </Field>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-rule-strong px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || saving}
              className="font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted underline underline-offset-4 hover:text-accent disabled:invisible"
            >
              ← {t.back}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving ? t.saving : step === 2 ? t.finish : t.next}
            </button>
          </div>

          {error && (
            <div role="alert" className="border-t border-rule px-4 py-3 sm:px-6">
              <p className="font-serif text-[0.875rem] leading-relaxed text-accent">{error}</p>
              {reasons && (
                <ul className="mt-1 list-disc pl-5 font-serif text-[0.8125rem] text-ink-muted">
                  {reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </form>
      )}
    </section>
  );
}

/** The finished file: everything on one screen, each part a tap from its step. */
function Summary({ profile, onEdit }: { profile: MemberProfile; onEdit: (step: number) => void }) {
  const { dict } = useI18n();
  const t = dict.account;
  const rows: Array<{ step: number; title: string; lines: string[] }> = [
    { step: 0, title: t.steps[0], lines: [profile.fullName ?? ""] },
    {
      step: 1,
      title: t.steps[1],
      lines: [
        profile.phone ?? "",
        [profile.addressLine1, profile.addressLine2].filter(Boolean).join(", "),
        [profile.city, profile.state, profile.postalCode].filter(Boolean).join(" "),
        profile.county ? `${t.county}: ${profile.county}` : "",
      ],
    },
    {
      step: 2,
      title: t.steps[2],
      lines: [
        profile.employmentType ? t.employment[profile.employmentType] : "",
        profile.employerName ?? "",
        profile.grossMonthlyIncomeCents ? `${t.grossIncome}: ${formatMoney(profile.grossMonthlyIncomeCents)}` : "",
        profile.statedDownCents ? `${t.cashDown}: ${formatMoney(profile.statedDownCents)}` : "",
      ],
    },
  ];
  return (
    <div>
      <div className="px-4 py-4 sm:px-6">
        <p className="font-display text-base font-bold tracking-tight">{t.doneTitle}</p>
        <p className="mt-1 font-serif text-[0.875rem] leading-relaxed text-ink-muted">{t.doneLede}</p>
      </div>
      <dl className="border-t border-rule">
        {rows.map((r) => (
          <div key={r.step} className="flex items-start justify-between gap-4 border-b border-rule px-4 py-3 sm:px-6">
            <div>
              <dt className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{r.title}</dt>
              <dd className="tnum mt-1 font-serif text-[0.9375rem] leading-snug text-ink">
                {r.lines.filter(Boolean).map((l) => <span key={l} className="block">{l}</span>)}
              </dd>
            </div>
            <button type="button" onClick={() => onEdit(r.step)} className="shrink-0 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-muted underline underline-offset-4 hover:text-accent">
              {t.edit}
            </button>
          </div>
        ))}
      </dl>
      <div className="px-4 py-4 sm:px-6">
        <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{t.verification}</h3>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <Check label={t.identity} status={profile.identityVerification} />
          <Check label={t.income} status={profile.incomeVerification} />
          <Check label={t.residence} status={profile.residenceVerification} />
        </div>
        <p className="tnum mt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
          {t.verificationNote}
          {profile.grossMonthlyIncomeCents
            ? ` ${t.capNote(formatMoney(profile.grossMonthlyIncomeCents), formatMoney(Math.floor(profile.grossMonthlyIncomeCents * 0.2)))}`
            : null}
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "w-full border border-rule-strong bg-paper px-3 py-2 font-mono text-[0.875rem] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">{label}</span>
      {children}
      {hint && <span className="mt-1 block font-serif text-[0.75rem] text-ink-muted">{hint}</span>}
    </label>
  );
}

function Check({ label, status }: { label: string; status: string }) {
  const verified = status === "verified";
  return (
    <span className="font-mono text-[0.75rem]">
      <span className={verified ? "text-light-green" : "text-ink-faint"}>{verified ? "✓" : "○"}</span>{" "}
      <span className="text-ink-muted">{label}</span>
    </span>
  );
}
