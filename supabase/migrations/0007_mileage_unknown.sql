-- Mileage is not always known when a car is listed.
--
-- The lot is seeded from the dealer's own site, which states a mileage for a
-- minority of cars. A required column forced an invented figure — zero, or a
-- guess — into a field that underwriting reads and a member sees on the card.
-- An absent number is honest; a made-up one is a misstatement in an
-- advertisement. Unknown mileage renders as "to be confirmed" and fails the
-- ability-to-pay gate until somebody records it.
alter table listings alter column mileage drop not null;
