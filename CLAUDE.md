# DealerCars — Project Conventions

An interest-free Buy-Here-Pay-Here used-car dealership in the US. We buy the cars, hold the
title, and carry the paper. Next.js 15 App Router / React 19 / TypeScript / Tailwind v4,
deployed on Vercel.

**Decided 2026-09-14: there is no auction product.** The Monday drop, the bid ceiling, the
lot scoring and the auction-access membership are gone — deleted, not disabled. What remains
is a marketplace: we list the cars we own, each with its own page, and a member buys one. A
wholesale lane is a channel we buy through, never something a member participates in. Do not
reintroduce a bid, a drop, a proposal, or a subscription.

Full product spec and architecture: see the DealerCars Blueprint artifact.

## What this is, structurally

**Decided 2026-08-29, reversing the previous "we are software, not a lender" rule.** DealerCars
**is the dealer**. We hold the auction access, we buy the cars, we take title, and we are the
seller and the creditor on every retail installment contract. We hold the paper and we carry the
credit risk.

That reversal is load-bearing, and the obligations it creates are not optional:

- **We need the licences.** In Florida that is a used motor vehicle dealer licence (Ch. 320.27,
  F.S.) *and* a retail installment seller licence (Ch. 520, F.S.). Both must be in hand before a
  single contract is written. The `dealers` table gates on `license_verified_at` for exactly this
  reason, and that gate applies to our own entity like any other.
- **We are the merchant of record.** Selling our own cars, taking payment for them is ordinary
  merchant activity, not money transmission — the custody rule below still holds, but for a
  different reason than it used to.
- **Every consumer-facing disclosure names us as the creditor.** `RegZDisclosure` and
  `SiteFooter` say so. A disclosure that credits a third-party dealer is now a false statement in
  an advertisement, which is worse than no statement at all.

What has *not* changed: we still do not author the RISC, we still do not recompute a signed TILA
box, and the member's money still settles to a connected account rather than a platform balance.

## Hard rules

### Money is integer cents

Every monetary value is an integer count of cents. Never a float, never a string, never dollars.
Format only at the render boundary via `formatMoney()`. A rounding error in a retail installment
contract is a Reg Z problem, not a display bug.

### Money settles to the dealer's connected account

Stripe Connect with the **dealer as the connected account**. Every charge — the visit deposit,
the down payment, every installment — is a direct charge there. Nothing settles to the platform
today: the membership subscription was the only thing that ever did, and it went with the
auction.

Since we are now the dealer, the connected account is our own entity — so "never take custody" no
longer describes a money-transmitter risk, it describes a structural one. Keep the split anyway.
Car money and software money are different businesses with different licensing, different
chargeback exposure and different books, and the day a second dealer is onboarded, a payout path
that has been quietly routing through a platform balance is a rewrite of the money path rather
than a configuration change. Do not "simplify" it.

### The TILA disclosure is immutable once signed

Snapshot amount financed, finance charge, APR, total of payments and the full schedule into
`tila_snapshots` at signature. Render every future statement from that snapshot. Never recompute
a signed disclosure from live rows — if a rate field is later edited and a statement silently
changes, the dealer has a Reg Z problem and no way to prove what was disclosed.

### Regulation Z advertising trigger terms

Stating a down payment amount or a monthly payment figure in an advertisement legally obligates
disclosing the APR, the terms of repayment, and the total of payments **in the same creative**.

Every surface that shows "$4,000 down" or "$245/month" must carry `<RegZDisclosure />`. This
includes the landing page hero, the budget calculator, the plan picker, and every Meta ad
creative. It is part of the component contract, not fine print to be added before launch.

The inventory cards (`CarCard`) deliberately show an out-the-door price and "0% APR plans" and
**no monthly figure**, which is why they carry no disclosure: neither a cash price nor an APR
stated on its own is a trigger term under 1026.24(d)(1). Put "from $245/mo" on a card and the
disclosure has to ride along on every card in the grid. `CarCardData` says so at the type.

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

