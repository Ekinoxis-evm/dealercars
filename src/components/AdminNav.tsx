import Link from "next/link";

/**
 * The admin sections. Plain links, bare paths: the middleware adds the
 * locale, and admin copy is not translated anyway.
 */
const SECTIONS = [
  { href: "/admin", label: "Inventory" },
  { href: "/admin/dealer", label: "Dealer" },
  { href: "/admin/admins", label: "Admins" },
] as const;

export function AdminNav({ current }: { current: (typeof SECTIONS)[number]["href"] }) {
  return (
    <nav aria-label="Admin sections" className="mt-4 flex flex-wrap gap-2">
      {SECTIONS.map((s) => (
        <Link
          key={s.href}
          href={s.href}
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
