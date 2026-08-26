# DealerCars

**Buy-to-order financing for Buy-Here-Pay-Here dealers.** Match a pre-qualified buyer to a
specific wholesale auction lot *before anyone bids* — so the dealer only buys cars that are
already sold.

---

## The problem

Every Buy-Here-Pay-Here lot in America runs on two guesses: which cars will sell, and which
buyers will pay. Both are made with a spreadsheet and a gut feel, and both are expensive when
wrong.

A dealer buys eight cars at a Tuesday auction hoping the right customers walk in — roughly
$9,000 of capital sitting per unit. Meanwhile a customer with $2,500 cash and $400/month of
real capacity picks from whatever happens to be on the lot, which is rarely the car that fits
their budget and often the car that breaks in month four and ends the payments.

Wholesale auctions are dealer-license-only, so the customer can never see the source.

## The inversion

The member's budget is verified **first**. We solve it backwards into a maximum auction bid,
search live auction inventory against that ceiling, and send four real lots. The member commits
to one. Only then does the dealer bid — on a car with a buyer already attached, at a price that
mathematically produces a payment the buyer can carry.

Inventory risk goes to zero. Default rates drop, because the payment was engineered from
verified income rather than negotiated at a desk.

```
STEP 1  Member      Set the envelope        $2,500 down · $400/mo ceiling
STEP 2  Platform    Ability-to-pay prequal  soft pull + bank cash flow → APR band, bid ceiling
STEP 3  Platform    The Monday drop         4 live lots that clear the ceiling
STEP 4  Member      Commit to one           refundable deposit hold, closes Wednesday
STEP 5  Dealer      Bid to the ceiling      buys only what is already sold
STEP 6  Dealer      Recon, contract, autopay
```

## The math

The whole engine is one equation run backwards — given what someone can pay each month, what
is the most we can pay for the car?

```
i     = APR / 12
A_max = M × (1 − (1 + i)^−n) / i                          ← max amount financed
P_max = (A_max + D − doc_fee − title_reg) / (1 + tax)     ← max retail price
B_max = P_max − recon − transport − buy_fee − gross       ← max auction bid
```

Worked: `M=$400, D=$2,500, 22% APR, 36mo, 7% tax` → **bid ceiling $7,265**. That single number
goes straight into the auction search, and every lot that comes back is by construction a car
this person can afford.

See [`src/lib/finance.ts`](src/lib/finance.ts) and [`src/lib/scoring.ts`](src/lib/scoring.ts).

## Underwriting

Ability to pay, not FICO — this population has thin or damaged files by definition, and a
FICO-first model rejects the entire market.

| Criterion | Threshold | Why it predicts |
|---|---|---|
| Payment-to-income | ≤ 20% of gross | The hardest constraint. Above 20%, any shock ends the loan. |
| Down payment | ≥ 18% of out-the-door | Strongest default predictor in BHPH. |
| Verified income | 2 months cash flow | Stated income is fiction. |
| Time at job | ≥ 6 months | Proxy for income continuity. |
| Prior repossession | None in 12 months | Clearest available signal. |
| Durability score | model × mileage band | A car that breaks in month four stops being paid for. |

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| Styling | Tailwind v4 |
| Data / auth | Supabase (Postgres + RLS) — *not yet wired* |
| Subscriptions | Stripe Billing — *not yet wired* |
| Money movement | Stripe Connect (Express), dealer as connected account — *not yet wired* |
| Installments | Stripe ACH Direct Debit — *not yet wired* |
| Auction data | Manheim Listings Search + MMR — *mocked in `src/lib/mock-lots.ts`* |
| Hosting | Vercel |

**Deliberately not used:** embedded wallets, stablecoins, smart contracts. This is US-regulated
consumer credit — the borrower needs a bank account for ACH, the dealer needs a lien perfected
with a state DMV, and the contract needs to be enforceable in a county court. None of the money
flow benefits from being trustless.

## Status

Pre-launch. What runs today:

- ✅ Budget solver, amortization, and TILA disclosure computation, with tests
- ✅ Lot scoring and ranking, with hard rejects on branded titles, over-mileage and frame damage
- ✅ Landing page with a live bid-ceiling calculator
- ✅ The Monday drop, rendered from mock auction inventory
- ⬜ Supabase schema, RLS and auth
- ⬜ Stripe Billing and Connect
- ⬜ Manheim API ingest
- ⬜ Origination, e-signed contracts, ACH servicing

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # finance engine tests
npm run typecheck
```

## Money convention

**All money is an integer count of cents.** Never a float, never a string, never dollars. A
rounding error in a retail installment contract is a Reg Z problem, not a display bug.

## Compliance notes for contributors

This repository touches US consumer credit. Two rules are load-bearing:

1. **Regulation Z advertising trigger terms.** Stating a down payment or a monthly payment
   figure in an advertisement legally obligates disclosing the APR, terms of repayment, and
   total of payments in the same creative. Every surface showing "$2,500 down" or "$387/month"
   must carry `<RegZDisclosure />`. This is not fine print to add later.

2. **The TILA disclosure is immutable once signed.** Never recompute it from live rows.
   Snapshot it at signature and render every future statement from that snapshot.

DealerCars is software. It is not a lender, a dealer, or a creditor. Financing is originated and
held by licensed partner dealers. Nothing in this repository is legal advice, and any deployment
requires review by qualified counsel in the operating jurisdiction.

## License

MIT — see [LICENSE](LICENSE).
