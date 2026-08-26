import type { AmortizedLoan, Money } from "@/lib/types";
import { formatBps, formatMoney } from "@/lib/finance";

/**
 * Regulation Z (12 CFR 1026.24) advertising disclosure.
 *
 * A stated down payment or monthly payment amount is a trigger term. Any
 * surface that shows one must also state — in the same creative — the APR,
 * the terms of repayment, and the total of payments. This component IS that
 * statement. It ships wherever a trigger term appears; it is part of the
 * component contract, not fine print to be added later.
 */
export function RegZDisclosure({
  downCents,
  loan,
  className = "",
}: {
  downCents: Money;
  loan: AmortizedLoan;
  className?: string;
}) {
  return (
    <p
      className={`tnum border-t border-rule pt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted ${className}`}
    >
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        Credit terms&nbsp;·&nbsp;
      </span>
      {formatMoney(downCents)} cash down; annual percentage rate{" "}
      {formatBps(loan.aprBps)}; {loan.termMonths} monthly payments of{" "}
      {formatMoney(loan.monthlyPaymentCents, { cents: true })}; total of
      payments {formatMoney(loan.totalOfPaymentsCents, { cents: true })}.
      Financing provided by a licensed partner dealer, not by DealerCars.
      Subject to verification of income, residence, and down payment.
    </p>
  );
}
