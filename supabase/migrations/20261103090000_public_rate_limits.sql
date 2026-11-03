-- Rate limits for the anonymous link RPCs, and a recent-months window for public report links.
-- Additive: each existing public function is moved to ca_private as <name>_unlimited, unchanged, and a
-- same-signature wrapper in public checks the limits and then calls it. Functions that do not exist on
-- this database are skipped. Down path: 20261103090000_public_rate_limits.down.sql.
-- Over the limit the wrapper raises SQLSTATE PT429, which PostgREST returns as HTTP 429.
create schema if not exists ca_private;
revoke all on schema ca_private from public,anon,authenticated;

create table if not exists ca_private.rate_limits(
 bucket text not null,
 window_start timestamptz not null,
 hits integer not null,
 primary key(bucket,window_start)
);
alter table ca_private.rate_limits enable row level security;
revoke all on ca_private.rate_limits from public,anon,authenticated;

-- Best effort: the gateway sets these headers; per-token limits are the dependable ones.
create or replace function ca_private.client_ip() returns text language plpgsql stable set search_path='' as $$
declare h json;
begin
 begin h=nullif(current_setting('request.headers',true),'')::json; exception when others then h=null; end;
 return coalesce(nullif(h->>'cf-connecting-ip',''),nullif(btrim(split_part(h->>'x-forwarded-for',',',1)),''),'unknown');
end $$;

-- Counts one hit in a fixed window and returns the new total. Keys are stored hashed, never as tokens.
create or replace function ca_private.rate_hit(p_scope text,p_key text,p_seconds integer) returns integer language plpgsql set search_path='' as $$
declare w timestamptz=to_timestamp(floor(extract(epoch from now())/p_seconds)*p_seconds);n integer;
begin
 insert into ca_private.rate_limits as r(bucket,window_start,hits) values(md5(p_scope||':'||coalesce(p_key,'')),w,1)
 on conflict(bucket,window_start) do update set hits=r.hits+1 returning hits into n;
 if random()<0.01 then delete from ca_private.rate_limits where window_start<now()-interval '2 days'; end if;
 return n;
end $$;

create or replace function ca_private.rate_guard(p_fn text,p_token text,p_token_limit integer,p_ip_limit integer,p_seconds integer) returns void language plpgsql set search_path='' as $$
begin
 if ca_private.rate_hit(p_fn||':token',p_token,p_seconds)>p_token_limit
 or ca_private.rate_hit(p_fn||':ip',ca_private.client_ip(),p_seconds)>p_ip_limit then
  raise exception 'Too many requests. Please wait a minute and try again.' using errcode='PT429';
 end if;
end $$;
revoke all on function ca_private.client_ip(),ca_private.rate_hit(text,text,integer),ca_private.rate_guard(text,text,integer,integer,integer) from public,anon,authenticated;

-- Public report links may only write the current calendar month and the two before it.
-- Report rows use service_year = calendar year + 1 from September, and month = calendar month - 1.
create or replace function ca_private.public_report_month_allowed(p_report jsonb) returns boolean language plpgsql stable set search_path='' as $$
declare y integer;m integer;chosen date;today date=(now() at time zone 'utc')::date;
begin
 begin y=(p_report->>'service_year')::integer;m=(p_report->>'month')::integer; exception when others then return false; end;
 if y is null or m is null or m<0 or m>11 then return false; end if;
 chosen=make_date(y-case when m+1>=9 then 1 else 0 end,m+1,1);
 return chosen<=date_trunc('month',today)::date and chosen>=(date_trunc('month',today)-interval '2 months')::date;
end $$;
revoke all on function ca_private.public_report_month_allowed(jsonb) from public,anon,authenticated;

do $do$
declare
 spec record;
 sig regprocedure;
begin
 for spec in select * from (values
  -- name, argument list, call arguments, return type, per-token limit, per-IP limit, window seconds
  ('get_public_link_context','p_token text','p_token','jsonb',300,60,60),
  ('submit_public_report','p_token text,p_report jsonb','p_token,p_report','boolean',120,30,600),
  ('get_attendance_meeting','p_token text','p_token','jsonb',120,60,60),
  ('submit_current_attendance','p_token text,p_date date,p_count integer','p_token,p_date,p_count','boolean',30,20,600),
  ('get_oclm_public_snapshot','p_token text','p_token','jsonb',600,120,60),
  ('get_oclm_public_revision','p_token text','p_token','timestamptz',600,120,60),
  ('ca_v2_exchange_weekend','p_token text','p_token','jsonb',20,20,600)
 ) as s(name,args,call,ret,token_limit,ip_limit,seconds)
 loop
  sig=to_regprocedure(format('public.%I(%s)',spec.name,regexp_replace(spec.args,'p_[a-z_]+ ','','g')));
  continue when sig is null or to_regprocedure(format('ca_private.%I(%s)',spec.name||'_unlimited',regexp_replace(spec.args,'p_[a-z_]+ ','','g'))) is not null;
  execute format('alter function %s set schema ca_private',sig);
  execute format('alter function ca_private.%I(%s) rename to %I',spec.name,regexp_replace(spec.args,'p_[a-z_]+ ','','g'),spec.name||'_unlimited');
  execute format('revoke all on function ca_private.%I(%s) from public,anon,authenticated',spec.name||'_unlimited',regexp_replace(spec.args,'p_[a-z_]+ ','','g'));
  execute format($f$create function public.%1$I(%2$s) returns %4$s language plpgsql security definer set search_path='' as $b$
begin
 perform ca_private.rate_guard(%1$L,p_token,%5$s,%6$s,%7$s);
 %8$s
 return ca_private.%9$I(%3$s);
end $b$$f$,spec.name,spec.args,spec.call,spec.ret,spec.token_limit,spec.ip_limit,spec.seconds,
   case when spec.name='submit_public_report' then 'if not ca_private.public_report_month_allowed(p_report) then raise exception ''Reports through a shared link are limited to the last three months. Ask your secretary to enter older reports.'' using errcode=''22023''; end if;' else '' end,
   spec.name||'_unlimited');
  execute format('revoke all on function public.%I(%s) from public',spec.name,regexp_replace(spec.args,'p_[a-z_]+ ','','g'));
  execute format('grant execute on function public.%I(%s) to anon,authenticated',spec.name,regexp_replace(spec.args,'p_[a-z_]+ ','','g'));
 end loop;
end $do$;
