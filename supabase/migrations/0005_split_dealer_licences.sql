-- ---------------------------------------------------------------- 0005
-- Two licences, two columns, because they answer two questions.
--
-- `license_verified_at` has always meant the retail installment seller licence
-- — in Florida, Ch. 520, F.S. — which is what permits being the CREDITOR on a
-- contract payable in instalments. It was also, until now, the only licence
-- gate, so it was doing a second job it was never right for: deciding whether
-- the dealer may trade at all.
--
-- Those are different. A motor vehicle dealer licence (Ch. 320.27, F.S.) is
-- what permits buying and selling cars, and it is what a wholesale auction
-- checks before it lets anyone register to bid. A dealer holding it may sell a
-- car for cash, and may charge for a brokerage service, without ever touching
-- Ch. 520.
--
-- Conflating them refused a lawful cash sale, and a lawful service fee, on the
-- absence of a licence neither needs. That failed closed, which is why nothing
-- broke — but failing closed is not the same as being right, and the moment
-- there was something to sell that is not credit it started giving a wrong
-- answer to a real customer.

alter table dealers add column if not exists dealer_license_number      text;
alter table dealers add column if not exists dealer_license_verified_at timestamptz;

comment on column dealers.dealer_license_number is
  'Motor vehicle dealer licence (FL Ch. 320.27). Permits trading cars and bidding at wholesale auctions. Does NOT permit holding paper.';
comment on column dealers.dealer_license_verified_at is
  'When the dealer licence was verified against the issuing authority. Gates trading and services.';
comment on column dealers.license_number is
  'Retail installment seller licence (FL Ch. 520). Permits being the creditor on an instalment contract. Required IN ADDITION TO the dealer licence before any financed deal.';
comment on column dealers.license_verified_at is
  'When the retail installment seller licence was verified. Gates credit only — a cash sale does not need it.';
