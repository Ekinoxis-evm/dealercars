import type { Metadata } from "next";
import { AdminInventory } from "@/components/AdminInventory";
import { AdminNav } from "@/components/AdminNav";

export const metadata: Metadata = {
  title: "Inventory — MGM Auto admin",
  // The lot is not something a search engine should be indexing: it carries
  // acquisition targets and cars we have not bought.
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Admin
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Inventory
        </h1>
        <p className="mt-1 font-serif text-lg text-ink-muted">
          Every car we have sourced, bought, or sold.
        </p>
        <AdminNav current="/admin" />
      </header>

      <div className="mt-8">
        <AdminInventory />
      </div>
    </main>
  );
}
