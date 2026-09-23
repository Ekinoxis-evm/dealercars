import type { Metadata } from "next";
import { AdminCarEditor } from "@/components/AdminCarEditor";

export const metadata: Metadata = {
  title: "Add a car — MGM Auto admin",
  robots: { index: false, follow: false },
};

export default function NewCarPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Admin &middot; Inventory
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Add a car
        </h1>
        <p className="mt-1 font-serif text-lg text-ink-muted">
          It starts as sourced. Nobody can pay for it until we own it.
        </p>
      </header>

      <div className="mt-8">
        <AdminCarEditor />
      </div>
    </main>
  );
}
