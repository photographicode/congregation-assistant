-- DOWN: restores empty schema only; deleted password material is not recoverable.
-- Approved Google-only SuperAdmin authorization remains in force.
alter table public.congregations add column if not exists admin_password text;
create table if not exists public.group_access(
 id uuid primary key default gen_random_uuid(),
 cong_id text not null references public.congregations(id) on delete cascade,
 service_group text,password text,unique(cong_id,service_group)
);
alter table public.group_access enable row level security;
revoke all on public.group_access from public,anon,authenticated;
create schema if not exists ca_private;
create table if not exists ca_private.owner_bootstrap(username text primary key,password_digest text not null);
alter table ca_private.owner_bootstrap enable row level security;
revoke all on ca_private.owner_bootstrap from public,anon,authenticated;
