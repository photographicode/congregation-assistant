-- Run in the target Supabase SQL editor or with psql -v ON_ERROR_STOP=1 -f.
-- Metadata only: no congregation records or credential values are selected.
begin isolation level repeatable read read only;
set local statement_timeout = '15s';

-- Missing tables and row-level security flags.
with expected(name) as (values ('congregations'),('publishers'),('reports'),
 ('meeting_attendance'),('group_access'),('congregation_access'))
select e.name as table_name, c.oid is not null as exists,
 c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls,
 (select count(*) from pg_catalog.pg_policy p where p.polrelid=c.oid) as policy_count
from expected e
left join pg_catalog.pg_namespace n on n.nspname='public'
left join pg_catalog.pg_class c on c.relnamespace=n.oid and c.relname=e.name and c.relkind in ('r','p')
order by e.name;

-- Review each predicate: USING governs existing rows, WITH CHECK governs writes.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname='public' and tablename in ('congregations','publishers','reports',
 'meeting_attendance','group_access','congregation_access')
order by tablename, policyname;

-- Table and column grants matter alongside policies, including PUBLIC grants.
select grantee, table_name, privilege_type
from information_schema.table_privileges
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
 and table_name in ('congregations','publishers','reports','meeting_attendance','group_access','congregation_access')
order by table_name, grantee, privilege_type;
select grantee, table_name, column_name, privilege_type
from information_schema.column_privileges
where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
 and column_name in ('admin_password','password','group_password')
order by table_name, column_name, grantee;

-- Presence of legacy credential columns; never read their contents.
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and column_name in ('admin_password','password','group_password')
order by table_name, column_name;

-- SECURITY DEFINER bypasses caller permissions; audit predicates/search_path.
select n.nspname as schema_name, p.proname as function_name,
 pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
 p.prosecdef as security_definer, p.proconfig as function_settings,
 p.proacl as execute_acl,
 pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prokind='f' and p.proname in
 ('get_oclm_state','save_oclm_state','upsert_oclm_public_snapshot','get_oclm_public_snapshot')
order by p.proname;
rollback;
