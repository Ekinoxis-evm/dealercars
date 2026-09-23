import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/components/privy-deferred";
import { getDictionary, isLocale } from "@/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "es");
  return { title: t.account.metaTitle, description: t.account.lede, robots: { index: false } };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="border-b border-rule-strong pb-6">
        <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-ink-faint">
          {t.account.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          {t.account.title}
        </h1>
        <p className="mt-2 max-w-prose font-serif text-lg leading-relaxed text-ink-muted">
          {t.account.lede}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        <ProfileForm />
      </div>
    </main>
  );
}
