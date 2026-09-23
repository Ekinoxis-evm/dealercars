"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/finance";
import { dollarsToCents } from "@/lib/money-input";
import type { AuctionEnquiryPayload } from "@/lib/whatsapp";
import { useI18n } from "@/i18n/client";
import { WhatsAppLink, WhatsAppMark } from "./DealerContact";

/**
 * "Talk to an agent" on the auction-access page: a short questionnaire, then
 * one WhatsApp message with every answer in it.
 *
 * The service has a price and a checkout, and the checkout is not wired to a
 * working Stripe account yet. Rather than tell a visitor that, the page asks
 * the five things an agent needs before the first call — who the car is for,
 * the total budget, what they are after, how they would pay, and when — and
 * puts them in the message. The paid path comes back when Stripe clears; the
 * component that runs it (`AuctionAccessCheckout`) is kept for that day.
 *
 * Money is typed in whole dollars and carried as integer cents. Nothing is
 * computed from it here; it is formatted into the message and nothing else.
 */
export function AuctionEnquiry({ feeCents }: { feeCents: number }) {
  const { dict, locale } = useI18n();
  const t = dict.enquiry;
  const [open, setOpen] = useState(false);
  const [forWhom, setForWhom] = useState<"me" | "dealer" | null>(null);
  const [budget, setBudget] = useState("");
  const [wanted, setWanted] = useState("");
  const [payment, setPayment] = useState<"cash" | "plan" | null>(null);
  const [timing, setTiming] = useState<"week" | "month" | "looking" | null>(null);
  const [name, setName] = useState("");
  const [pageUrl, setPageUrl] = useState(`/${locale}/auction-access`);

  useEffect(() => {
    setPageUrl(window.location.href.split(/[?#]/)[0]);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const budgetCents = dollarsToCents(budget);
  const complete = forWhom !== null && budgetCents !== null && budgetCents > 0 && payment !== null && timing !== null;

  const payload: AuctionEnquiryPayload = {
    kind: "auction",
    enquiry: {
      url: pageUrl,
      feeCents,
      forWhom: forWhom === "dealer" ? t.forDealer : t.forMe,
      budgetCents: budgetCents ?? 0,
      wanted: wanted.trim() || undefined,
      payment: payment === "plan" ? t.payPlan : t.payCash,
      timing: timing === "week" ? t.whenWeek : timing === "month" ? t.whenMonth : t.whenLooking,
      name: name.trim() || undefined,
    },
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
      >
        <WhatsAppMark />
        {dict.contact.talkToAgent}
      </button>
      <p className="mt-2 font-serif text-[0.8125rem] leading-snug text-ink-muted">{t.note}</p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => e.preventDefault()}
            className="max-h-[92vh] w-full overflow-y-auto border-t border-rule-strong bg-paper sm:max-w-lg sm:border"
          >
            <header className="flex items-start justify-between gap-4 border-b border-rule-strong px-4 py-3 sm:px-6">
              <div>
                <h2 id="enquiry-title" className="font-display text-lg font-extrabold tracking-tight">
                  {t.title}
                </h2>
                <p className="mt-0.5 font-serif text-[0.875rem] leading-snug text-ink-muted">{t.lede}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={dict.gallery.close}
                className="shrink-0 border border-rule-strong px-2.5 py-1 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-ink-muted hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </header>

            <div className="space-y-5 px-4 py-4 sm:px-6">
              <Choice
                label={t.forWhomQ}
                value={forWhom}
                onChange={setForWhom}
                options={[
                  { value: "me", label: t.forMe },
                  { value: "dealer", label: t.forDealer },
                ]}
              />

              <div>
                <label htmlFor="enquiry-budget" className={LABEL}>
                  {t.budgetQ}
                </label>
                <div className="mt-1 flex items-baseline border border-rule-strong bg-paper-raised px-3 py-2 focus-within:border-accent">
                  <span className="font-mono text-[0.9375rem] text-ink-faint">$</span>
                  <input
                    id="enquiry-budget"
                    type="text"
                    inputMode="decimal"
                    placeholder="8000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="tnum w-full bg-transparent font-mono text-[1.0625rem] font-semibold text-ink outline-none"
                  />
                </div>
                <p className="mt-1 font-serif text-[0.75rem] text-ink-faint">{t.budgetHint}</p>
              </div>

              <div>
                <label htmlFor="enquiry-wanted" className={LABEL}>
                  {t.wantedQ}
                </label>
                <input
                  id="enquiry-wanted"
                  type="text"
                  placeholder={t.wantedHint}
                  value={wanted}
                  onChange={(e) => setWanted(e.target.value)}
                  className="mt-1 w-full border border-rule-strong bg-paper-raised px-3 py-2 font-serif text-[0.9375rem] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
                />
              </div>

              <Choice
                label={t.paymentQ}
                value={payment}
                onChange={setPayment}
                options={[
                  { value: "cash", label: t.payCash },
                  { value: "plan", label: t.payPlan },
                ]}
              />

              <Choice
                label={t.whenQ}
                value={timing}
                onChange={setTiming}
                options={[
                  { value: "week", label: t.whenWeek },
                  { value: "month", label: t.whenMonth },
                  { value: "looking", label: t.whenLooking },
                ]}
              />

              <div>
                <label htmlFor="enquiry-name" className={LABEL}>
                  {t.nameQ}
                </label>
                <input
                  id="enquiry-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border border-rule-strong bg-paper-raised px-3 py-2 font-serif text-[0.9375rem] text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div className="border-t border-rule pt-4">
                <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
                  {t.feeLine(formatMoney(feeCents))}
                </p>
                {complete ? (
                  <WhatsAppLink
                    payload={payload}
                    className="flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white hover:opacity-90"
                  >
                    {t.send}
                  </WhatsAppLink>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2.5 border border-[#0b7a45] bg-[#128c4a] px-5 py-3 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white opacity-40"
                  >
                    {t.send}
                  </button>
                )}
                {!complete && (
                  <p className="mt-2 text-center font-serif text-[0.8125rem] text-ink-muted">{t.incomplete}</p>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const LABEL =
  "block font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint";

function Choice<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V | null;
  onChange: (v: V) => void;
  options: Array<{ value: V; label: string }>;
}) {
  return (
    <fieldset>
      <legend className={LABEL}>{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`border px-3 py-2 font-mono text-[0.8125rem] ${
                on
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-rule-strong bg-paper-raised text-ink hover:border-accent hover:text-accent"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
