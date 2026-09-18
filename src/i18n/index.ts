import { en, type Dictionary } from "./en";
import { es } from "./es";
import type { Locale } from "./config";

export type { Dictionary };
export * from "./config";

const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

/**
 * The copy for one locale.
 *
 * Synchronous and statically imported rather than a dynamic `import()` per
 * request. Both dictionaries together are a few kilobytes, and the async
 * version buys a split that would be paid back on the first render while
 * costing every server component an await.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

/** Prefix a path with the locale: `/cars` → `/es/cars`. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}
