"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { contactMessage, whatsappUrl } from "@/lib/whatsapp";
import { useQuote } from "./quote-context";

/**
 * The contact button, on every page.
 *
 * Fixed to the bottom because it is the one thing a member on a lot, on a
 * phone, in the rain, needs to be able to hit. It carries whatever quote is on
 * screen into WhatsApp, so the conversation opens with the car and the payment
 * rather than with "hi".
 *
 * It renders nothing when the dealer has no number on file. A contact button
 * that opens an empty chat is worse than no button, because it looks like the
 * business answered and then did not.
 */
export function ContactButton({ whatsapp }: { whatsapp?: string }) {
  const { dict } = useI18n();
  const quote = useQuote();
  const pathname = usePathname();

  if (!whatsapp) return null;

  // The origin is only known in the browser, and this component is only ever
  // rendered there. Falling back to the path keeps the message useful if it is
  // somehow composed before hydration.
  const here =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathname}`
      : pathname;

  const payload = quote ?? { kind: "general" as const, url: here };
  const href = whatsappUrl(whatsapp, contactMessage(payload, dict.contact));
  if (!href) return null;

  const labelled = payload.kind !== "general";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto flex items-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white shadow-lg transition-opacity hover:opacity-90"
      >
        <WhatsAppMark />
        {labelled ? dict.contact.buttonWithQuote : dict.contact.button}
      </a>
    </div>
  );
}

/**
 * WhatsApp's glyph, inline.
 *
 * Drawn rather than fetched: an external image would need a CDN round-trip for
 * a 20px mark, and WhatsApp's brand assets are not ours to rehost. The button
 * is deliberately WhatsApp green rather than the site accent — this is the one
 * control whose job is to be recognised instantly, and recognition here comes
 * from the platform's colour, not ours.
 */
function WhatsAppMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.8 11.8 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
    </svg>
  );
}
