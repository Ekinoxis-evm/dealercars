-- ---------------------------------------------------------------- 0009
-- Supabase Auth replaces Privy.
--
-- The session is now issued by Supabase Auth (email and a one-time code or
-- link), so the login key on `profiles` and `admins` is the auth user id
-- rather than a Privy DID. The Privy-era rows are test data from before
-- launch and have no counterpart in auth.users; they are removed rather than
-- carried as orphans. Admin invitations by email survive untouched — they
-- bind to the auth user on the first sign-in whose verified email matches,
-- exactly as before.

-- profiles ------------------------------------------------------------
delete from profiles;
alter table profiles drop column privy_did;
alter table profiles add column user_id uuid not null unique
  references auth.users (id) on delete cascade;
create index profiles_user_id_idx on profiles (user_id);

-- admins ---------------------------------------------------------------
alter table listings drop constraint listings_updated_by_fkey;
alter table listings drop column updated_by;
alter table admins drop constraint admins_has_identity;
alter table admins drop column privy_did;
alter table admins add column user_id uuid unique
  references auth.users (id) on delete set null;
alter table admins add constraint admins_has_identity
  check (email is not null or user_id is not null);
-- The audit column points at the admin row itself now, not at a login key.
alter table listings add column updated_by uuid references admins (id);

comment on column admins.email is
  'Invitation. Lower-case. Bound to the Supabase Auth user on the first sign-in whose verified email matches.';
comment on column admins.bound_at is
  'When the invited email was first matched to a verified session.';
