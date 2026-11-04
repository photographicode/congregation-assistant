-- Online payment through Razorpay Payment Links. The price lives here, never in the browser; Razorpay keys
-- stay in edge-function secrets. A payment counts only after a Razorpay signature check in an edge function.
-- Paying happens on Razorpay's own page, so the app loads no third-party script.
create table if not exists ca_private.payments(
 id uuid primary key default gen_random_uuid(),
 cong_id text not null references public.congregations(id) on delete cascade,
 link_id text not null unique check(link_id ~ '^plink_[A-Za-z0-9]{6,40}$'),
 payment_id text unique check(payment_id is null or payment_id ~ '^pay_[A-Za-z0-9]{6,40}$'),
 amount_paise integer not null check(amount_paise>0),
 currency text not null default 'INR' check(currency='INR'),
 status text not null default 'created' check(status in ('created','paid')),
 requested_by text not null,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
alter table ca_private.payments enable row level security;
revoke all on ca_private.payments from public,anon,authenticated;
create index if not exists payments_cong_idx on ca_private.payments(cong_id,created_at desc);

-- Annual congregation access in paise. Keep in step with "pricing.current" on the website.
create or replace function ca_private.annual_price_paise() returns integer language sql immutable set search_path='' as $$ select 149900 $$;
revoke all on function ca_private.annual_price_paise() from public,anon,authenticated;

-- Step 1, called with the main administrator's own sign-in: who is paying and how much.
create or replace function public.ca_payment_begin(p_cong_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.congregations;
begin
 if not ca_private.v2_admin_identity(p_cong_id) then
  raise exception 'Only the main administrator can pay for the congregation.' using errcode='42501';
 end if;
 perform ca_private.rate_guard('ca_payment_begin',p_cong_id,10,20,3600);
 select * into strict c from public.congregations where id=p_cong_id;
 return jsonb_build_object('cong_id',c.id,'name',c.name,'email',lower(auth.jwt()->>'email'),
  'amount_paise',ca_private.annual_price_paise(),'currency','INR');
end $$;
revoke all on function public.ca_payment_begin(text) from public,anon,authenticated;
grant execute on function public.ca_payment_begin(text) to authenticated;

-- Step 2, edge function only: remember the payment link so a later payment can be matched to it.
create or replace function public.ca_payment_link_created(p_cong_id text,p_link_id text,p_amount_paise integer,p_email text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Payment worker access required' using errcode='42501'; end if;
 if p_amount_paise<>ca_private.annual_price_paise() then raise exception 'Amount does not match the price' using errcode='22023'; end if;
 insert into ca_private.payments(cong_id,link_id,amount_paise,requested_by) values(p_cong_id,p_link_id,p_amount_paise,lower(trim(p_email)));
end $$;
revoke all on function public.ca_payment_link_created(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.ca_payment_link_created(text,text,integer,text) to service_role;

-- Step 3, edge function only, after the Razorpay signature is verified: mark the link paid and open
-- the workspace. Safe to call twice (the return page and the webhook both arrive). p_amount_paise is null
-- from the return page, where the signature already binds the payment to our fixed-amount link.
create or replace function public.ca_payment_mark_paid(p_link_id text,p_payment_id text,p_amount_paise integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p ca_private.payments;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Payment worker access required' using errcode='42501'; end if;
 select * into p from ca_private.payments where link_id=p_link_id for update;
 if not found then raise exception 'Unknown payment link' using errcode='P0002'; end if;
 if p_amount_paise is not null and p_amount_paise<>p.amount_paise then raise exception 'Amount does not match the payment link' using errcode='22023'; end if;
 if p.status='paid' then return jsonb_build_object('cong_id',p.cong_id,'already_paid',true); end if;
 update ca_private.payments set status='paid',payment_id=p_payment_id,paid_at=now() where id=p.id;
 update public.congregations set status='active',payment_date=(now() at time zone 'Asia/Kolkata')::date where id=p.cong_id;
 return jsonb_build_object('cong_id',p.cong_id,'already_paid',false);
end $$;
revoke all on function public.ca_payment_mark_paid(text,text,integer) from public,anon,authenticated;
grant execute on function public.ca_payment_mark_paid(text,text,integer) to service_role;

-- Owner view of every online payment.
create or replace function public.ca_owner_payments() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'Owner access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'cong_id',p.cong_id,'name',c.name,'link_id',p.link_id,
  'payment_id',p.payment_id,'amount_paise',p.amount_paise,'status',p.status,'requested_by',p.requested_by,
  'created_at',p.created_at,'paid_at',p.paid_at) order by p.created_at desc)
  from ca_private.payments p join public.congregations c on c.id=p.cong_id),'[]'::jsonb);
end $$;
revoke all on function public.ca_owner_payments() from public,anon,authenticated;
grant execute on function public.ca_owner_payments() to authenticated;
