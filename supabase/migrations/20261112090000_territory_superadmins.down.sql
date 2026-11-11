-- Back to main-app owners only: territory functions keep calling tm_is_superadmin(), which now checks ca_is_superadmin() alone.
create or replace function ca_private.tm_is_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select public.ca_is_superadmin()
$$;
drop function if exists public.tm_am_superadmin();
drop table if exists ca_private.tm_superadmins;
