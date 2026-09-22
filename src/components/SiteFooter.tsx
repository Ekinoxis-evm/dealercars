import type { Dictionary } from "@/i18n";
import type { Dealer } from "@/lib/dealers";
import { WaitlistForm } from "./WaitlistForm";
import { WhatsAppLink } from "./DealerContact";

/**
 * Site footer: the subscription, where to find us, and one sentence about who
 * the creditor is.
 *
 * The representative example that used to live here is gone. It was a Reg Z
 * disclosure for trigger terms the front page no longer states; every surface
 * that still states one — the plan builder — carries its own `<RegZDisclosure>`
 * beside the figures, which is where a disclosure has to be to be clear and
 * conspicuous anyway. The creditor sentence stays because every consumer-facing
 * surface names the creditor, and the footer is on every page.
 */
export function SiteFooter({
  dict,
  dealer,
}: {
  dict: Dictionary;
  dealer?: Dealer;
}) {
  // Off the dealer row, so a new handle is an admin edit rather than a deploy.
  // Whichever are unset are simply absent — never a dead link. WhatsApp is
  // the same row, read by the link component through context.
  const social = (
    [
      { id: "instagram", label: "Instagram", href: dealer?.instagramUrl },
      { id: "facebook", label: "Facebook", href: dealer?.facebookUrl },
      { id: "tiktok", label: "TikTok", href: dealer?.tiktokUrl },
    ] as const
  ).filter((s): s is typeof s & { href: string } => !!s.href);

  return (
    <footer className="border-t border-rule-strong bg-paper-sunken">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          {/* ---------------------------------------------- subscription */}
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {dict.waitlist.title}
            </h2>
            <p className="mt-2 max-w-xl font-serif text-[0.9375rem] leading-relaxed text-ink-muted">
              {dict.waitlist.lede}
            </p>
            <div className="mt-5">
              <WaitlistForm />
            </div>
          </div>

          {/* ---------------------------------------------------- social */}
          <div>
            <p className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              {dict.footer.follow}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {social.map((s) => (
                <li key={s.id}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-rule-strong bg-paper-raised px-3 py-2 font-mono text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink hover:border-accent hover:text-accent"
                  >
                    <SocialMark id={s.id} />
                    {s.label}
                  </a>
                </li>
              ))}
              <li>
                <WhatsAppLink
                  payload={{ kind: "general", url: "" }}
                  className="inline-flex items-center gap-2 border border-[#0b7a45] bg-[#128c4a] px-3 py-2 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
                >
                  {dict.contact.whatsapp}
                </WhatsAppLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-rule pt-5">
          <p className="font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
            {dict.footer.creditor}
          </p>
          <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
            © {new Date().getFullYear()} MGM Auto · Intercession City, Florida
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Simple monochrome marks. Drawn inline: three 16px glyphs are not worth a request each. */
function SocialMark({ id }: { id: "instagram" | "facebook" | "tiktok" }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "currentColor",
    "aria-hidden": true,
    className: "shrink-0",
  } as const;
  switch (id) {
    case "instagram":
      return (
        <svg {...common}>
          <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0-2.2C8.7 0 8.3 0 7.1.1 5.8.1 4.9.3 4.1.6c-.8.3-1.5.7-2.1 1.4C1.3 2.6.9 3.3.6 4.1.3 4.9.1 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.3 2.2.6 2.9.3.8.7 1.5 1.4 2.1.6.7 1.3 1.1 2.1 1.4.8.3 1.6.5 2.9.6 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.2-.3 2.9-.6.8-.3 1.5-.7 2.1-1.4.7-.6 1.1-1.3 1.4-2.1.3-.8.5-1.6.6-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.3-2.2-.6-2.9-.3-.8-.7-1.5-1.4-2.1-.6-.7-1.3-1.1-2.1-1.4-.8-.3-1.6-.5-2.9-.6C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23.1 10.1 24v-8.4H7.1v-3.5h3v-2.7c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.3l-.5 3.5h-2.8V24C19.6 23.1 24 18.1 24 12.1z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M19.6 5.3a4.8 4.8 0 0 1-3.8-4.3V.5h-3.5v14.1a3 3 0 1 1-2-2.8V8.2a6.5 6.5 0 1 0 5.5 6.4V8.1a8.2 8.2 0 0 0 4.8 1.5V6.1a4.8 4.8 0 0 1-1-.8z" />
        </svg>
      );
  }
}
