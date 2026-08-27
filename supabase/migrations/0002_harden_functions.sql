-- Security hardening, from the Supabase database linter.
--
-- Two findings were real and are fixed here. A third — "RLS enabled, no
-- policy" on profiles, deals, visits, payments and tila_snapshots — is
-- deliberate and is NOT fixed: see the RLS notes at the end of 0001. Those
-- tables are deny-all on purpose, because the session is issued by Privy and
-- everything reaches them through server routes running as the service role.

-- 1. Pin search_path on both trigger functions. A function with a role-mutable
--    search_path can be steered by whatever the calling role puts in front of
--    it. Neither needs a schema-qualified object (pg_catalog is always
--    implicitly searched), so an empty search_path costs nothing.

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function reject_tila_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'tila_snapshots is append-only: a signed Truth-in-Lending disclosure cannot be % (deal %)',
    tg_op, coalesce(old.deal_id::text, 'unknown');
end;
$$;

-- 2. Supabase installs an `rls_auto_enable` event trigger function and grants
--    EXECUTE to PUBLIC, which exposes it at /rest/v1/rpc/rls_auto_enable. An
--    event-trigger function errors when invoked directly, so the practical
--    risk is low, but there is no reason for the public roles to hold it.
--    Revoking does not affect the event trigger, which fires as its owner.
--
--    Note the grant to revoke is PUBLIC, not just anon/authenticated —
--    revoking only the named roles leaves the PUBLIC grant in place.
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
