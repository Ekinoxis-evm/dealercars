"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { SignIn } from "./SignIn";
import { apiFetch, ApiError } from "@/lib/api-client";
import { centsToInput, dollarsToCents } from "@/lib/money-input";
import { formatMoney } from "@/lib/finance";
import type { EmploymentType, MemberProfile } from "@/lib/types";
import { SUPPORTED_STATES } from "@/lib/deal-costs";
import { useI18n } from "@/i18n/client";

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "w2_fulltime",
  "w2_parttime",
  "1099",
  "cash",
  "benefits",
  "self_employed",
];

/**
 * The member's own record.
 *
 * Note what this form collects and what it does not. It asks for gross monthly
 * income, employment, and time at employer — capacity — and never asks for a
 * credit score. This population has thin or damaged files by definition; a
 * FICO-first form rejects the entire market before underwriting starts.
 *
 * Stating a figure here is an application, not a verification. The server
 * refuses to let this form touch the verification columns, so an income typed
 * in remains "unverified" until it is actually proved.
 */
export function ProfileForm() {
  const { ready, user, signOut } = useAuth();
  const authenticated = user !== null;
  const { dict } = useI18n();
  const t = dict.account;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    employmentType: "" as EmploymentType | "",
    employerName: "",
    monthsAtEmployer: "",
    grossMonthlyIncome: "",
    statedDown: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
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
        setForm({
          fullName: profile.fullName ?? "",
          addressLine1: profile.addressLine1 ?? "",
          city: profile.city ?? "",
          state: profile.state ?? "",
          postalCode: profile.postalCode ?? "",
          employmentType: profile.employmentType ?? "",
          employerName: profile.employerName ?? "",
          monthsAtEmployer:
            profile.monthsAtEmployer !== undefined
              ? String(profile.monthsAtEmployer)
              : "",
          grossMonthlyIncome: centsToInput(profile.grossMonthlyIncomeCents),
          statedDown: centsToInput(profile.statedDownCents),
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : t.couldNotLoad);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReasons(null);

    const income = form.grossMonthlyIncome
      ? dollarsToCents(form.grossMonthlyIncome)
      : undefined;
    if (form.grossMonthlyIncome && income === null) {
      setError(t.badIncome);
      return;
    }
    const down = form.statedDown ? dollarsToCents(form.statedDown) : undefined;
    if (form.statedDown && down === null) {
      setError(t.badDown);
      return;
    }

    setStatus("saving");
    try {
      const { profile } = await apiFetch<{ profile: MemberProfile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: form.fullName || null,
          addressLine1: form.addressLine1 || null,
          city: form.city || null,
          state: form.state || undefined,
          postalCode: form.postalCode || null,
          employmentType: form.employmentType || undefined,
          employerName: form.employerName || null,
          monthsAtEmployer: form.monthsAtEmployer
            ? Number(form.monthsAtEmployer)
            : undefined,
          grossMonthlyIncomeCents: income,
          statedDownCents: down,
        }),
      });
      setProfile(profile);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setStatus("idle");
      if (e instanceof ApiError) {
        setError(e.message);
        setReasons(e.reasons ?? null);
      } else {
        setError(t.couldNotSave);
      }
    }
  }

  if (!ready) {
    return <p className="font-serif text-ink-muted">{t.loading}</p>;
  }

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
    <form onSubmit={save} className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          {t.yourDetails}
        </h2>
        {/* The email, or nothing. Never a user id or anything that looks
            like an address: a member is here to buy a car. */}
        {user?.email && (
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
            <span>
              {t.signedInAs}{" "}
              <span className="font-mono text-[0.875rem] text-ink">{user.email}</span>
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

      <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
        <Field label={t.fullName} className="sm:col-span-2">
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field label={t.street} className="sm:col-span-2">
          <input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            autoComplete="address-line1"
            className={inputClass}
          />
        </Field>

        <Field label={t.city}>
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            autoComplete="address-level2"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t.state}>
            <input
              value={form.state}
              maxLength={2}
              onChange={(e) =>
                setForm({ ...form, state: e.target.value.toUpperCase() })
              }
              autoComplete="address-level1"
              className={inputClass}
            />
          </Field>
          <Field label={t.zip}>
            <input
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              autoComplete="postal-code"
              className={inputClass}
            />
          </Field>
        </div>

        {unsupportedState && (
          <p className="sm:col-span-2 border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
            {t.notOpenIn(form.state, SUPPORTED_STATES.join(", "))}
          </p>
        )}

        <Field label={t.howPaid}>
          <select
            value={form.employmentType}
            onChange={(e) =>
              setForm({ ...form, employmentType: e.target.value as EmploymentType })
            }
            className={inputClass}
          >
            <option value="">{t.select}</option>
            {EMPLOYMENT_TYPES.map((k) => (
              <option key={k} value={k}>
                {t.employment[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t.employer}>
          <input
            value={form.employerName}
            onChange={(e) => setForm({ ...form, employerName: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label={t.monthsAtJob}>
          <input
            value={form.monthsAtEmployer}
            inputMode="numeric"
            onChange={(e) =>
              setForm({
                ...form,
                monthsAtEmployer: e.target.value.replace(/\D/g, ""),
              })
            }
            className={inputClass}
          />
        </Field>

        <Field label={t.grossIncome} hint={t.grossIncomeHint}>
          <input
            value={form.grossMonthlyIncome}
            inputMode="decimal"
            onChange={(e) =>
              setForm({ ...form, grossMonthlyIncome: e.target.value })
            }
            className={inputClass}
          />
        </Field>

        <Field label={t.cashDown} className="sm:col-span-2">
          <input
            value={form.statedDown}
            inputMode="decimal"
            onChange={(e) => setForm({ ...form, statedDown: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {profile && (
        <div className="border-t border-rule px-4 py-4 sm:px-6">
          <h3 className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t.verification}
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <Check label={t.identity} status={profile.identityVerification} />
            <Check label={t.income} status={profile.incomeVerification} />
            <Check label={t.residence} status={profile.residenceVerification} />
          </div>
          <p className="tnum mt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
            {t.verificationNote}
            {profile.grossMonthlyIncomeCents
              ? ` ${t.capNote(
                  formatMoney(profile.grossMonthlyIncomeCents),
                  formatMoney(Math.floor(profile.grossMonthlyIncomeCents * 0.2))
                )}`
              : null}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-rule-strong px-4 py-4 sm:px-6">
        <button
          type="submit"
          disabled={status === "saving"}
          className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:opacity-40"
        >
          {status === "saving" ? t.saving : t.save}
        </button>
        {status === "saved" && (
          <span role="status" className="font-serif text-[0.875rem] text-ink-muted">
            {t.saved}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="border-t border-rule px-4 py-3 sm:px-6">
          <p className="font-serif text-[0.875rem] leading-relaxed text-accent">
            {error}
          </p>
          {reasons && (
            <ul className="mt-1 list-disc pl-5 font-serif text-[0.8125rem] text-ink-muted">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

const inputClass =
  "w-full border border-rule-strong bg-paper px-3 py-2 font-mono text-[0.875rem] text-ink placeholder:text-ink-faint";

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block font-serif text-[0.75rem] text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

function Check({ label, status }: { label: string; status: string }) {
  const verified = status === "verified";
  return (
    <span className="font-mono text-[0.75rem]">
      <span className={verified ? "text-light-green" : "text-ink-faint"}>
        {verified ? "✓" : "○"}
      </span>{" "}
      <span className="text-ink-muted">{label}</span>
    </span>
  );
}
