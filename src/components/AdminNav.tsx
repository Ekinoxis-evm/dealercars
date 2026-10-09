"use client";

import Link from "next/link";
import { useAdminHref } from "./AdminBase";

/**
 * The admin sections, relative to wherever the admin is rooted (see
 * AdminBase). Off the admin host the middleware adds the locale; admin copy is
 * not translated anyway.
 */
const SECTIONS = [
  { href: "/", label: "Inventory" },
  { href: "/dealer", label: "Dealer" },
  { href: "/admins", label: "Admins" },
] as const;

export function AdminNav({ current }: { current: (typeof SECTIONS)[number]["href"] }) {
  const adminHref = useAdminHref();
  return (
    <nav aria-label="Admin sections" className="mt-4 flex flex-wrap gap-2">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={adminHref(s.href)}
          aria-current={s.href === current ? "page" : undefined}
          className={`border px-3 py-1.5 font-mono text-[0.75rem] font-medium uppercase tracking-[0.08em] ${
            s.href === current
              ? "border-accent bg-accent text-accent-ink"
              : "border-rule-strong bg-paper-raised text-ink-muted hover:text-ink"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
