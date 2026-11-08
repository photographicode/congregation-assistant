-- Security follow-ups from the 6 Nov 2026 review. Safe to run more than once.

-- 1. Re-running an older root .sql file replaces a rate-limited public function with its original,
--    unlimited body. Put the wrapper back wherever its rate_guard call is missing.
do $do$
declare
 spec record;
 sig regprocedure;
 types text;
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
  types=regexp_replace(spec.args,'p_[a-z_]+ ','','g');
  sig=to_regprocedure(format('public.%I(%s)',spec.name,types));
  continue when sig is null or position('rate_guard' in pg_get_functiondef(sig))>0;
  execute format('drop function if exists ca_private.%I(%s)',spec.name||'_unlimited',types);
  execute format('alter function %s set schema ca_private',sig);
  execute format('alter function ca_private.%I(%s) rename to %I',spec.name,types,spec.name||'_unlimited');
  execute format('revoke all on function ca_private.%I(%s) from public,anon,authenticated',spec.name||'_unlimited',types);
  execute format($f$create function public.%1$I(%2$s) returns %4$s language plpgsql security definer set search_path='' as $b$
begin
 perform ca_private.rate_guard(%1$L,p_token,%5$s,%6$s,%7$s);
 %8$s
 return ca_private.%9$I(%3$s);
end $b$$f$,spec.name,spec.args,spec.call,spec.ret,spec.token_limit,spec.ip_limit,spec.seconds,
   case when spec.name='submit_public_report' then 'if not ca_private.public_report_month_allowed(p_report) then raise exception ''Reports through a shared link are limited to the last three months. Ask your secretary to enter older reports.'' using errcode=''22023''; end if;' else '' end,
   spec.name||'_unlimited');
  execute format('revoke all on function public.%I(%s) from public',spec.name,types);
  execute format('grant execute on function public.%I(%s) to anon,authenticated',spec.name,types);
  raise notice 'Restored the rate limit on %',spec.name;
 end loop;

 -- Workspace requests have their own per-address wrapper.
 sig=to_regprocedure('public.submit_workspace_application(text,text,text,text,text,boolean,text)');
 if sig is not null and position('rate_hit' in pg_get_functiondef(sig))=0 then
  drop function if exists ca_private.submit_workspace_application_unlimited(text,text,text,text,text,boolean,text);
  alter function public.submit_workspace_application(text,text,text,text,text,boolean,text) set schema ca_private;
  alter function ca_private.submit_workspace_application(text,text,text,text,text,boolean,text) rename to submit_workspace_application_unlimited;
  revoke all on function ca_private.submit_workspace_application_unlimited(text,text,text,text,text,boolean,text) from public,anon,authenticated;
  create function public.submit_workspace_application(p_name text,p_contact_email text,p_admin_email text,p_congregation text,p_phone text,p_authorized boolean,p_website text default '')
  returns jsonb language plpgsql security definer set search_path='' as $b$
  begin
   if ca_private.rate_hit('submit_workspace_application:ip',ca_private.client_ip(),3600)>3 then
    raise exception 'Too many requests. Please wait an hour and try again.' using errcode='PT429';
   end if;
   return ca_private.submit_workspace_application_unlimited(p_name,p_contact_email,p_admin_email,p_congregation,p_phone,p_authorized,p_website);
  end $b$;
  revoke all on function public.submit_workspace_application(text,text,text,text,text,boolean,text) from public;
  grant execute on function public.submit_workspace_application(text,text,text,text,text,boolean,text) to anon,authenticated;
  raise notice 'Restored the rate limit on submit_workspace_application';
 end if;
end $do$;

-- 2. Old public functions the app no longer calls. They had no rate limit, and each ca_v2_public_weekend
--    call added a row that was never cleaned up.
do $do$
begin
 if to_regprocedure('public.get_public_attendance(text,integer,integer)') is not null then
  revoke all on function public.get_public_attendance(text,integer,integer) from public,anon,authenticated;
 end if;
 if to_regprocedure('public.submit_public_attendance(text,integer,integer,jsonb)') is not null then
  revoke all on function public.submit_public_attendance(text,integer,integer,jsonb) from public,anon,authenticated;
 end if;
 if to_regprocedure('public.ca_v2_public_weekend(text)') is not null then
  revoke all on function public.ca_v2_public_weekend(text) from public,anon,authenticated;
 end if;
 if to_regclass('ca_private.v2_public_limits') is not null then
  delete from ca_private.v2_public_limits where bucket<now()-interval '2 days';
 end if;
end $do$;

-- 3. A scoped report link cannot be widened to the whole congregation by an update either.
--    Older congregation-wide links can still be updated (for example rotated) until they are replaced.
create or replace function ca_private.report_link_scope() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='report' and new.service_group is null and new.pub_id is null
 and (tg_op='INSERT' or old.service_group is not null or old.pub_id is not null) then
  raise exception 'Report links now cover one group. Choose a group and create a link for each.' using errcode='22023';
 end if;
 return new;
end $$;
drop trigger if exists report_link_scope on public.ca_public_links;
create trigger report_link_scope before insert or update on public.ca_public_links for each row execute function ca_private.report_link_scope();

-- 4. One query to check the live database after running any older file:
--    select * from ca_private.security_selfcheck();   (no rows = all good)
create or replace function ca_private.security_selfcheck() returns table(problem text) language plpgsql stable set search_path='' as $$
declare sig regprocedure; name text;
begin
 sig=to_regprocedure('public.ca_is_superadmin()');
 if sig is not null and position('=''email''' in replace(pg_get_functiondef(sig),' ',''))>0 then
  problem='ca_is_superadmin accepts password sign-in again: re-run 20261104120000_security_hardening.sql'; return next;
 end if;
 foreach name in array array['get_public_link_context(text)','submit_public_report(text,jsonb)','get_attendance_meeting(text)',
  'submit_current_attendance(text,date,integer)','get_oclm_public_snapshot(text)','get_oclm_public_revision(text)','ca_v2_exchange_weekend(text)'] loop
  sig=to_regprocedure('public.'||name);
  if sig is not null and position('rate_guard' in pg_get_functiondef(sig))=0 then
   problem=name||' has no rate limit: re-run 20261106090000_security_followups.sql'; return next;
  end if;
 end loop;
 sig=to_regprocedure('public.submit_workspace_application(text,text,text,text,text,boolean,text)');
 if sig is not null and position('rate_hit' in pg_get_functiondef(sig))=0 then
  problem='submit_workspace_application has no rate limit: re-run 20261106090000_security_followups.sql'; return next;
 end if;
 if has_column_privilege('authenticated','public.congregations','email','select') then
  problem='Members can read congregation email and notes: re-run 20261104130000_audit_followups_territory_requests.sql'; return next;
 end if;
 for name in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity loop
  problem='Row level security is off on public.'||name; return next;
 end loop;
end $$;
revoke all on function ca_private.security_selfcheck() from public,anon,authenticated;
