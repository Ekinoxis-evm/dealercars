"use client";

import { useEffect, useState } from "react";
import { AsYouType, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/**
 * A phone number with the country code picked separately.
 *
 * The member sees two parts — a country and a number written the way they
 * write it — and the record holds one clean international number
 * (+14075551234). Validation is per country through libphonenumber, so a
 * Colombian mobile and a Florida landline are each judged by their own rules.
 *
 * The country list is the markets this lot actually sells to, US first.
 */
const COUNTRIES: Array<{ code: CountryCode; label: string }> = [
  { code: "US", label: "US" },
  { code: "MX", label: "MX" },
  { code: "CO", label: "CO" },
  { code: "VE", label: "VE" },
  { code: "DO", label: "DO" },
  { code: "CU", label: "CU" },
  { code: "HN", label: "HN" },
  { code: "GT", label: "GT" },
  { code: "SV", label: "SV" },
  { code: "NI", label: "NI" },
  { code: "PE", label: "PE" },
  { code: "EC", label: "EC" },
  { code: "PR", label: "PR" },
  { code: "BR", label: "BR" },
  { code: "AR", label: "AR" },
  { code: "CA", label: "CA" },
];

export function PhoneField({
  id,
  label,
  hint,
  value,
  onChange,
  inputClass,
}: {
  id: string;
  label: string;
  hint?: string;
  /** E.164, e.g. "+14075551234", or "". */
  value: string;
  /** Called with E.164 when the number is valid, "" when cleared, null while invalid. */
  onChange: (e164: string | null) => void;
  inputClass: string;
}) {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? "US");
  const [national, setNational] = useState(parsed?.formatNational() ?? "");

  // Re-sync when a saved profile arrives after first paint.
  useEffect(() => {
    if (!value) return;
    const p = parsePhoneNumberFromString(value);
    if (p?.country) setCountry(p.country);
    if (p) setNational(p.formatNational());
  }, [value]);

  function commit(nextCountry: CountryCode, nextNational: string) {
    const digits = nextNational.replace(/\D/g, "");
    if (!digits) {
      onChange("");
      return;
    }
    const p = parsePhoneNumberFromString(nextNational, nextCountry);
    onChange(p && p.isValid() ? p.number : null);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Country code"
          value={country}
          onChange={(e) => {
            const c = e.target.value as CountryCode;
            setCountry(c);
            commit(c, national);
          }}
          // Not `inputClass`: that carries w-full, and two width utilities on
          // one element resolve by stylesheet order, not by intent.
          className={`${inputClass.replace(/\bw-full\b/, "")} w-28 shrink-0`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label} +{getCountryCallingCode(c.code)}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => {
            // Format as they type, the way a phone's dialer does.
            const typed = new AsYouType(country).input(e.target.value);
            setNational(typed);
            commit(country, typed);
          }}
          className={`${inputClass} min-w-0 flex-1`}
        />
      </div>
      {hint && <span className="mt-1 block font-serif text-[0.75rem] text-ink-muted">{hint}</span>}
    </div>
  );
}
