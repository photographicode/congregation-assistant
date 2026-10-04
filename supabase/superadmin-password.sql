create or replace function public.ca_is_superadmin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ca_superadmins a where a.active and a.email=lower(auth.jwt()->>'email')
 and (public.ca_google_identity() or (
 auth.jwt()->'app_metadata'->>'provider'='email' and exists(
 select 1 from auth.users u where u.id=auth.uid() and lower(u.email)=a.email and u.email_confirmed_at is not null))));
$$;
revoke all on function public.ca_is_superadmin() from public,anon;
grant execute on function public.ca_is_superadmin() to authenticated;