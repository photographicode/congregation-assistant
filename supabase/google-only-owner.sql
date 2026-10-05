-- Retire owner password authorization in the backend as well as the login screen.
create or replace function public.ca_is_superadmin() returns boolean language sql stable security definer set search_path='' as $$select coalesce(auth.jwt()->'app_metadata'->>'provider'='google',false) and exists(select 1 from public.ca_superadmins a where a.active and a.email=lower(auth.jwt()->>'email'));$$;
revoke all on function public.ca_is_superadmin() from public,anon,authenticated;
grant execute on function public.ca_is_superadmin() to authenticated;
