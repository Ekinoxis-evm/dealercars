/**
 * Two languages, Spanish first.
 *
 * Not a nicety. The buyers this lot sells to are largely Spanish-speaking, and
 * the operator's own marketing is written in Spanish — so Spanish is the
 * default and English is the alternate, rather than the other way round.
 *
 * One consequence is load-bearing rather than editorial: Regulation Z requires
 * the credit disclosure to be clear and conspicuous, and a disclosure the
 * reader cannot read is neither. An advertisement stating "$4,000 de entrada ·
 * $245/mes" therefore has to carry its APR, terms of repayment and total of
 * payments in Spanish too. `RegZDisclosure` is translated for that reason, and
 * a trigger term must never appear in one language beside a disclosure in the
 * other.
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Spanish leads. A visitor whose browser asks for English still gets English. */
export const DEFAULT_LOCALE: Locale = "es";

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (LOCALES as readonly string[]).includes(value);
}

/** Human label for the language switch, in its own language. */
export const LOCALE_LABEL: Record<Locale, string> = {
  es: "Español",
  en: "English",
};

/** What goes in the <html lang> attribute. */
export const HTML_LANG: Record<Locale, string> = {
  es: "es-US",
  en: "en-US",
};

/**
 * Pick a locale from an Accept-Language header.
 *
 * Deliberately crude: it checks whether English is preferred over Spanish and
 * nothing more. A full q-value negotiation would be more correct and would
 * change the answer for nobody, because there are only two options and the
 * fallback is the one most visitors want anyway.
 */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const first = header
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase())
    .find((tag) => tag.startsWith("es") || tag.startsWith("en"));
  return first?.startsWith("en") ? "en" : DEFAULT_LOCALE;
}
