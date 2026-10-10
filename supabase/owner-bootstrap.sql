-- Legacy bootstrap template only; Google-only ownership is the current production mechanism.
-- Replace the fictional operator placeholder only in a privately reviewed bootstrap plan, not public source.
-- Server-only initial owner password verification. Seed the digest privately.
create schema if not exists ca_private;
revoke all on schema ca_private from public,anon,authenticated;
create table if not exists ca_private.owner_bootstrap(username text primary key, password_digest text not null);
alter table ca_private.owner_bootstrap enable row level security;
revoke all on ca_private.owner_bootstrap from public,anon,authenticated;
create or replace function public.ca_owner_bootstrap_matches(p_password text) returns boolean language sql security definer set search_path='' as $$
 select length(p_password) between 10 and 128 and exists(
 select 1 from ca_private.owner_bootstrap b join public.ca_superadmins a on a.email='operator@example.com' and a.active
 where b.username='superadmin' and b.password_digest=extensions.crypt(p_password,b.password_digest));
$$;
create or replace function public.ca_consume_owner_bootstrap() returns void language sql security definer set search_path='' as $$ delete from ca_private.owner_bootstrap where username='superadmin'; $$;
revoke all on function public.ca_owner_bootstrap_matches(text),public.ca_consume_owner_bootstrap() from public,anon,authenticated;
grant execute on function public.ca_owner_bootstrap_matches(text),public.ca_consume_owner_bootstrap() to service_role;
