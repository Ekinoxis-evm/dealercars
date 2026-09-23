"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useI18n } from "@/i18n/client";

/**
 * One door for every admin screen.
 *
 * Signed out, an admin page shows exactly one thing: a sign-in button. No
 * heading, no tabs, no description of what the screen would let you do —
 * that is content for admins, and whoever is looking is not one yet. Signed
 * in, the page renders and the first admin API call decides whether this
 * person is actually an admin.
 *
 * The sign-in is the same email-and-code login as the rest of the site. There
 * is no separate admin password; access is a row in `admins`.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login } = usePrivy();
  const { dict } = useI18n();

  if (!ready) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="font-serif text-ink-muted">{dict.account.loading}</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 sm:px-6">
        <div className="w-full border border-rule-strong bg-paper-raised px-6 py-8 text-center">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
            MGM Auto
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">
            Admin
          </h1>
          <button
            type="button"
            onClick={login}
            className="mt-6 w-full border border-accent bg-accent px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-accent-ink hover:opacity-90"
          >
            {dict.account.signIn}
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
