-- Admin operations and vehicle photography.
--
-- Two things arrive together here because they are the same feature: an
-- inventory the operator can actually edit, and the pictures without which a
-- used car does not sell. Everything before this migration treated inventory as
-- a hardcoded TypeScript array, which meant adding a car required a deploy.

-- --------------------------------------------------------------- admins
--
-- Who may write inventory. Keyed by Privy DID, exactly like `profiles`, because
-- Privy is the only identity claim this system trusts and `requireMember()` has
-- already verified it by the time anything reads this table.
--
-- This replaces the DEALER_ADMIN_TOKEN shared secret. A shared bearer token is
-- defensible for a curl-only endpoint; it is not defensible for a UI somebody
-- signs into daily, because it cannot be revoked for one person, cannot say who
-- did what, and ends up pasted into a browser console.
--
-- Bootstrapping is deliberately manual — there is no "become an admin" route,
-- because a self-service path to inventory write access is the whole problem.
-- Insert the first row by hand:
--
--   insert into admins (privy_did, label) values ('did:privy:...', 'William');

create table admins (
  privy_did  text primary key,
  -- Human label for the audit trail below. Not an identity claim.
  label      text not null,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------- listing photographs
--
-- Photos live in Supabase Storage; this table holds the ordering and the alt
-- text, which are editorial decisions rather than file properties.
--
-- `sort_order` is not unique. Reordering a gallery under a unique constraint
-- means either a temporary negative pass or deferred constraints, and the
-- ordering has no correctness weight — ties break by created_at. The first
-- photo by that ordering is the card image.

create table listing_photos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  text not null references listings (id) on delete cascade,

  -- Path within the storage bucket, e.g. 'listing_mazda3_orl_2014/<uuid>.jpg'.
  -- Not a URL: the bucket is public today, and a stored absolute URL would have
  -- to be rewritten everywhere if that ever changes.
  storage_path text not null unique,

  -- Alt text is an accessibility requirement, and on a page that carries Reg Z
  -- trigger terms it is also part of the advertisement.
  alt         text,
  sort_order  integer not null default 0,

  width       integer check (width > 0),
  height      integer check (height > 0),
  bytes       integer check (bytes > 0),
  content_type text not null,

  created_at  timestamptz not null default now()
);

create index listing_photos_listing_idx
  on listing_photos (listing_id, sort_order, created_at);

-- ------------------------------------------------------- listing columns
--
-- The retail price is what the member actually pays for the car, and until now
-- it was derived from `acquisition_target_cents` plus a target gross. That is
-- the right default when sourcing a car nobody owns; it is the wrong model once
-- the car is on our lot and someone has to be able to price it deliberately.
--
-- NULL means "derive it", so every existing row keeps its current behaviour.
alter table listings
  add column retail_price_cents bigint check (retail_price_cents >= 0);

-- Free-text description for the listing page. `notes` is an underwriting
-- record — what is unverified, what the seller claimed — and must not be
-- quietly repurposed as marketing copy.
alter table listings
  add column description text;

alter table listings
  add column body_style text;

alter table listings
  add column fuel_type text;

-- Written by the admin routes so an inventory change can be traced to a person.
alter table listings
  add column updated_by text references admins (privy_did);

-- ------------------------------------------------------------------- RLS
--
-- Same posture as everything else: enabled, and no policy for anon or
-- authenticated except the deliberate public read. See the notes at the end of
-- 0001 — `rls_enabled_no_policy` on `admins` is expected and must not be
-- "fixed", because nothing outside a service-role route has any business
-- reading the list of people who can edit inventory.

alter table admins        enable row level security;
alter table listing_photos enable row level security;

-- Photos of a car in the shop window are advertising, not personal data, so
-- they are readable exactly where the listing itself is readable. The predicate
-- deliberately mirrors `listings_public_read`; if one changes, change both.
create policy listing_photos_public_read on listing_photos
  for select to anon, authenticated
  using (
    exists (
      select 1 from listings l
      where l.id = listing_photos.listing_id
        and l.status in ('available', 'reserved')
    )
  );

-- --------------------------------------------------------------- storage
--
-- A public bucket, on purpose. Car photographs are the advertisement — they
-- need to be cacheable by the CDN, crawlable, and hotlinkable from an ad
-- creative. Signed URLs would expire mid-scroll and defeat every one of those.
--
-- Public means public READ. Writes still run through the service role in an
-- admin route, so nobody can upload into this bucket without passing the admin
-- check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  10485760, -- 10 MB. A phone photo of a car is ~3-5 MB.
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;
