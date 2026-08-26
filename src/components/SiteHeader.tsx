import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-paper">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-extrabold uppercase tracking-tight text-ink"
        >
          Dealer<span className="text-accent">Cars</span>
        </Link>
        <nav className="flex items-baseline gap-4 sm:gap-6">
          <Link
            href="/drop"
            className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Monday drop
          </Link>
          <Link
            href="/#waitlist"
            className="border border-rule-strong bg-paper-raised px-3 py-1.5 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent"
          >
            Join waitlist
          </Link>
        </nav>
      </div>
    </header>
  );
}
