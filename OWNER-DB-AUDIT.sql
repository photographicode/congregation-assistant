-- READ ONLY. Run one query at a time in the production Supabase SQL editor.
-- No congregation records or secret values are selected.
-- 1. RLS, privileges and policy counts.
select n.nspname as schema,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced,
 has_table_privilege('anon',c.oid,'select') as anon_can_select,has_table_privilege('authenticated',c.oid,'select') as auth_can_select,
 (select count(*) from pg_policy p where p.polrelid=c.oid) as policy_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname='public' order by c.relrowsecurity,c.relname;
-- 2. Bypass roles. Never FORCE RLS blindly.
select rolname,rolbypassrls,rolsuper from pg_roles where rolname in ('postgres','anon','authenticated','service_role','supabase_admin');
-- 3. Legacy credential/token column metadata only. Token columns require classification, not automatic deletion.
select table_schema,table_name,column_name,data_type from information_schema.columns
where table_schema in ('public','ca_private','private') and (column_name ilike '%password%' or column_name ilike '%secret%' or column_name ilike '%token%' or column_name ilike '%digest%') order by 1,2,3;
-- 4. Function exposure.
select p.proname as function_name,pg_get_userbyid(p.proowner) as owner,p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'execute') as anon_can_execute,has_function_privilege('authenticated',p.oid,'execute') as auth_can_execute,
 coalesce(array_to_string(p.proconfig,', '),'') as config
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by anon_can_execute desc,security_definer desc,p.proname;
-- 5. Definer functions without a fixed search_path.
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef
and not exists(select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%') order by 1;
-- 6. Direct table privileges.
select table_schema,table_name,grantee,string_agg(privilege_type,', ' order by privilege_type) as privileges
from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') group by 1,2,3 order by 1,2,3;
-- 7. ONLY if query 3 confirms this legacy column exists; count only.
-- select count(*) filter(where admin_password is not null and admin_password<>'') as non_empty_admin_passwords from public.congregations;
-- Dashboard: Security advisors; unused auth provider; retired edge function; backups/PITR; JWT expiry.
