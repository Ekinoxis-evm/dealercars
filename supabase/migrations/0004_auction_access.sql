-- ---------------------------------------------------------------- 0004
-- Auction Access: a flat-fee brokerage service, and the appointment it ends in.
--
-- The member pays a fixed fee and we bid at a dealer-only auction on their
-- behalf, using a licence they cannot hold themselves. It is NOT the retired
-- Monday drop: there is no bid ceiling, no scoring, no subscription, and no
-- car attached to the payment. It is a service someone buys, followed by a
-- meeting at the office.
--
-- Deliberately standalone. The fee must remain available to a cash buyer on
-- identical terms, because a charge imposed as a condition of extending credit
-- is a finance charge under 12 CFR 1026.4(a) — and this product's whole
-- premise elsewhere is that the finance charge is a true $0.00. The day this
-- fee becomes a prerequisite for financing, the TILA box has to absorb it and
-- the APR stops being zero.

-- ------------------------------------------------------------- payment kind
--
-- Dealer money, like every other kind except the retired membership: it pays
-- the licensed dealer for the bidding service, so it settles to their
-- connected account. The existing `payment_settles_to_the_right_account`
-- constraint already requires that of any non-membership kind, so it needs no
-- change — which is the constraint doing its job rather than an oversight.
--
-- Added on its own, and used only in later migrations//code: a value added to
-- an enum cannot be referenced in the same transaction that adds it.
alter type payment_kind add value if not exists 'auction_access';

-- ------------------------------------------------------------------ dealers
--
-- The street address is where the member is told to turn up, so it belongs on
-- the dealer rather than in a constant in the UI. A second dealer with a
-- second office is then a row, not a deploy.
alter table dealers add column if not exists street_address text;
alter table dealers add column if not exists postal_code   text;

-- ------------------------------------------------------------------- visits
--
-- A visit used to mean one thing: come and drive this specific car. An
-- auction-access appointment has no car — that is the point, the car does not
-- exist yet — so `listing_id` can no longer be mandatory.
create type visit_kind as enum ('test_drive', 'auction_access');

alter table visits add column if not exists kind visit_kind not null default 'test_drive';
alter table visits alter column listing_id drop not null;

-- Each kind has exactly one correct shape, and the database says so rather
-- than trusting every future caller to remember. A test drive without a car is
-- meaningless; an auction-access appointment with one is a mislabelled row.
alter table visits
  add constraint visit_kind_matches_listing check (
    (kind = 'test_drive'     and listing_id is not null)
    or (kind = 'auction_access' and listing_id is null)
  );

-- `visits_one_live_hold_per_listing` needs no change: Postgres treats NULLs as
-- distinct in a unique index, so auction-access rows never collide with each
-- other or with a car's hold.
--
-- They do need their own limit, though. One live auction-access appointment
-- per member — somebody who has booked and not yet been seen should change
-- that booking, not accumulate them.
create unique index if not exists visits_one_live_auction_access_per_member
  on visits (profile_id)
  where kind = 'auction_access' and status in ('requested', 'confirmed');
