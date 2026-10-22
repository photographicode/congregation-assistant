-- Metadata only: no record contents, credentials or tokens.
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname not in ('pg_catalog','information_schema') and n.nspname not like 'pg_toast%' and c.relkind in ('r','p')
order by n.nspname,c.relname;
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef as definer,p.proconfig as configuration,
has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute,
has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by p.proname,arguments;
