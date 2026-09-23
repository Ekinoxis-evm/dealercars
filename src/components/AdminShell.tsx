"use client";

import { useAuth } from "./AuthProvider";
import { SignIn } from "./SignIn";
import { useI18n } from "@/i18n/client";

/**
 * One door for every admin screen.
 *
 * Signed out, an admin page shows exactly one thing: the sign-in form. No
 * heading, no tabs, no description of what the screen would let you do —
 * that is content for admins, and whoever is looking is not one yet. Signed
 * in, the page renders and the first admin API call decides whether this
 * person is actually an admin.
 *
 * The sign-in is the same email-and-code login as the rest of the site. There
 * is no separate admin password; access is a row in `admins`.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();
  const { dict } = useI18n();

  if (!ready) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <p className="font-serif text-ink-muted">{dict.account.loading}</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 sm:px-6">
        <SignIn title="Admin" />
      </main>
    );
  }

  return <>{children}</>;
}
