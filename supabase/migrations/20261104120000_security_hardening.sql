-- Security hardening from the 2026-11-04 audit. Needs 20261103090000_public_rate_limits.sql first.
-- Additive and safe to re-run. Down path: 20261104120000_security_hardening.down.sql.

-- 1. Owner access stays Google-only even if an older patch file was run after the migrations.
create or replace function public.ca_is_superadmin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and coalesce(auth.jwt()->'app_metadata'->>'provider'='google',false)
 and exists(select 1 from public.ca_superadmins s where s.active and s.email=lower(auth.jwt()->>'email'));
$$;
revoke all on function public.ca_is_superadmin() from public,anon,authenticated;
grant execute on function public.ca_is_superadmin() to authenticated;

-- 2. Workspace requests: 3 per hour from one address, so one script cannot fill the global hourly cap.
do $do$
begin
 if to_regprocedure('public.submit_workspace_application(text,text,text,text,text,boolean,text)') is null
 or to_regprocedure('ca_private.submit_workspace_application_unlimited(text,text,text,text,text,boolean,text)') is not null then return; end if;
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
end $do$;

-- 3. The app no longer calls get_public_attendance; it returned a whole month without a rate limit.
do $do$
begin
 if to_regprocedure('public.get_public_attendance(text,integer,integer)') is not null then
  revoke all on function public.get_public_attendance(text,integer,integer) from public,anon;
 end if;
end $do$;
