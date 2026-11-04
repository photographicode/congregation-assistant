-- Removes online payments. Download ca_private.payments first if any rows matter; congregation status and
-- payment_date set by past payments are kept.
drop function if exists public.ca_owner_payments();
drop function if exists public.ca_payment_mark_paid(text,text,integer);
drop function if exists public.ca_payment_link_created(text,text,integer,text);
drop function if exists public.ca_payment_begin(text);
drop function if exists ca_private.annual_price_paise();
drop table if exists ca_private.payments;
