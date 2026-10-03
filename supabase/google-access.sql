-- Review audit-access.sql results before running this migration in Supabase SQL Editor.
-- Configures account membership only; other data tables/RPCs need their own verified RLS.
begin;
create table if not exists public.congregation_access (
 id uuid primary key default gen_random_uuid(),
 cong_id text not null,
 email text not null,
 role text not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(cong_id,email,role)
);
-- Refuse to run over unknown policies rather than silently preserving a public bypass.
do $$
begin
 if exists(select 1 from pg_catalog.pg_policies where schemaname='public'
  and tablename='congregation_access' and policyname not in
  ('ca_access_read','ca_access_insert','ca_access_update','ca_access_delete')) then
  raise exception 'Existing access policies require review. Run audit-access.sql first.';
 end if;
end $$;
alter table public.congregation_access drop constraint if exists congregation_access_role_check;
alter table public.congregation_access add constraint congregation_access_role_check
 check (role in ('admin','field_service','attendance','oclm'));
update public.congregation_access set email=lower(trim(email)) where email<>lower(trim(email));
-- Case-normalized identity uniqueness; duplicate historical emails stop this migration.
create unique index if not exists ca_access_email_role_unique
 on public.congregation_access(cong_id,lower(email),role);
alter table public.congregation_access enable row level security;

create or replace function public.ca_is_congregation_admin(_cong_id text)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.congregation_access a
  where a.cong_id=_cong_id and a.active and a.role='admin'
  and lower(a.email)=lower(auth.jwt()->>'email')
  and (auth.jwt()->'app_metadata'->>'provider'='google'
   or (auth.jwt()->'app_metadata'->'providers') ? 'google'));
$$;
revoke all on function public.ca_is_congregation_admin(text) from public,anon;
grant execute on function public.ca_is_congregation_admin(text) to authenticated;
revoke all on public.congregation_access from anon;
grant select,insert,update,delete on public.congregation_access to authenticated;

drop policy if exists ca_access_read on public.congregation_access;
create policy ca_access_read on public.congregation_access for select to authenticated
 using ((active and lower(email)=lower(auth.jwt()->>'email')
  and (auth.jwt()->'app_metadata'->>'provider'='google'
   or (auth.jwt()->'app_metadata'->'providers') ? 'google')) or public.ca_is_congregation_admin(cong_id));
drop policy if exists ca_access_insert on public.congregation_access;
create policy ca_access_insert on public.congregation_access for insert to authenticated
 with check (public.ca_is_congregation_admin(cong_id));
drop policy if exists ca_access_update on public.congregation_access;
create policy ca_access_update on public.congregation_access for update to authenticated
 using (public.ca_is_congregation_admin(cong_id)) with check (public.ca_is_congregation_admin(cong_id));
drop policy if exists ca_access_delete on public.congregation_access;
create policy ca_access_delete on public.congregation_access for delete to authenticated
 using (public.ca_is_congregation_admin(cong_id));
commit;

-- Bootstrap the first Google administrator ONLY from this trusted SQL editor.
-- Replace both values with the actual congregation ID and the administrator's Google email.
-- insert into public.congregation_access(cong_id,email,role,active)
-- values ('YOUR_CONGREGATION_ID','admin@example.com','admin',true)
-- on conflict(cong_id,email,role) do update set active=true;
