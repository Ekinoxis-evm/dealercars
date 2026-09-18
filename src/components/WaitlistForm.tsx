"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Waitlist capture. No backend exists yet, so this validates locally and
 * shows an inline confirmation — nothing is sent anywhere.
 */
export function WaitlistForm() {
  const { dict } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError("That doesn't look like a working email address. Check it and try again.");
      return;
    }
    setError(null);
    setJoined(true);
  }

  if (joined) {
    return (
      <div
        role="status"
        className="border border-rule-strong bg-paper-raised px-4 py-5 sm:px-6"
      >
        <p className="font-display text-lg font-bold tracking-tight">
          {dict.waitlist.onTheList}
        </p>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          {dict.waitlist.weWillEmail}{" "}
          <span className="font-mono text-[0.875rem] text-ink">{email.trim()}</span>{" "}
          {dict.waitlist.whenSomethingLands}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-xl">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? "waitlist-error" : undefined}
          className="min-w-0 flex-1 border border-rule-strong bg-paper-raised px-3 py-2.5 font-mono text-[0.9375rem] text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          className="shrink-0 border border-accent bg-accent px-5 py-2.5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
        >
          Join the waitlist
        </button>
      </div>
      {error && (
        <p
          id="waitlist-error"
          role="alert"
          className="mt-2 font-serif text-[0.875rem] text-accent"
        >
          {error}
        </p>
      )}
      <p className="mt-2 font-serif text-[0.875rem] leading-relaxed text-ink-muted">
        No credit pull to join. When we open in your market, you&rsquo;ll verify
        your budget first — then the cars come to you.
      </p>
    </form>
  );
}
