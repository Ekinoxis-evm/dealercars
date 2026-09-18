import type { Metadata } from "next";
import Link from "next/link";
import { AdminCarEditor } from "@/components/privy-deferred";

export const metadata: Metadata = {
  title: "Edit car — DealerCars",
  robots: { index: false, follow: false },
};

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Admin &middot; Inventory
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Edit car
        </h1>
        <p className="tnum mt-1 font-mono text-[0.8125rem] text-ink-muted">
          {id}
          {" · "}
          <Link href={`/cars/${id}`} className="underline">
            view the public page
          </Link>
        </p>
      </header>

      <div className="mt-8">
        <AdminCarEditor listingId={id} />
      </div>
    </main>
  );
}
