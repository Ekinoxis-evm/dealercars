"use client";

import { usePrivy } from "@privy-io/react-auth";

/**
 * The sign-in and not-an-admin states every admin screen shares.
 *
 * Renders the children only once Privy is ready and the person is signed in;
 * the screen itself finds out whether they are an admin from the first API
 * call and hands `forbidden` back here.
 */
export function AdminGate({
  what,
  forbidden,
  children,
}: {
  what: string;
  forbidden: boolean;
  children: React.ReactNode;
}) {
  const { ready, authenticated, login } = usePrivy();

  if (!ready) return <p className="font-serif text-ink-muted">Loading&hellip;</p>;

  if (!authenticated) {
    return (
      <div className="border border-rule-strong bg-paper-raised px-4 py-5 sm:px-6">
        <h2 className="font-display text-lg font-extrabold tracking-tight">
          Sign in to {what}
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          Admin access is granted per person, not by a shared password.
        </p>
        <button
          type="button"
          onClick={login}
          className="mt-4 bg-accent px-4 py-2 font-display text-sm font-bold tracking-tight text-accent-ink"
        >
          Sign in
        </button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="border-l-2 border-accent bg-paper-raised px-4 py-4 sm:px-6">
        <h2 className="font-display text-base font-bold tracking-tight">
          This account is not an admin.
        </h2>
        <p className="mt-1 font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
          An existing admin can add you from the Admins screen by the email you
          sign in with. Make sure you signed in with that address.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
