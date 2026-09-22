-- ---------------------------------------------------------------- 0008
-- Admins invited by email, and where the dealer lives online.
--
-- `admins` was keyed by Privy DID and bootstrapped by hand, which meant the
-- only way to make somebody an admin was for them to log in first, find their
-- DID, and have somebody with database access paste it in. The operator wants
-- to add colleagues from the admin screen, and the identifier they know is an
-- email address.
--
-- So an admin row may now be created with an email and no DID. The first time
-- a Privy session whose VERIFIED email matches signs in, `requireAdmin()` binds
-- the DID to the row and it behaves exactly as before. The DID remains the
-- identity that is trusted at request time; the email is an invitation, and it
-- is honoured only because Privy has verified it.
--
-- The primary key moves to a surrogate id because the DID is no longer known
-- at insert time. `listings.updated_by` keeps pointing at the DID, which is
-- what the audit trail wants.

alter table listings drop constraint listings_updated_by_fkey;
alter table admins drop constraint admins_pkey;

alter table admins add column id uuid not null default gen_random_uuid();
alter table admins add primary key (id);
alter table admins alter column privy_did drop not null;
alter table admins add constraint admins_privy_did_key unique (privy_did);

alter table admins add column email text unique
  check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$');
alter table admins add column added_by uuid references admins (id);
alter table admins add column bound_at timestamptz;
alter table admins add constraint admins_has_identity
  check (email is not null or privy_did is not null);

alter table listings add constraint listings_updated_by_fkey
  foreign key (updated_by) references admins (privy_did);

comment on column admins.email is
  'Invitation. Lower-case. Bound to a Privy DID on the first sign-in whose verified email matches.';
comment on column admins.bound_at is
  'When the invited email was first matched to a verified Privy session.';

-- Social links live on the dealer, beside the address and the WhatsApp number,
-- for the same reason those do: facts about the business that change without
-- the code changing, and editable from the admin screen.
alter table dealers add column if not exists instagram_url text;
alter table dealers add column if not exists facebook_url  text;
alter table dealers add column if not exists tiktok_url    text;
