import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-paper">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center" aria-label="MGM Auto — home">
          {/* The logo is dark-ground artwork: its silver stroke vanishes on a
              light surface. The plate is a FIXED dark value, not `bg-ink` —
              ink flips to near-white in dark mode, which would put a pale
              plate behind artwork that needs a dark one. It must not follow
              the theme. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/mgm-auto-logo.png"
            alt="MGM Auto"
            width={791}
            height={436}
            className="h-9 w-auto bg-[#14171a] px-2 py-1 sm:h-10"
          />
        </Link>
        <nav className="flex items-baseline gap-4 sm:gap-6">
          <Link
            href="/cars"
            className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Cars
          </Link>
          <Link
            href="/auction-access"
            className="hidden font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-muted underline-offset-4 hover:text-ink hover:underline sm:inline"
          >
            Auction access
          </Link>
          <Link
            href="/account"
            className="border border-rule-strong bg-paper-raised px-3 py-1.5 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent"
          >
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
