"use client";

import { createContext, useContext, useMemo } from "react";
import type { Dictionary } from "./en";
import type { Locale } from "./config";
import { getDictionary } from "./index";

/**
 * Copy for client components.
 *
 * Server components take the dictionary as an argument, which is the simple
 * case. Client components are the awkward one: `PlanPicker`, `VisitScheduler`
 * and the rest sit several levels below a page, and
 * threading a `dict` prop through every one of them would put translation
 * plumbing in signatures that are otherwise about cars and money.
 *
 * So the locale layout provides it once and they read it here.
 *
 * The provider takes a LOCALE, not a dictionary, and looks the copy up itself.
 * That is not a style preference: the dictionary holds functions — plural
 * forms, interpolations like `allCars(n)` — and functions cannot be passed from
 * a server component to a client one. Handing the dictionary across as a prop
 * fails the build with "Functions cannot be passed directly to Client
 * Components". A locale is a string, and the dictionaries are static modules
 * the browser can import for itself.
 */
const I18nContext = createContext<{ dict: Dictionary; locale: Locale } | null>(
  null
);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ dict: getDictionary(locale), locale }),
    [locale]
  );
  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): { dict: Dictionary; locale: Locale } {
  const value = useContext(I18nContext);
  if (!value) {
    // Loud rather than falling back to English. A component rendering English
    // copy beside Spanish trigger terms is exactly the Reg Z problem the
    // translated disclosure exists to prevent, and a silent default would hide
    // it until somebody read the page.
    throw new Error(
      "useI18n() outside an I18nProvider — the component is rendering outside the [locale] layout."
    );
  }
  return value;
}
