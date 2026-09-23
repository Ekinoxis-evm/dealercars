-- ---------------------------------------------------------------- 0010
-- The county the member's address resolves to (Google Places
-- administrative_area_level_2, e.g. "Osceola County"). In Florida the sales
-- surtax follows the county of registration, so this is a tax input, not a
-- convenience. Free text as the geocoder names it; unverified until signing.
alter table profiles add column if not exists county text;
