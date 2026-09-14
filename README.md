# DealerCars

**A Buy-Here-Pay-Here dealership where nothing costs interest.** We buy the cars, hold the
title, and carry the paper ourselves — so every car on the lot has one price, and that price
can be paid over three years without a finance charge.

---

## The problem

Every Buy-Here-Pay-Here lot in America runs on two guesses: which cars will sell, and which
buyers will pay. Both are made with a spreadsheet and a gut feel, and both are expensive when
wrong.

The customer's side is worse. Someone with $2,500 cash and $400/month of real capacity picks
from whatever happens to be on the lot — rarely the car that fits their budget, often the car
that breaks in month four and ends the payments. Then the price on the windshield turns out not
to be the price: tax, title, doc fee and a finance charge at 20-some percent land on top of it,
and by the end they have paid for the car roughly twice.

## What we do instead

One price per car, stated as the out-the-door price with tax, title, registration and the doc
fee already in it. Pay it in full, or split that exact number over 12, 24 or 36 months. The
payments add up to the cash price to the cent, because the finance charge is a true $0.00.

The return is the front-end gross on the car, not interest on the customer. That is the whole
business model, and it is why `targetGrossCents` matters more here than an APR band does.

```
STEP 1  DealerCars   Buy the car          auction or private party, inspected and titled
STEP 2  DealerCars   Price it             one out-the-door number, fees included
STEP 3  Member       Pick a plan          cash, or 12 / 24 / 36 months at 0%
STEP 4  DealerCars   Ability-to-pay check capacity, not FICO
STEP 5  Member       Visit and drive it   refundable deposit holds it for the appointment
STEP 6  DealerCars   Contract and autopay we are the seller AND the creditor
```

## The math

Two directions, both in [`src/lib/finance.ts`](src/lib/finance.ts), both pure and tested.

Forward — what one car costs:

```
retail  = acquisition + buy_fee + transport + recon + gross   (or an admin override)
OTD     = retail + sales_tax(retail) + doc_fee + title_reg
monthly = floor((OTD − down) / n)     ← final payment absorbs the remainder
```

Backward — what one budget reaches:

```
i     = APR / 12                                           (zero, on every plan we offer)
A_max = M × (1 − (1 + i)^−n) / i  →  M × n at 0%           ← max amount financed
OTD_max = A_max + D                                        ← what the inventory filter runs on
P_max = (OTD_max − doc_fee − title_reg) / (1 + tax)        ← the sticker that leaves room
```

Worked, and pinned by the tests: the Orlando 2014 Mazda3 lands at **$12,831.70 out the door**
in Orange County, FL — at $4,000 down over 36 interest-free months, **$245.32/month with a
$245.50 final payment**. Down plus every scheduled payment equals the cash price exactly. If
that identity breaks, the product is not interest-free and the disclosure is a misstatement.

Note the two branches that look like over-engineering and are not: `sumScheduledPayments`
derives the total of payments from the real schedule rather than `payment × term` (at 0% the
difference is the difference between disclosing $0.00 and disclosing a negative finance
charge), and `salesTaxOn` treats Florida's county surtax as capped at a $5,000 base rather than
blending it into one rate.

## Underwriting

Ability to pay, not FICO — this population has thin or damaged files by definition, and a
FICO-first model rejects the entire market. Thresholds live in `UNDERWRITING`
([`src/lib/types.ts`](src/lib/types.ts)); changing one is a product decision, not a refactor.

| Criterion | Threshold | Why it predicts |
|---|---|---|
| Payment-to-income | ≤ 20% of gross | The hardest constraint. Above 20%, any shock ends the loan. |
| Down payment | ≥ 18% of out-the-door | Strongest default predictor in BHPH. |
| Verified income | 2 months cash flow | Stated income is fiction. |
| Mileage | ≤ 150,000 | Past it, repair risk outruns the term. |
| Term | ≤ 48 months | Longer than the car lasts is not a loan, it is a deferral. |
| Durability score | model × mileage band | A car that breaks in month four stops being paid for. |

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind v4 |
| Auth | Privy (email / SMS / Google), wallets explicitly off |
| Data | Supabase (Postgres, RLS enabled with no policies, service-role routes) |
| Photos | Supabase Storage, public bucket — car photographs are the advertisement |
| Money movement | Stripe Connect, dealer as the connected account |
| Installments | Stripe off-session charges, driven by our own schedule |
| Hosting | Vercel |

**Deliberately not used:** embedded wallets, stablecoins, smart contracts. This is US-regulated
consumer credit — the borrower needs a bank account for ACH, we need a lien perfected with a
state DMV, and the contract needs to be enforceable in a county court. None of the money flow
benefits from being trustless.

## Status

Pre-launch. What runs today:

- ✅ Pricing, amortization, payment plans and TILA computation, with tests
- ✅ The lot: `/cars` index with budget filtering and sort, `/cars/[id]` detail pages
- ✅ Admin inventory and photo management, gated on a row in `admins` by Privy DID
- ✅ Privy auth, member profiles, visit scheduling
- ✅ Stripe Connect down payments and deposits as direct charges, webhook-driven
- ⬜ Licensing: FL Ch. 320.27 dealer and Ch. 520 retail installment seller — the critical path
- ⬜ Vendor RISC forms and e-signature
- ⬜ ACH servicing of the installment schedule

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # the finance engine must stay green
npm run typecheck
npm run build      # catches server/client boundary errors typecheck misses
```

## Money convention

**All money is an integer count of cents.** Never a float, never a string, never dollars. A
rounding error in a retail installment contract is a Reg Z problem, not a display bug.

## Compliance notes for contributors

This repository touches US consumer credit. Three rules are load-bearing:

1. **Regulation Z advertising trigger terms.** Stating a down payment or a monthly payment
   figure in an advertisement legally obligates disclosing the APR, terms of repayment, and
   total of payments in the same creative. Every surface showing "$4,000 down" or "$245/month"
   must carry `<RegZDisclosure />`. This is not fine print to add later.

2. **0% APR is still Regulation Z credit.** A creditor is one who extends consumer credit
   payable in more than four installments *or* for which a finance charge is imposed
   (12 CFR 1026.2(a)(17)). Every plan we offer is a credit sale. The disclosure gets simple and
   attractive, not optional.

3. **The TILA disclosure is immutable once signed.** Never recompute it from live rows.
   Snapshot it at signature and render every future statement from that snapshot.

DealerCars is the dealer: the seller and the creditor on every retail installment contract, and
the holder of the paper. That is not a posture, it is a licensing obligation — a used motor
vehicle dealer licence and a retail installment seller licence must both be in hand before a
single contract is written. Nothing in this repository is legal advice, and any deployment
requires review by qualified counsel in the operating jurisdiction.

## License

MIT — see [LICENSE](LICENSE).
