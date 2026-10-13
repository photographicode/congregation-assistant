-- UP. Owner-run only after all cutover parity and authorization gates pass.
-- No CASCADE: unexpected dependencies must stop this migration for review.
do $$ begin
 if current_setting('ca.allow_legacy_auth_drop',true) is distinct from 'on' then
  raise exception 'Legacy authentication removal requires reviewed cutover and SET ca.allow_legacy_auth_drop = on';
 end if;
end $$;
create or replace function public.ca_is_superadmin() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and coalesce(auth.jwt()->'app_metadata'->>'provider'='google',false)
 and exists(select 1 from public.ca_superadmins s where s.active and s.email=lower(auth.jwt()->>'email'));
$$;
drop function if exists public.ca_owner_bootstrap_matches(text);
drop function if exists public.ca_consume_owner_bootstrap();
drop table if exists ca_private.owner_bootstrap;
drop table if exists public.group_access;
alter table public.congregations drop column if exists admin_password;
