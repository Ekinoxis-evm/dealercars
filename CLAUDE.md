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

Every surface that shows "$4,000 down" or "$245/month" must carry `<RegZDisclosure />`. This
includes the landing page, the calculator, the plan picker, every proposal card, and every Meta ad
creative. It is part of the component contract, not fine print to be added before launch.

### 0% APR is still Regulation Z credit

The product is interest-free. That does **not** put it outside Reg Z. Under 12 CFR 1026.2(a)(17) a
creditor is one who extends consumer credit payable in **more than four installments** *or* for
which a finance charge is imposed. Every 12/24/36-month plan we offer is therefore a credit sale:
it needs the TILA box, and "$4,000 down" is still a trigger term.

What changes is that the disclosure gets simple and attractive — APR 0.00%, finance charge $0.00,
total of payments equal to the cash price. Four payments or fewer with no finance charge would fall
outside Reg Z entirely; `REG_Z_INSTALLMENT_THRESHOLD` in `types.ts` is that line.

Because the finance charge must be a true $0.00, `amortize()` derives the total of payments from
the actual schedule, including the drift-absorbing final payment. `payment × term` is off by a few
cents, which at a non-zero rate is invisible and at 0% discloses a finance charge on an
interest-free loan — sometimes a negative one. Do not "simplify" it back.

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

USDC and Solidity are wrong here and must not be introduced. This is US-regulated consumer credit:
the borrower needs a bank account for ACH, the dealer needs a lien perfected with a state DMV, and
the contract needs to be enforceable in a county court. Onchain settlement introduces a currency
risk that does not exist in the underlying transaction.

## Auth: Privy for login, Supabase for data

**Decided 2026-08-26, overriding the previous "no Privy" rule.** Privy issues the session
(email, SMS, Google); a `profiles` row keyed by Privy DID holds everything else. Two things follow
and neither is optional:

- **Wallets are off.** `embeddedWallets.{ethereum,solana}.createOnLogin: 'off'` and an empty
  `walletList`, set explicitly in `src/app/providers.tsx`. This app has nothing a wallet could do,
  and a wallet the member never asked for is a KYC surface we would then have to defend.
- **Privy is the only identity claim we trust, and only after verification.** `requireMember()` in
  `src/lib/auth.ts` is the single chokepoint: verify the access token, resolve the DID, look up the
  profile. A profile id, deal id, or listing id arriving in a request body is attacker input.

The known cost, measured: Privy adds ~720 kB of first-load JS to any page that mounts the provider
(111 kB → 831 kB), because the SDK pulls the whole wallet stack — `@reown/appkit`, `viem`, `keccak`,
`x402` — to do email login. On a BHPH buyer's phone on metered data that is a real tax. If it starts
costing conversions, the fallback is Supabase Auth, which is what this file used to mandate.

### RLS is deny-all, on purpose

Supabase RLS keys off `auth.uid()`, and there is no Supabase JWT here. So RLS is **enabled with no
policies** for `anon`/`authenticated` on every table holding personal data, and access runs through
server routes using the service role. A leaked anon key reads nothing. The Supabase linter reports
this as `rls_enabled_no_policy` — that finding is expected and must not be "fixed".

The corollary: the service role bypasses RLS, so **every route must scope its own queries** by the
profile id from `requireMember()`. Nothing else does it for you.

## Repository hygiene

`/skills` and `/.qodo` are gitignored and **must stay that way**. This repo is public. The skills
directory documents the internal architecture and env var names of 26 Ekinoxis projects and must
never be published.

Never commit secrets. `.env` and `.env*.local` are gitignored.

## Layout

```
src/lib/types.ts        domain contract — types, defaults, UNDERWRITING thresholds. Change carefully.
src/lib/finance.ts      amortization, the budget solver, plans, TILA computation. Pure, tested.
src/lib/scoring.ts      lot scoring, hard rejects, drop construction.
src/lib/deal-costs.ts   per-state tax/doc/title profiles. TX and FL. Unmapped state = cannot quote.
src/lib/mock-lots.ts    stands in for Manheim Listings Search until credentials land.
src/lib/available-now.ts cars on the lot — the non-auction path. Stands in for the listings table.
src/lib/dealers.ts      partner dealers and the gates that stop an unonboarded one taking money.
src/lib/auth.ts         requireMember() — the ONLY sanctioned source of a caller's identity.
src/lib/stripe.ts       platform vs connected-account money. Read the header before editing.
src/lib/visits.ts       appointment slots, in the dealer's timezone.
src/app/api/            route handlers. Every figure is recomputed server-side.
src/app/                App Router surfaces.
src/components/         UI. RegZDisclosure is mandatory wherever a trigger term appears.
supabase/migrations/    schema. The money guardrails are check constraints, not conventions.
```

## Two paths, one price

**Available now** (`/cars/[id]`) is the main product: a car the dealer already owns, bought with
$2–4k down and interest-free monthly payments, or paid in full. No subscription needed.

**The Monday drop** (`/drop`) is the auction path, gated by the membership subscription — that
subscription is the one payment that settles to the *platform*, because it buys software. Every
dollar attached to a car settles to the *dealer's* connected account as a direct charge.

A car may only be paid for once `status` is `available` or `reserved`. A `sourced` car is one we
found advertised and the dealer has not bought; collecting against it would be taking money for a
vehicle nobody holds title to. The check constraint `listing_acquired_has_record` enforces this in
the database, and the down-payment route refuses before Stripe is ever called.

## Verification

After any change:

```bash
npm run typecheck      # tsc --noEmit
npm test               # vitest — the finance engine must stay green
npm run build          # catches server/client boundary errors typecheck misses
```

The finance tests are not optional coverage. They encode the worked examples the business model
rests on:

- The interest-rate reference case, retained: $10,135 at 22% over 36 months is $387/month.
- **The live product**: the Orlando 2014 Mazda3 lands at **$12,831.70 out the door** in Orange
  County, FL — and at $4,000 down over 36 interest-free months, **$245.32/month with a $245.50
  final payment**. Down plus every scheduled payment equals the cash price to the cent. If that
  identity ever breaks, the product is not interest-free and the disclosure is a misstatement.

## Open decisions

- **Operating state** — determines the RISC form, sales finance licensing, tax/title math in the
  solver, usury caps, and GPS device legality. `deal-costs.ts` now carries TX and FL (Orange
  County). The live inventory is in Orlando, so **FL is the de facto operating state** and needs
  the licensing question answered: Florida retail installment sellers are licensed under Ch. 520,
  F.S., and the partner dealer must hold that licence before a single contract is written.
- **Florida figures need confirming.** The $699 doc fee, $400 title/registration and the Orange
  County 0.5% surtax (capped at a $5,000 base) are researched starting points, not verified
  numbers. Confirm against the current state schedule and the dealer's own fee sheet.
- **APR band — largely resolved.** The product is 0%, so the usury cap stops binding and the
  member's purchasing power rises sharply (the same budget reaches a much higher ceiling when none
  of the payment is interest). The open question is now the *dealer's* economics: a BHPH dealer
  normally earns most of their return on the finance charge, and at 0% the entire return is the
  front-end gross (`targetGrossCents`, currently $2,795). Either the gross carries it or the term
  shortens so capital turns faster. That is a business decision, not a code change.
- **Product name** — DealerCars describes the supply side; the member is the one paying the
  subscription.
