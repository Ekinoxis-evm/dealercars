"use client";

import type { PaymentPlan } from "@/lib/types";
import { formatBps, formatMoney } from "@/lib/finance";
import { useI18n } from "@/i18n/client";
import type { Dictionary } from "@/i18n";

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
 * "$4,000 de entrada" and "$245/mes" are still trigger terms, and the APR that
 * has to be stated is 0.00%. The disclosure gets better, not optional.
 *
 * IT IS TRANSLATED, and that is a compliance property rather than a courtesy.
 * The disclosure must be clear and conspicuous, and one a reader cannot read is
 * neither — so a page advertising in Spanish carries its credit terms in
 * Spanish. The figures are formatted from the plan itself and never restated in
 * copy, so no translation can change a number.
 *
 * Note what is NOT a trigger term: an out-the-door cash price, and the APR on
 * its own. That is deliberate headroom, and the inventory cards rely on it —
 * they state a price and "0% APR" and nothing that triggers this block. Put a
 * monthly figure on a card and this component has to ride along with it.
 */
export function RegZDisclosure({
  plan,
  className = "",
}: {
  plan: PaymentPlan;
  className?: string;
}) {
  const { dict } = useI18n();

  // A cash price states no down payment and no periodic payment, so it trips
  // no trigger term and Reg Z advertising disclosure does not attach.
  if (plan.kind === "cash") return null;

  return (
    <p
      className={`tnum border-t border-rule pt-2 font-serif text-[0.8125rem] leading-relaxed text-ink-muted ${className}`}
    >
      <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
        {dict.regZ.label}&nbsp;·&nbsp;
      </span>
      {planTerms(plan, dict)} {dict.regZ.creditor}
    </p>
  );
}

/** The interest-free product. The final payment differs by a few cents. */
function planTerms(plan: PaymentPlan, dict: Dictionary): string {
  const t = dict.regZ;
  const money = (cents: number) => formatMoney(cents, { cents: true });

  const repayment =
    plan.finalPaymentCents === plan.monthlyPaymentCents
      ? `${t.monthlyPaymentsOf(plan.termMonths)} ${money(plan.monthlyPaymentCents)}`
      : `${t.monthlyPaymentsOf(plan.termMonths - 1)} ${money(
          plan.monthlyPaymentCents
        )} ${t.andFinalPayment} ${money(plan.finalPaymentCents)}`;

  const financeCharge =
    plan.financeChargeCents === 0
      ? t.noFinanceCharge
      : `${t.financeCharge} ${money(plan.financeChargeCents)}`;

  return (
    `${formatMoney(plan.downCents)} ${t.cashDown}; ${t.apr} ` +
    `${formatBps(plan.aprBps)}; ${repayment}; ${t.totalOfPayments} ` +
    `${money(plan.totalOfPaymentsCents)}; ${financeCharge}.`
  );
}
