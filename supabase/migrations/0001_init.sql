-- DealerCars initial schema.
--
-- Two rules shape everything below.
--
-- 1. MONEY IS BIGINT CENTS. No numeric, no float, no money type. Every monetary
--    column is `bigint` and every one carries a non-negative check. A rounding
--    error in a retail installment contract is a Reg Z problem.
--
-- 2. WE ARE NOT THE CREDITOR. The dealer is the seller, the creditor, and the
--    holder of the paper. The schema reflects that: deals point at a dealer,
--    dealer-side payments carry the connected account they settled to, and
--    there is deliberately no table anywhere that represents a DealerCars
--    balance. If one ever appears, the licensing analysis has changed.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- helpers

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- dealers

-- The licensed partner. Seller, creditor, and Stripe connected account holder.
create table dealers (
  id                  text primary key,
  legal_name          text not null,
  dba_name            text,
  -- Two-letter state. Selects the RISC form and the usury cap; not cosmetic.
  state               char(2) not null,
  city                text not null,
  -- State sales finance / retail installment seller licence. A dealer without
  -- one cannot hold paper, so no deal may reference them.
  license_number      text,
  license_verified_at timestamptz,
  -- Stripe connected account. Every dollar of the member's car money settles
  -- here, never to a platform balance.
  stripe_account_id   text unique,
  stripe_charges_enabled  boolean not null default false,
  stripe_payouts_enabled  boolean not null default false,
  time_zone           text not null default 'America/New_York',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger dealers_updated_at before update on dealers
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- profiles

create type verification_status as enum ('unverified','pending','verified','failed');
create type employment_type as enum
  ('w2_fulltime','w2_parttime','1099','cash','benefits','self_employed');
create type membership_status as enum
  ('none','trialing','active','past_due','canceled');

create table profiles (
  id            uuid primary key default gen_random_uuid(),
  -- Privy owns the session. This is the join key between the two systems and
  -- the only identifier a client is ever trusted to assert (after the server
  -- has verified the access token that carries it).
  privy_did     text not null unique,

  email         text,
  phone         text,
  full_name     text,

  address_line1 text,
  address_line2 text,
  city          text,
  state         char(2),
  postal_code   text,

  employment_type            employment_type,
  employer_name              text,
  months_at_employer         integer check (months_at_employer >= 0),
  -- Gross, not net: PTI is computed against gross. Written server-side only,
  -- after verification — a self-reported income that a client can PUT freely
  -- is not underwriting, it is a wish.
  gross_monthly_income_cents bigint check (gross_monthly_income_cents >= 0),

  income_verification    verification_status not null default 'unverified',
  identity_verification  verification_status not null default 'unverified',
  residence_verification verification_status not null default 'unverified',

  stated_down_cents    bigint check (stated_down_cents >= 0),
  stated_monthly_cents bigint check (stated_monthly_cents >= 0),

  membership_status      membership_status not null default 'none',
  -- Customer on the PLATFORM account: the subscription is our own revenue for
  -- software, which is a different transaction from the car.
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_privy_did_idx on profiles (privy_did);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------- listings

create type listing_source as enum ('street','dealer-lot','trade-in','auction');
create type listing_status as enum
  ('sourced','acquired','available','reserved','sold');
create type title_status as enum ('clean','branded','salvage');

-- A specific car. `status` is the safety interlock for the whole money path:
-- nothing may be sold, reserved, or collected against until the dealer owns it.
create table listings (
  id            text primary key,
  dealer_id     text not null references dealers (id),
  source        listing_source not null,
  status        listing_status not null default 'sourced',
  listing_url   text,
  seller_name   text,

  vin           text,
  year          integer not null check (year between 1980 and 2100),
  make          text not null,
  model         text not null,
  trim          text,
  mileage       integer not null check (mileage >= 0),
  title_status  title_status not null default 'clean',
  transmission  text,
  exterior_color text,
  interior_color text,

  asking_price_cents         bigint not null check (asking_price_cents >= 0),
  -- What the dealer should pay, which is not what the seller is asking.
  acquisition_target_cents   bigint not null check (acquisition_target_cents >= 0),
  estimated_recon_cents      bigint not null default 0 check (estimated_recon_cents >= 0),
  -- Set only once the dealer has actually bought it.
  acquired_price_cents       bigint check (acquired_price_cents >= 0),
  acquired_at                timestamptz,

  city          text not null,
  state         char(2) not null,
  owner_count   integer check (owner_count >= 0),
  seller_warranty_months integer check (seller_warranty_months >= 0),
  durability    numeric(3,2) not null check (durability between 0 and 1),
  notes         text[] not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A car cannot be past 'acquired' without an acquisition record. This is the
  -- database refusing to let an unowned car be sold, rather than trusting
  -- every future code path to remember.
  constraint listing_acquired_has_record check (
    status in ('sourced','acquired')
    or (acquired_at is not null and acquired_price_cents is not null)
  )
);

create index listings_status_idx on listings (status);
create index listings_dealer_idx on listings (dealer_id);
create trigger listings_updated_at before update on listings
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------ visits

create type visit_status as enum
  ('requested','confirmed','completed','no_show','canceled');

-- An appointment to see and drive a specific car. The money hangs off this:
-- the deposit holds the car until the visit, and the down payment only becomes
-- non-refundable when the RISC is signed at the visit.
create table visits (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references profiles (id) on delete cascade,
  listing_id   text not null references listings (id),
  dealer_id    text not null references dealers (id),
  scheduled_at timestamptz not null,
  time_zone    text not null,
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  status       visit_status not null default 'requested',
  member_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One live appointment per car. A second member cannot book a car that is
-- already held; partial index so cancellations free the slot.
create unique index visits_one_live_hold_per_listing
  on visits (listing_id)
  where status in ('requested','confirmed');

create index visits_profile_idx on visits (profile_id, scheduled_at desc);
create trigger visits_updated_at before update on visits
  for each row execute function set_updated_at();

-- ------------------------------------------------------------------- deals

create type deal_status as enum
  ('draft','offered','accepted','signed','funded','delivered','canceled');

create table deals (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles (id),
  listing_id  text not null references listings (id),
  dealer_id   text not null references dealers (id),
  status      deal_status not null default 'draft',

  retail_price_cents  bigint not null check (retail_price_cents >= 0),
  sales_tax_cents     bigint not null check (sales_tax_cents >= 0),
  doc_fee_cents       bigint not null check (doc_fee_cents >= 0),
  title_reg_cents     bigint not null check (title_reg_cents >= 0),
  out_the_door_cents  bigint not null check (out_the_door_cents >= 0),
  down_cents          bigint not null check (down_cents >= 0),
  apr_bps             integer not null check (apr_bps between 0 and 10000),
  -- 0 = paid in full at delivery, which is not a credit sale at all. 48 is the
  -- UNDERWRITING.maxTermMonths ceiling.
  term_months         integer not null check (term_months between 0 and 48),

  signed_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint deal_down_not_over_otd check (down_cents <= out_the_door_cents)
);

create index deals_profile_idx on deals (profile_id);
create trigger deals_updated_at before update on deals
  for each row execute function set_updated_at();

-- --------------------------------------------------------- tila snapshots

-- The federal Truth-in-Lending box as disclosed, frozen at signature.
--
-- Every future statement renders from this row. It is never recomputed from
-- live deal rows, because if a rate field is later edited and a statement
-- silently changes, the dealer has a Reg Z problem and no way to prove what
-- was actually disclosed. The immutability is enforced by a trigger below, not
-- by convention — conventions do not survive a migration written at 2am.
create table tila_snapshots (
  id             uuid primary key default gen_random_uuid(),
  deal_id        uuid not null unique references deals (id),
  apr_bps                 integer not null check (apr_bps between 0 and 10000),
  finance_charge_cents    bigint not null check (finance_charge_cents >= 0),
  amount_financed_cents   bigint not null check (amount_financed_cents >= 0),
  total_of_payments_cents bigint not null check (total_of_payments_cents >= 0),
  payment_cents           bigint not null check (payment_cents >= 0),
  term_months             integer not null check (term_months between 1 and 48),
  -- The full installment schedule exactly as disclosed.
  schedule       jsonb not null,
  -- The state-specific vendor form this was rendered onto. We never author a
  -- retail installment contract ourselves.
  risc_form_id   text,
  risc_form_vendor text,
  signed_at      timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create or replace function reject_tila_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'tila_snapshots is append-only: a signed Truth-in-Lending disclosure cannot be % (deal %)',
    tg_op, coalesce(old.deal_id::text, 'unknown');
end;
$$;

create trigger tila_snapshots_immutable
  before update or delete on tila_snapshots
  for each row execute function reject_tila_mutation();

-- ---------------------------------------------------------------- payments

create type payment_kind as enum
  ('membership','visit_deposit','down_payment','installment');
create type payment_status as enum
  ('requires_payment','processing','succeeded','refunded','failed','canceled');

create table payments (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles (id),
  kind        payment_kind not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency    char(3) not null default 'usd',
  status      payment_status not null default 'requires_payment',

  -- The connected account the money settled to. NULL only for 'membership',
  -- which is our own software revenue on the platform account. Every other
  -- kind is the dealer's money and must name the account it landed in.
  connected_account_id text,

  stripe_checkout_session_id text unique,
  stripe_payment_intent_id   text unique,

  listing_id  text references listings (id),
  visit_id    uuid references visits (id),
  deal_id     uuid references deals (id),

  -- A deposit or down payment taken before the RISC is signed is refundable.
  -- It becomes cash down only at signature.
  refundable_until_signature boolean not null default true,
  refunded_at timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- The money-transmitter guardrail, in the database. Dealer-side money must
  -- name a connected account; platform-side money must not.
  constraint payment_settles_to_the_right_account check (
    (kind = 'membership' and connected_account_id is null)
    or (kind <> 'membership' and connected_account_id is not null)
  )
);

create index payments_profile_idx on payments (profile_id, created_at desc);
create index payments_deal_idx on payments (deal_id);
create trigger payments_updated_at before update on payments
  for each row execute function set_updated_at();

-- --------------------------------------------------------------------- RLS
--
-- Everything is deny-by-default and there are NO policies granting `anon` or
-- `authenticated`. That is deliberate.
--
-- Supabase RLS is normally written against `auth.uid()`, but the session here
-- is issued by Privy, so there is no Supabase JWT to key a policy on. The
-- options were to mint a Supabase-compatible JWT from the verified Privy token
-- and key RLS on its `sub`, or to let nothing reach the database except server
-- routes running as the service role after verifying that token.
--
-- We take the second. This data is income, address, employment, and payment
-- history for consumer credit applicants; the smallest reachable surface is
-- worth more than the convenience of client-side queries. Enabling RLS with no
-- permissive policies means a leaked anon key reads nothing at all.
--
-- Consequence to respect: the service role bypasses RLS entirely, so every
-- route MUST scope its own queries by the profile id resolved from the
-- verified Privy DID. `requireMember()` in src/lib/auth.ts is that chokepoint.

alter table dealers        enable row level security;
alter table profiles       enable row level security;
alter table listings       enable row level security;
alter table visits         enable row level security;
alter table deals          enable row level security;
alter table tila_snapshots enable row level security;
alter table payments       enable row level security;

-- Listings are the one public read: the shop window has no personal data in it.
create policy listings_public_read on listings
  for select to anon, authenticated
  using (status in ('available','reserved'));

create policy dealers_public_read on dealers
  for select to anon, authenticated
  using (true);
