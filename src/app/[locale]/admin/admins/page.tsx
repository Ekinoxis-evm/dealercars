import type { Metadata } from "next";
import { AdminAdmins } from "@/components/privy-deferred";
import { AdminNav } from "@/components/AdminNav";

export const metadata: Metadata = {
  title: "Admins — MGM Auto admin",
  robots: { index: false, follow: false },
};

export default function AdminAdminsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Admins
        </h1>
        <p className="mt-1 font-serif text-lg text-ink-muted">
          Who can edit the lot and the dealer. Added by email, active on first sign-in.
        </p>
        <AdminNav current="/admin/admins" />
      </header>
      <div className="mt-8">
        <AdminAdmins />
      </div>
    </main>
  );
}
