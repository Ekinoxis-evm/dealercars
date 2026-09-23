"use client";

import { useAuth } from "./AuthProvider";

/**
 * The sign-in and not-an-admin states every admin screen shares.
 *
 * Renders the children only once the session is known and the person is signed in;
 * the screen itself finds out whether they are an admin from the first API
 * call and hands `forbidden` back here.
 */
export function AdminGate({
  forbidden,
  children,
}: {
  /** Kept for call-site readability; the sign-in itself lives in AdminShell. */
  what?: string;
  forbidden: boolean;
  children: React.ReactNode;
}) {
  const { ready, user } = useAuth();
  const authenticated = user !== null;

  // Signed-out visitors never reach this: AdminShell shows the sign-in
  // instead of the page. This only decides between "checking" and "no".
  if (!ready || !authenticated) {
    return <p className="font-serif text-ink-muted">Loading&hellip;</p>;
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
