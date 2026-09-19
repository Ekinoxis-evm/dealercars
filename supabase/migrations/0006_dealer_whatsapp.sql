-- ---------------------------------------------------------------- 0006
-- Where "contact us" actually goes.
--
-- On the dealer rather than in an env var, for the same reason the street
-- address is: it is a fact about this business that changes without the code
-- changing, and a second dealer would have a second number. An env var would
-- make a new phone number a redeploy.
--
-- Stored in the form wa.me expects — digits only, country code first, no plus
-- and no punctuation — because that is the only form the link works with, and
-- normalising at every call site is how one of them ends up not normalising.
alter table dealers add column if not exists whatsapp text
  check (whatsapp is null or whatsapp ~ '^[1-9][0-9]{7,14}$');

comment on column dealers.whatsapp is
  'WhatsApp number in wa.me form: country code first, digits only, no + or punctuation. E.g. 14075551234.';
