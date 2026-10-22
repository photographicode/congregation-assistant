-- Read-only acceptance gate. Run against an isolated fully migrated database first.
-- No customer rows are selected or changed.
do $$
declare failures text;
begin
 if not exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) then raise exception 'RLS gate requires a populated isolated schema; an empty database is not evidence';end if;
 select string_agg(format('%I.%I (enabled=%s, forced=%s)',n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity),', ' order by c.relname)
 into failures
 from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p')
 and (not c.relrowsecurity or not c.relforcerowsecurity);
 if failures is not null then raise exception 'Exposed tables require enabled and forced RLS: %',failures;end if;
end $$;