Mileage may be unknown (migration 0007). The dealer's site states it for few cars, and an invented
figure in a field underwriting reads and a member sees is a misstatement. Unknown renders as "to
be confirmed" and fails the gate until somebody records it. Never seed a zero.

Durability score is underwriting, not trivia — a car that breaks in month four is a car that
stops being paid for.

## What NOT to reach for

USDC and Solidity are wrong here and must not be introduced. This is US-regulated consumer credit:
the borrower needs a bank account for ACH, the dealer needs a lien perfected with a state DMV, and
the contract needs to be enforceable in a county court. Onchain settlement introduces a currency
risk that does not exist in the underlying transaction.

## Auth: Privy for login, Supabase for data

**Decided 2026-08-26, overriding the previous "no Privy" rule.** Privy issues the session; a
`profiles` row keyed by Privy DID holds everything else. **Login is email and passkey only
(decided 2026-09-22)** — no SMS, no Google. Email is the identity an admin invitation is matched
against and where statements go; a passkey is a faster way back into the same account. Two things follow
and neither is optional:

- **Wallets are off.** `embeddedWallets.{ethereum,solana}.createOnLogin: 'off'` and an empty
  `walletList`, set explicitly in `src/app/providers.tsx`. This app has nothing a wallet could do,
  and a wallet the member never asked for is a KYC surface we would then have to defend.
- **Privy is the only identity claim we trust, and only after verification.** `requireMember()` in
  `src/lib/auth.ts` is the single chokepoint: verify the access token, resolve the DID, look up the
  profile. A profile id, deal id, or listing id arriving in a request body is attacker input.

The known cost, and how it is contained: Privy adds ~726 kB of first-load JS to any page that
statically imports it, because the SDK pulls the whole wallet stack — `@reown/appkit`, `viem`,
`keccak`, `x402` — to do email login. On a BHPH buyer's phone on metered data that is a real tax.

**Every component that imports `@privy-io/react-auth` must be re-exported through
`src/components/privy-deferred.tsx`, and pages must import it from there.** That module wraps each
one in `next/dynamic`, which moved `/cars/[id]` and `/account` from 832 kB to 106 kB of first-load
JS. SSR stays ON inside those boundaries, so the plan figures and their Reg Z disclosure are still
in the server HTML — `ssr: false` would take the disclosure out of the HTML along with the trigger
terms it belongs to, so do not add it. A new Privy-dependent component that a page imports directly
silently puts 726 kB back on the critical path.

Server-side, set `PRIVY_VERIFICATION_KEY` so `verifyAuthToken` verifies the JWT locally. Without it
the SDK fetches the signing key from Privy on every authenticated request, which puts a third-party
round-trip on the critical path of every signed-in page load and makes a Privy outage look like
ours. The code falls back gracefully when the key is unset.

### RLS is deny-all, on purpose

Supabase RLS keys off `auth.uid()`, and there is no Supabase JWT here. So RLS is **enabled with no
policies** for `anon`/`authenticated` on every table holding personal data, and access runs through
server routes using the service role. A leaked anon key reads nothing. The Supabase linter reports
this as `rls_enabled_no_policy` — that finding is expected and must not be "fixed".

The corollary: the service role bypasses RLS, so **every route must scope its own queries** by the
profile id from `requireMember()`. Nothing else does it for you.

## Inventory lives in the database, not in TypeScript

`available-now.ts` and `dealers.ts` are **seeds and no-database fallbacks**. Everything
user-facing reads `listing-store.ts` / `dealer-store.ts`, because a listing's status decides
whether checkout is open on it and its price decides what a member is charged — both change on an
ordinary weekday, and neither should require a deploy. A car marked sold in a compiled constant
stays purchasable until someone edits a file.

Photos are `listing_photos` rows plus files in a **public** Supabase Storage bucket. Public read is
deliberate: car photographs are the advertisement and have to be CDN-cacheable and crawlable, which
signed URLs defeat. Writes still run through an admin route. `photoUrl()` in `listing-store.ts` is
the only place that knows the bucket layout.

