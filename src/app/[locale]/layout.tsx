import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Archivo, IBM_Plex_Mono, Source_Serif_4 } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { LOCALES, HTML_LANG, getDictionary, isLocale } from "@/i18n";
import { I18nProvider } from "@/i18n/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ContactButton } from "@/components/ContactButton";
import { QuoteProvider } from "@/components/quote-context";
import { loadDealer } from "@/lib/dealer-store";
import { OPERATING_DEALER_ID } from "@/lib/dealers";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MGM Auto",
  description:
    "Compramos los autos, tenemos el título y llevamos el financiamiento nosotros. Sin intereses.",
};

/**
 * THE root layout, and it sits under `[locale]` on purpose.
 *
 * `<html lang>` has to be correct — it is what a screen reader picks a voice
 * from, so Spanish copy announced in an English voice is unintelligible rather
 * than merely mislabelled. A layout above this one cannot know the locale,
 * because a root layout receives no route params; the earlier attempt read a
 * cookie instead, and `cookies()` forces dynamic rendering, which collided with
 * these pages being prerendered and errored the whole tree.
 *
 * Putting the only root layout here solves both: the locale is a param, and
 * every page stays static. The cost is that /admin lives under a locale prefix
 * too. It is operator-only and its copy is not translated — the prefix is just
 * part of its address.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  // The number is a row, not a constant, so a new one is not a redeploy.
  const dealer = await loadDealer(OPERATING_DEALER_ID);

  return (
    <html lang={HTML_LANG[locale]}>
      <body
        className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable} min-h-screen bg-paper text-ink antialiased`}
      >
        <Providers>
          <I18nProvider locale={locale}>
            <QuoteProvider>
              <SiteHeader locale={locale} dict={dict} />
              {children}
              <SiteFooter dict={dict} />
              {/* Sits above the footer on every page, and clears it: the
                  footer gets bottom padding so the fixed button never covers
                  the representative example, which is a disclosure. */}
              <ContactButton whatsapp={dealer?.whatsapp} />
            </QuoteProvider>
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
