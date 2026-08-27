import type { AmortizedLoan, Money, PaymentPlan } from "@/lib/types";
import { formatBps, formatMoney } from "@/lib/finance";

/**
 * Regulation Z (12 CFR 1026.24) advertising disclosure.
 *
 * A stated down payment or monthly payment amount is a trigger term. Any
 * surface that shows one must also state — in the same creative — the APR,
 * the terms of repayment, and the total of payments. This component IS that
 * statement. It ships wherever a trigger term appears; it is part of the
 * component contract, not fine print to be added later.
 *
 * A zero rate does NOT remove the obligation. An interest-free plan payable in
 * more than four installments is still a credit sale (12 CFR 1026.2(a)(17)),
 * "$4,000 down" and "$245/month" are still trigger terms, and the APR that has
 * to be stated is 0.00%. The disclosure gets better, not optional.
 *
 * Accepts either a plan (the interest-free product) or an amortized loan (the
 * auction path, which still carries a rate).
 */
type Props = { className?: string } & (
  | { plan: PaymentPlan; loan?: never; downCents?: never }
  | { loan: AmortizedLoan; downCents: Money; plan?: never }
);

export function RegZDisclosure(props: Props) {
  const className = props.className ?? "";

  // A cash price states no down payment and no periodic payment, so it trips
  // no trigger term and Reg Z advertising disclosure does not attach.
  if (props.plan && props.plan.kind === "cash") return null;

  const terms = props.plan
    ? planTerms(props.plan)
    : loanTerms(props.downCents, props.loan);

  return (
    <p
      className={`tnum border-t border-rule pt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted ${className}`}
    >
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        Credit terms&nbsp;·&nbsp;
      </span>
      {terms} Financing provided by a licensed partner dealer, not by
      DealerCars. Subject to verification of income, residence, and down
      payment.
    </p>
  );
}

/** The interest-free product. The final payment differs by a few cents. */
function planTerms(plan: PaymentPlan): string {
  const repayment =
    plan.finalPaymentCents === plan.monthlyPaymentCents
      ? `${plan.termMonths} monthly payments of ${formatMoney(plan.monthlyPaymentCents, { cents: true })}`
      : `${plan.termMonths - 1} monthly payments of ${formatMoney(
          plan.monthlyPaymentCents,
          { cents: true }
        )} and a final payment of ${formatMoney(plan.finalPaymentCents, {
          cents: true,
        })}`;

  const financeCharge =
    plan.financeChargeCents === 0
      ? "no finance charge"
      : `finance charge ${formatMoney(plan.financeChargeCents, { cents: true })}`;

  return (
    `${formatMoney(plan.downCents)} cash down; annual percentage rate ` +
    `${formatBps(plan.aprBps)}; ${repayment}; total of payments ` +
    `${formatMoney(plan.totalOfPaymentsCents, { cents: true })}; ${financeCharge}.`
  );
}

/** The auction path, which still carries a rate. */
function loanTerms(downCents: Money, loan: AmortizedLoan): string {
  return (
    `${formatMoney(downCents)} cash down; annual percentage rate ` +
    `${formatBps(loan.aprBps)}; ${loan.termMonths} monthly payments of ` +
    `${formatMoney(loan.monthlyPaymentCents, { cents: true })}; total of ` +
    `payments ${formatMoney(loan.totalOfPaymentsCents, { cents: true })}.`
  );
}
