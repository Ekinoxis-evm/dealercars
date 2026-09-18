import type { Metadata } from "next";
import { ProfileForm } from "@/components/privy-deferred";

export const metadata: Metadata = {
  title: "Your account — DealerCars",
  description:
    "Your details and your budget. Underwriting here is capacity, not credit score.",
};

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Your account
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your file
        </h1>
        <p className="mt-2 max-w-prose font-serif text-lg leading-relaxed text-ink-muted">
          We never ask for a credit score. What matters is what you earn, what
          you can put down, and whether the payment leaves room for a bad month.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        <ProfileForm />
      </div>
    </main>
  );
}
