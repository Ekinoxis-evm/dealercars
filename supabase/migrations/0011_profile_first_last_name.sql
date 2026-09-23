-- ---------------------------------------------------------------- 0011
-- First and last name as the wizard asks for them. `full_name` stays as the
-- joined form so everything that prints a name keeps working; the route keeps
-- the three in step.
alter table profiles add column if not exists first_name text;
alter table profiles add column if not exists last_name text;
