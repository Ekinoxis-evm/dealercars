# DealerCars — Project Conventions

Buy-to-order financing for Buy-Here-Pay-Here (BHPH) used-car dealers in the US. Next.js 15
App Router / React 19 / TypeScript / Tailwind v4, deployed on Vercel.

Full product spec and architecture: see the DealerCars Blueprint artifact.

## What this is, structurally

We are **software, not a lender**. The partner dealer is the seller and the creditor, holds the
paper, and carries the credit risk. This is not a detail — it is the reason the company does not
need a lending license, and almost every architectural decision descends from it. Do not write
code that puts DealerCars in the position of creditor, servicer-of-record, or holder of funds.

## Hard rules

### Money is integer cents

Every monetary value is an integer count of cents. Never a float, never a string, never dollars.
Format only at the render boundary via `formatMoney()`. A rounding error in a retail installment
contract is a Reg Z problem, not a display bug.

### Never take custody of funds

Stripe Connect with the **dealer as the connected account**. Down payments and installments
settle to the dealer. Funds never rest with us — that is what keeps us out of money transmitter
licensing. Do not "simplify" a payout path in a way that routes money through a DealerCars
balance.

### The TILA disclosure is immutable once signed

Snapshot amount financed, finance charge, APR, total of payments and the full schedule into
`tila_snapshots` at signature. Render every future statement from that snapshot. Never recompute
a signed disclosure from live rows — if a rate field is later edited and a statement silently
changes, the dealer has a Reg Z problem and no way to prove what was disclosed.

### Regulation Z advertising trigger terms

Stating a down payment amount or a monthly payment figure in an advertisement legally obligates
disclosing the APR, the terms of repayment, and the total of payments **in the same creative**.

Every surface that shows "$2,500 down" or "$387/month" must carry `<RegZDisclosure />`. This
includes the landing page, the calculator, every proposal card, and every Meta ad creative. It is
part of the component contract, not fine print to be added before launch.

### Never author a retail installment contract

Use a vendor-maintained, state-specific RISC form (Wolters Kluwer / Bankers Systems or
Reynolds & Reynolds). This is the one place to buy rather than build. An error in a self-authored
contract is the dealer's liability and our reputation.

### Underwriting is capacity, not FICO

This population has thin or damaged credit files by definition; a FICO-first model rejects the
entire market. The thresholds live in `UNDERWRITING` in `src/lib/types.ts`: PTI ≤ 20% of gross,
down ≥ 18% of out-the-door, mileage ≤ 150k, term ≤ 48 months. Changing any of them is a product
decision, not a refactor.

Durability score is underwriting, not trivia — a car that breaks in month four is a car that
stops being paid for.

## What NOT to reach for

The rest of the Ekinoxis portfolio defaults to Privy, USDC, and Solidity. **All three are wrong
here** and should not be introduced. This is US-regulated consumer credit: the borrower needs a
bank account for ACH, the dealer needs a lien perfected with a state DMV, and the contract needs
to be enforceable in a county court. An embedded wallet solves nothing and adds a KYC surface;
onchain settlement introduces a currency risk that does not exist in the underlying transaction.

Auth is plain Supabase Auth (email + phone). Revisit only if a LatAm market opens.

## Repository hygiene

`/skills` and `/.qodo` are gitignored and **must stay that way**. This repo is public. The skills
directory documents the internal architecture and env var names of 26 Ekinoxis projects and must
never be published.

Never commit secrets. `.env` and `.env*.local` are gitignored.

## Layout

```
src/lib/types.ts       domain contract — types, defaults, UNDERWRITING thresholds. Change carefully.
src/lib/finance.ts     amortization, the budget solver, TILA computation. Pure, tested.
src/lib/scoring.ts     lot scoring, hard rejects, drop construction.
src/lib/mock-lots.ts   stands in for Manheim Listings Search until credentials land.
src/app/               App Router surfaces.
src/components/        UI. RegZDisclosure is mandatory wherever a trigger term appears.
```

## Verification

After any change:

```bash
npm run typecheck      # tsc --noEmit
npm test               # vitest — the finance engine must stay green
npm run build          # catches server/client boundary errors typecheck misses
```

The finance tests are not optional coverage. They encode the worked example the whole business
model rests on: $10,135 financed at 22% over 36 months is $387/month, and a $400/month envelope
with $2,500 down produces a $7,265 auction bid ceiling. If those numbers move, something is wrong.

## Open decisions

- **Operating state** — determines the RISC form, sales finance licensing, tax/title math in the
  solver, usury caps, and GPS device legality. Texas defaults are currently hardcoded in
  `DEFAULT_DEAL_COSTS`.
- **APR band** — 22% is used throughout. State caps vary. It is a config input to the solver, but
  it moves the bid ceiling by hundreds of dollars.
- **Product name** — DealerCars describes the supply side; the member is the one paying the
  subscription.
