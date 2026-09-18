import Link from "next/link";
import type { Dictionary, Locale } from "@/i18n";
import { LOCALES, LOCALE_LABEL, localePath } from "@/i18n";

export function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const p = (path: string) => localePath(locale, path);

  return (
    <header className="border-b border-rule-strong bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={p("/")} className="flex items-center" aria-label={dict.nav.home}>
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

        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href={p("/cars")}
            className="font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            {dict.nav.cars}
          </Link>
          <Link
            href={p("/auction-access")}
            className="hidden font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-muted underline-offset-4 hover:text-ink hover:underline sm:inline"
          >
            {dict.nav.auctionAccess}
          </Link>

          <LanguageSwitch locale={locale} />

          <Link
            href={p("/account")}
            className="border border-rule-strong bg-paper-raised px-3 py-1.5 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent"
          >
            {dict.nav.account}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * The language switch.
 *
 * Plain links, no JavaScript. Each is a real URL in the other language, so it
 * works before hydration, opens in a new tab, and tells a crawler the two pages
 * are the same content in two languages.
 *
 * It links to the other language's HOME rather than translating the current
 * path. Doing that properly means mapping every route — and on a car page, the
 * id with it — which is a table this does not have yet. Sending somebody to the
 * Spanish home page is honest; sending them to a 404 because the path did not
 * translate is not.
 */
function LanguageSwitch({ locale }: { locale: Locale }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Language">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Link
            key={code}
            href={localePath(code, "/")}
            hrefLang={code}
            aria-current={active ? "true" : undefined}
            title={LOCALE_LABEL[code]}
            className={`border px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] ${
              active
                ? "border-accent bg-accent text-accent-ink"
                : "border-rule-strong bg-paper text-ink-muted hover:text-ink"
            }`}
          >
            {code}
          </Link>
        );
      })}
    </div>
  );
}
