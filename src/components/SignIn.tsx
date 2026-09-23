"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useI18n } from "@/i18n/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sign in with an email and nothing else.
 *
 * Supabase emails a link and, when the template carries one, a six-digit
 * code. Either works: the link lands on /auth/callback and sets the session
 * cookie; the code is verified right here. No password to forget, no
 * third-party session, no wallet.
 */
export function SignIn({ title }: { title?: string }) {
  const { dict } = useI18n();
  const t = dict.signIn;
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!EMAIL_RE.test(address)) {
      setError(t.badEmail);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`,
      },
    });
    setBusy(false);
    if (error) {
      setError(t.couldNotSend);
      return;
    }
    setEmail(address);
    setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) return;
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) setError(t.badCode);
    // On success AuthProvider hears the state change and the page re-renders.
  }

  return (
    <div className="w-full border border-rule-strong bg-paper-raised px-5 py-6 sm:px-6">
      <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
        MGM Auto
      </p>
      <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">
        {title ?? t.title}
      </h2>

      {!sent ? (
        <form onSubmit={send} noValidate className="mt-4">
          <label htmlFor="signin-email" className="block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t.emailLabel}
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-rule-strong bg-paper px-3 py-2.5 font-mono text-[0.9375rem] text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t.sending : t.send}
          </button>
          <p className="mt-2 font-serif text-[0.8125rem] leading-snug text-ink-muted">{t.note}</p>
        </form>
      ) : (
        <form onSubmit={verify} noValidate className="mt-4">
          <p className="font-serif text-[0.9375rem] leading-snug text-ink-muted">
            {t.sentTo} <span className="font-mono text-[0.875rem] text-ink">{email}</span>. {t.sentHow}
          </p>
          <label htmlFor="signin-code" className="mt-4 block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
            {t.codeLabel}
          </label>
          <input
            id="signin-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="tnum mt-1 w-full border border-rule-strong bg-paper px-3 py-2.5 font-mono text-[1.125rem] tracking-[0.2em] text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || code.replace(/\D/g, "").length < 6}
            className="mt-3 w-full border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t.verifying : t.verify}
          </button>
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
              setError(null);
            }}
            className="mt-3 w-full font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted underline underline-offset-4 hover:text-accent"
          >
            {t.again}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 font-serif text-[0.875rem] text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
