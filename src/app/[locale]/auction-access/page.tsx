import type { Metadata } from "next";
import { formatMoney } from "@/lib/finance";
import { loadDealer } from "@/lib/dealer-store";
import { OPERATING_DEALER_ID, serviceBlockReason } from "@/lib/dealers";
import { AUCTION_ACCESS_FEE_CENTS } from "@/lib/auction-access";
import { AuctionAccessCheckout } from "@/components/privy-deferred";
import { getDictionary, isLocale } from "@/i18n";
import { notFound } from "next/navigation";

/**
 * Auction Access — the brokerage product.
 *
 * A service price, not credit. It states a one-off fee and nothing else about
 * money: no down payment, no periodic payment, no number of payments, no
 * finance charge. None of those are stated, so no Reg Z advertising trigger
 * term is tripped and this page carries no <RegZDisclosure />. That is the
 * component contract working, not an exemption — put a monthly figure on this
 * page and the disclosure has to come with it.
 */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(isLocale(locale) ? locale : "es");
  return { title: t.auction.metaTitle, description: t.auction.metaDescription };
}

export default async function AuctionAccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  const dealer = await loadDealer(OPERATING_DEALER_ID);
  const dealerName = dealer?.dbaName ?? dealer?.legalName ?? "MGM Autobroker";
  const address = dealer?.streetAddress
    ? `${dealer.streetAddress}, ${dealer.city}, ${dealer.state}${
        dealer.postalCode ? ` ${dealer.postalCode}` : ""
      }`
    : undefined;
  // Service gate, not the credit one — see the checkout route.
  const blockReason = dealer ? serviceBlockReason(dealer) : "No dealer is configured.";

  return (
    <main>
      {/* ------------------------------------------------------------ hero */}
      <section className="border-b border-rule-strong">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-accent">
            {dealerName} · {t.auction.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
            {t.auction.title1}
            <br />
            <span className="text-accent">{t.auction.title2}</span>
          </h1>
          <p className="mt-4 max-w-2xl font-serif text-lg leading-snug text-ink-muted">
            {t.auction.lede(formatMoney(AUCTION_ACCESS_FEE_CENTS))}
          </p>

          <div className="mt-8 max-w-xl border border-rule-strong bg-paper-raised">
            {/* Auction marks are used with the permission the operator holds.
                Keep that permission on file for EACH house — a licence to BID
                at Copart or ADESA is not a licence to use their trademark, and
                the two are granted separately by different parties. If a
                permission lapses, drop that logo and leave the plain text,
                which is a factual statement and needs nobody's consent. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule bg-paper-sunken px-4 py-2.5">
              <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-muted">
                {t.auction.licensedToBid}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/adesa.png"
                alt="ADESA"
                width={467}
                height={211}
                className="h-4 w-auto"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/copart.svg" alt="Copart" width={140} height={53} className="h-4 w-auto" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/manheim.svg" alt="Manheim" width={167} height={167} className="h-4 w-auto" />
            </div>
            <div className="px-4 py-4">
              <p className="tnum font-display text-4xl font-extrabold leading-none tracking-tight text-brass">
                {formatMoney(AUCTION_ACCESS_FEE_CENTS)}
              </p>
              <p className="mt-1 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
                {t.auction.oneOff}
              </p>

              <div className="mt-4">
                {blockReason ? (
                  <p className="border-l-2 border-accent bg-paper-sunken px-3 py-2 font-serif text-[0.875rem] leading-snug text-ink-muted">
                    {blockReason} {t.auction.blockedTail}
                  </p>
                ) : (
                  <AuctionAccessCheckout
                    feeCents={AUCTION_ACCESS_FEE_CENTS}
                    address={address}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- what/what not */}
      <section className="border-b border-rule-strong bg-paper-sunken">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                {t.auction.covers}
              </h2>
              <ul className="mt-4 space-y-2">
                {t.auction.includes.map((item) => (
                  <li
                    key={item}
                    className="border-l-2 border-accent pl-3 font-serif text-[0.9375rem] leading-snug text-ink-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold tracking-tight">
                {t.auction.doesnt}
              </h2>
              <ul className="mt-4 space-y-2">
                {t.auction.excludes.map((item) => (
                  <li
                    key={item}
                    className="border-l-2 border-rule pl-3 font-serif text-[0.9375rem] leading-snug text-ink-muted"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-serif text-[0.8125rem] leading-snug text-ink-muted">
                {t.auction.eitherWay}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- office */}
      {address && (
        <section className="border-t border-rule-strong">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <div className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:items-start">
              <div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight">
                  {t.auction.inPerson}
                </h2>
                <p className="mt-3 font-serif text-[0.9375rem] leading-snug text-ink-muted">
                  {t.auction.inPersonLede}
                </p>
                <address className="mt-5 not-italic">
                  <p className="font-display text-lg font-bold tracking-tight">
                    {dealerName}
                  </p>
                  <p className="font-mono text-[0.875rem] leading-relaxed text-ink-muted">
                    {dealer?.streetAddress}
                    <br />
                    {dealer?.city}, {dealer?.state} {dealer?.postalCode}
                  </p>
                </address>
                <p className="mt-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] underline underline-offset-4 hover:text-accent"
                  >
                    {t.auction.openInMaps}
                  </a>
                </p>
              </div>

              {/* Keyless embed: the `output=embed` form needs no Maps API key,
                  so there is no secret to leak and nothing to bill. Lazy so it
                  costs nothing on a phone that never scrolls this far. */}
              <div className="border border-rule-strong bg-paper-raised">
                <iframe
                  title={`Map to ${dealerName}, ${address}`}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-[4/3] w-full border-0"
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
