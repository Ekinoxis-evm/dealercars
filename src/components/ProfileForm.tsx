"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { apiFetch, ApiError } from "@/lib/api-client";
import { centsToInput, dollarsToCents } from "@/lib/money-input";
import { formatMoney } from "@/lib/finance";
import type { EmploymentType, MemberProfile } from "@/lib/types";
import { SUPPORTED_STATES } from "@/lib/deal-costs";

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  w2_fulltime: "W-2, full time",
  w2_parttime: "W-2, part time",
  "1099": "1099 / contract",
  cash: "Paid in cash",
  benefits: "Benefits or fixed income",
  self_employed: "Self-employed",
};

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
  const { ready, authenticated, login, user } = usePrivy();

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
          setError(e instanceof ApiError ? e.message : "Could not load your profile.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, authenticated]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReasons(null);

    const income = form.grossMonthlyIncome
      ? dollarsToCents(form.grossMonthlyIncome)
      : undefined;
    if (form.grossMonthlyIncome && income === null) {
      setError("Gross monthly income must be a plain dollar amount, like 2400 or 2400.50.");
      return;
    }
    const down = form.statedDown ? dollarsToCents(form.statedDown) : undefined;
    if (form.statedDown && down === null) {
      setError("Cash available must be a plain dollar amount.");
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
        setError("Could not save your profile.");
      }
    }
  }

  if (!ready) {
    return <p className="font-serif text-ink-muted">Loading&hellip;</p>;
  }

  if (!authenticated) {
    return (
      <div className="border border-rule-strong bg-paper-raised px-4 py-6 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Sign in to start
        </h2>
        <p className="mt-1 max-w-prose font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          Email or phone. No credit pull to create an account, and no credit
          score anywhere in this process &mdash; we underwrite on capacity, not
          on a file that this market usually doesn&rsquo;t have.
        </p>
        <button
          type="button"
          onClick={login}
          className="mt-4 border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  const unsupportedState =
    form.state.length === 2 && !SUPPORTED_STATES.includes(form.state.toUpperCase());

  return (
    <form onSubmit={save} className="border border-rule-strong bg-paper-raised">
      <header className="border-b border-rule-strong px-4 py-3 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Your details
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          Signed in as{" "}
          <span className="font-mono text-[0.875rem] text-ink">
            {user?.email?.address ?? user?.phone?.number ?? profile?.privyDid}
          </span>
        </p>
      </header>

      <div className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6">
        <Field label="Full name" className="sm:col-span-2">
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            autoComplete="name"
            className={inputClass}
          />
        </Field>

        <Field label="Street address" className="sm:col-span-2">
          <input
            value={form.addressLine1}
            onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
            autoComplete="address-line1"
            className={inputClass}
          />
        </Field>

        <Field label="City">
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            autoComplete="address-level2"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="State">
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
          <Field label="ZIP">
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
            We aren&rsquo;t open in {form.state} yet. Tax, title and the contract
            form all differ by state, so we&rsquo;d rather tell you that than
            quote you a number that changes at signing. Currently:{" "}
            {SUPPORTED_STATES.join(", ")}.
          </p>
        )}

        <Field label="How you're paid">
          <select
            value={form.employmentType}
            onChange={(e) =>
              setForm({ ...form, employmentType: e.target.value as EmploymentType })
            }
            className={inputClass}
          >
            <option value="">Select&hellip;</option>
            {(Object.keys(EMPLOYMENT_LABELS) as EmploymentType[]).map((k) => (
              <option key={k} value={k}>
                {EMPLOYMENT_LABELS[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Employer">
          <input
            value={form.employerName}
            onChange={(e) => setForm({ ...form, employerName: e.target.value })}
            className={inputClass}
          />
        </Field>

        <Field label="Months at this job">
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

        <Field label="Gross monthly income ($)" hint="Before deductions, not take-home.">
          <input
            value={form.grossMonthlyIncome}
            inputMode="decimal"
            onChange={(e) =>
              setForm({ ...form, grossMonthlyIncome: e.target.value })
            }
            className={inputClass}
          />
        </Field>

        <Field label="Cash you can put down ($)" className="sm:col-span-2">
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
            Verification
          </h3>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <Check label="Identity" status={profile.identityVerification} />
            <Check label="Income" status={profile.incomeVerification} />
            <Check label="Residence" status={profile.residenceVerification} />
          </div>
          <p className="mt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
            Typing a figure here is an application, not proof. A financed deal
            needs identity and income actually verified first &mdash; paying in
            full does not.
            {profile.grossMonthlyIncomeCents ? (
              <>
                {" "}
                At {formatMoney(profile.grossMonthlyIncomeCents)} a month, the
                most you could be approved for is{" "}
                <span className="tnum font-mono text-[0.8125rem] text-ink">
                  {formatMoney(Math.floor(profile.grossMonthlyIncomeCents * 0.2))}
                </span>{" "}
                a month &mdash; a hard 20% cap on payment to income.
              </>
            ) : null}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-rule-strong px-4 py-4 sm:px-6">
        <button
          type="submit"
          disabled={status === "saving"}
          className="border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span role="status" className="font-serif text-[0.875rem] text-ink-muted">
            Saved.
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