`/marketplace/[id]` is `revalidate = 60`, not statically generated — the set of cars is no longer known at
build time. Sixty seconds of staleness on a marketing page is acceptable **because it is not the
enforcement boundary**: whether money may actually be taken is re-decided server-side on every
request in the down-payment route.

### Admin access is a row, not a password

`requireAdmin()` in `admin-auth.ts` checks the `admins` table by verified Privy DID. This replaced
`DEALER_ADMIN_TOKEN`, which could not be revoked per person, could not attribute a price change to
anyone, and had to be pasted into a browser console to be used at all. There is deliberately no
route that grants admin — insert the first row by hand (see migration 0003).

Admin API responses carry `acquisitionTargetCents`, which is what we intend to pay a private
seller. That figure reaching a member, or the seller, costs real money on the next car. Admin pages
are `robots: noindex`, and no admin field may be surfaced on a member route.

## Repository hygiene

`/skills` and `/.qodo` are gitignored and **must stay that way**. This repo is public. The skills
directory documents the internal architecture and env var names of 26 Ekinoxis projects and must
never be published.

Never commit secrets. `.env` and `.env*.local` are gitignored.

## Layout

```
src/lib/types.ts        domain contract — types, defaults, UNDERWRITING thresholds. Change carefully.
src/lib/finance.ts      amortization, the budget solver, plans, TILA computation. Pure, tested.
src/lib/deal-costs.ts   per-state tax/doc/title profiles. TX and FL. Unmapped state = cannot quote.
src/lib/available-now.ts seed inventory + the no-database fallback. Not the read path.
src/lib/social.ts       Instagram / Facebook / TikTok links. TikTok is unset until the handle is known.
scripts/scrape-mgm-lot.mjs  reads the dealer's Wix site into scripts/data/mgm-lot.scraped.json.
scripts/seed-mgm-lot.mjs    joins that with the hand-curated scripts/data/mgm-lot.json and upserts
                        the lot + photos. `npm run lot:scrape && npm run lot:seed`. Read its header:
                        it writes the list price as a PLACEHOLDER acquired price.
src/lib/dealers.ts      dealer seed + the gates that stop an unonboarded dealer taking money.
src/lib/dealer-store.ts DB-backed dealer read. The payment gate reads THIS, not the seed.
src/lib/listing-store.ts DB-backed inventory + photo URLs. The seed is a fallback only.
src/lib/listing-input.ts validation for admin-written inventory. Where cents stay integers.
src/lib/inventory-card.ts the member-facing card shape. Prices ONCE, server-side, and is the
                        boundary that keeps acquisitionTargetCents off member surfaces.
src/lib/admin-auth.ts   requireAdmin() — a row in `admins`, keyed by Privy DID.
src/lib/auth.ts         requireMember() — the ONLY sanctioned source of a caller's identity.
src/lib/stripe.ts       connected-account money, all of it. Read the header before editing.
src/lib/visits.ts       appointment slots, in the dealer's timezone.
src/app/api/            route handlers. Every figure is recomputed server-side.
src/app/                App Router surfaces.
src/components/         UI. RegZDisclosure is mandatory wherever a trigger term appears.
src/components/CarCard.tsx  one car in the grid. Price and APR only — no monthly figure.
src/components/InventoryGrid.tsx  client-side sort and budget filter. Reorders, never prices.
src/components/privy-deferred.tsx  lazy boundary for every Privy component. Import from HERE, not direct.
src/components/DealerContact.tsx   the WhatsApp number (context) and the link that carries a quote into it.
supabase/migrations/    schema. The money guardrails are check constraints, not conventions.
```

## One path, one price

`/marketplace` is the lot and `/marketplace/[id]` is one car. That is the whole product: a car
we already own, bought with $2–4k down and interest-free monthly payments, or paid in full.
Nothing is gated and there is no subscription. Every dollar attached to a car settles to the
dealer's connected account as a direct charge.

