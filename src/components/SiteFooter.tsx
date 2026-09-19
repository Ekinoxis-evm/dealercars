import { formatBps, formatMoney, installmentPlan } from "@/lib/finance";
import type { Dictionary } from "@/i18n";

/**
 * Site footer. Carries the representative-example credit disclosure required
 * wherever payment advertising appears, plus the statement of who the creditor
 * is. The example is computed, not typed, so it can never drift from the math
 * the product actually uses.
 */

/**
 * The representative example: the Orlando 2014 Mazda3 at $12,831.70 out the
 * door in Orange County, $4,000 down over 36 interest-free months. The same
 * specimen the front page leads with, and the same one the finance tests pin.
 */
const REP_OTD_CENTS = 12_831_70;
const REP_DOWN_CENTS = 4_000_00;

export function SiteFooter({ dict }: { dict: Dictionary }) {
  const rep = installmentPlan(REP_OTD_CENTS, REP_DOWN_CENTS, 36);

  return (
    <footer className="border-t border-rule-strong bg-paper-sunken">
      {/* Extra bottom padding clears the fixed contact button. The last thing
          in this footer is a Reg Z representative example, and a floating
          control sitting on top of a disclosure is the disclosure not being
          clear and conspicuous. */}
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6">
        <p className="font-display text-sm font-bold uppercase tracking-tight">
          MGM<span className="text-accent"> Auto</span>
        </p>

        <div className="mt-6 space-y-4 border-t border-rule pt-6 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
          {/* The representative example is a Regulation Z disclosure, so it is
              translated with the rest of the page. A disclosure the reader
              cannot read is not clear and conspicuous — and the figures inside
              it are formatted from the real plan, never restated in copy, so a
              translation cannot change a number. */}
          <p className="tnum">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              {dict.footer.repLabel}&nbsp;·&nbsp;
            </span>
            {dict.footer.repBody({
              otd: formatMoney(REP_OTD_CENTS, { cents: true }),
              down: formatMoney(rep.downCents),
              financed: formatMoney(rep.amountFinancedCents, { cents: true }),
              apr: formatBps(rep.aprBps),
              n: rep.termMonths - 1,
              monthly: formatMoney(rep.monthlyPaymentCents, { cents: true }),
              final: formatMoney(rep.finalPaymentCents, { cents: true }),
              total: formatMoney(rep.totalOfPaymentsCents, { cents: true }),
              charge: formatMoney(rep.financeChargeCents, { cents: true }),
            })}
          </p>
          <p>{dict.footer.creditor}</p>
          <p>{dict.footer.reported}</p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
            © {new Date().getFullYear()} MGM Auto · Intercession City, Florida
          </p>
        </div>
      </div>
    </footer>
  );
}
