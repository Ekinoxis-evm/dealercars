import { formatBps, formatMoney, installmentPlan } from "@/lib/finance";

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

export function SiteFooter() {
  const rep = installmentPlan(REP_OTD_CENTS, REP_DOWN_CENTS, 36);

  return (
    <footer className="border-t border-rule-strong bg-paper-sunken">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="font-display text-sm font-bold uppercase tracking-tight">
          Dealer<span className="text-accent">Cars</span>
        </p>

        <div className="mt-6 space-y-4 border-t border-rule pt-6 font-serif text-[0.8125rem] leading-relaxed text-ink-muted">
          <p className="tnum">
            <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Representative example&nbsp;·&nbsp;
            </span>
            2014 Mazda3, 69,000 miles, Orange County, Florida. Out-the-door
            price {formatMoney(REP_OTD_CENTS, { cents: true })} including tax,
            title, registration, and doc fee. {formatMoney(rep.downCents)} cash
            down; amount financed{" "}
            {formatMoney(rep.amountFinancedCents, { cents: true })}; annual
            percentage rate {formatBps(rep.aprBps)}; {rep.termMonths - 1}{" "}
            monthly payments of{" "}
            {formatMoney(rep.monthlyPaymentCents, { cents: true })} and a final
            payment of {formatMoney(rep.finalPaymentCents, { cents: true })};
            total of payments{" "}
            {formatMoney(rep.totalOfPaymentsCents, { cents: true })}; finance
            charge {formatMoney(rep.financeChargeCents, { cents: true })}. Your
            terms depend on your verified income, residence, and down payment.
          </p>
          <p>
            DealerCars is the seller and the creditor on every vehicle it
            lists: a licensed motor vehicle dealer and retail installment
            seller. We buy the cars, we hold the title, and we hold the
            contract. Nothing is sold on to a third-party lender.
          </p>
          <p>
            Vehicle history, mileage, and condition are reported as received
            from the seller and from our own inspection. All prices in U.S.
            dollars.
          </p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
            © {new Date().getFullYear()} DealerCars · Orlando, Florida
          </p>
        </div>
      </div>
    </footer>
  );
}