**Decided 2026-09-22: the call to action on a built plan is WhatsApp, not checkout.** The plan
builder hands the settled figures — car, down, monthly, term, rate and the page URL — into a
`wa.me` message labelled "talk to an agent". Nothing on a member surface calls the down-payment
route today; the route and its gates stay, because the money path is the part that is hard to
get right and the day it is switched back on it must not be rebuilt. There is no floating
contact button: WhatsApp lives beside the quote in `PlanPicker` and in the footer, both through
`DealerContact.tsx`, which reads the number off the dealer row.

The `/marketplace` index shows deliverable cars in the main grid and `sourced`/`acquired` cars
under a separate "On the way" heading, plainly labelled and with no purchase affordance — the
same thing `/marketplace/[id]` already says about those rows. `/cars`, `/cars/[id]`, their
localised forms and `/drop` are permanent redirects in `next.config.ts`; the paths were public
and are in at least one ad creative.

The front page states no down payment, no monthly figure and no period of repayment, so it
carries no Reg Z disclosure. Keep it that way, or bring `<RegZDisclosure />` back with the
figure. The footer is the subscription form, the social links (`src/lib/social.ts`) and one
sentence naming the creditor — the representative example that used to live there covered
trigger terms the site no longer states outside the plan builder.

A car may only be paid for once `status` is `available` or `reserved`. A `sourced` car is one we
found advertised and the dealer has not bought; collecting against it would be taking money for a
vehicle nobody holds title to. The check constraint `listing_acquired_has_record` enforces this in
the database, and the down-payment route refuses before Stripe is ever called.

## How work ships

**Decided 2026-09-22.** Every change goes through the same loop, and the loop is the deliverable
as much as the code is:

1. **Plan** — say what is changing and why, in a sentence or two, before touching a file.
2. **Build** on a branch off `main`, never on `main` itself. One branch may carry several
   features; that is fine. Each feature is its own commit with a message that says what changed
   and why, so `git log` reads as the history of decisions.
3. **Test** — the three commands under Verification, plus a local `next start` smoke test of any
   page you touched. A change that is not verified is not done.
4. **PR** — push the branch and open a pull request against `main` with a description of what
   changed, what was verified, and what is still open. Vercel builds a preview from it.
5. **Merge** once the PR builds green. Merging to `main` is the production deploy.

Commits are not optional in that loop: a pull request is a set of commits, and "several features
on one branch" means several commits on it, not one commit at the end. Do not push to `main`
directly, and do not merge a PR whose preview build failed.

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
  F.S., and we must hold that licence — along with the Ch. 320.27 dealer licence — before a single
  contract is written. This is now the critical path item, not a partner's problem.
- **Florida figures need confirming.** The $699 doc fee, $400 title/registration and the Orange
  County 0.5% surtax (capped at a $5,000 base) are researched starting points, not verified
  numbers. Confirm against the current state schedule and the dealer's own fee sheet.
- **APR band — largely resolved.** The product is 0%, so the usury cap stops binding and the
  member's purchasing power rises sharply (the same budget reaches a much higher ceiling when none
  of the payment is interest). The open question is now the *dealer's* economics: a BHPH dealer
  normally earns most of their return on the finance charge, and at 0% the entire return is the
  front-end gross (`targetGrossCents`, currently $2,795). Either the gross carries it or the term
  shortens so capital turns faster. That is a business decision, not a code change.
- **Product name** — DealerCars describes the supply side. Now that the subscription is gone
  and the member is simply buying a car from us, the name has even less to do with what they
  experience.
- **Revenue is now entirely the front-end gross.** Removing the membership removed the only
  recurring revenue line. `targetGrossCents` on each car is the whole business; there is no
  software revenue to smooth a slow month. That is a business decision to make consciously
  rather than a gap to quietly fill by reintroducing a fee on the credit.
