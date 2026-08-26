import { amortize, formatBps, formatMoney } from "@/lib/finance";
import { DEFAULT_TERMS } from "@/lib/types";

/**
 * Site footer. Carries the representative-example credit disclosure required
 * wherever payment advertising appears, plus the licensed-partner-dealer
 * statement. The example is computed, not typed, so it can never drift from
 * the math the product actually uses.
 */
export function SiteFooter() {
  // The canonical deal: 2019 Corolla LE, $12,635 out the door, $2,500 down,
  // $10,135 financed at 22.0% APR for 36 months.
  const rep = amortize(1013500, DEFAULT_TERMS.aprBps, DEFAULT_TERMS.termMonths);

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
            2019 Toyota Corolla LE, 71,480 miles. Out-the-door price{" "}
            {formatMoney(1263500)} including tax, title, registration, and doc
            fee. {formatMoney(250000)} cash down; amount financed{" "}
            {formatMoney(rep.amountFinancedCents)}; annual percentage rate{" "}
            {formatBps(rep.aprBps)}; {rep.termMonths} monthly payments of{" "}
            {formatMoney(rep.monthlyPaymentCents, { cents: true })}; total of
            payments {formatMoney(rep.totalOfPaymentsCents, { cents: true })};
            finance charge {formatMoney(rep.financeChargeCents, { cents: true })}
            . Your terms depend on your verified income, residence, and down
            payment.
          </p>
          <p>
            Financing is provided by a licensed partner dealer, not by
            DealerCars. DealerCars is not a lender, a dealer, or an auction
            house; it verifies budgets and matches them to live wholesale
            inventory. Wholesale auto auctions are open to licensed dealers
            only — the partner dealer places every bid.
          </p>
          <p>
            Vehicle history, condition grade, and announcements are reported as
            received from the auction. All prices in U.S. dollars.
          </p>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-ink-faint">
            © {new Date().getFullYear()} DealerCars · Austin, Texas
          </p>
        </div>
      </div>
    </footer>
  );
}
