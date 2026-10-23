-- Read-only catalog gate. Production evidence remains separate from isolated tests.
-- FORCE is not required: definer owners may need deliberate RLS bypass.
do $$
declare failures text;
begin
 if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')) then raise exception 'RLS gate requires a populated isolated schema';end if;
 if exists(select 1 from pg_roles where rolname in ('anon','authenticated') and (rolbypassrls or rolsuper)) then raise exception 'Client roles must not bypass RLS';end if;
 select string_agg(format('%I.%I',n.nspname,c.relname),', ') into failures
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and not c.relrowsecurity;
 if failures is not null then raise exception 'Exposed tables require enabled RLS: %',failures;end if;
 -- No direct anonymous table operations are intentional. Public APIs are narrow RPCs.
 select string_agg(c.relname,', ') into failures from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER');
 if failures is not null then raise exception 'Unreviewed anonymous table privileges: %',failures;end if;
 -- Each authenticated CRUD grant must have an intentional permissive policy for that operation.
 select string_agg(c.relname||':'||v.privilege,', ') into failures
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values ('SELECT','r'),('INSERT','a'),('UPDATE','w'),('DELETE','d')) v(privilege,cmd)
 where n.nspname='public' and c.relkind in ('r','p') and has_table_privilege('authenticated',c.oid,v.privilege)
 and not exists(select 1 from pg_policy p where p.polrelid=c.oid and p.polcmd::text in ('*',v.cmd) and p.polpermissive and (0=any(p.polroles) or (select oid from pg_roles where rolname='authenticated')=any(p.polroles)));
 if failures is not null then raise exception 'Authenticated privileges without intended policies: %',failures;end if;
 select string_agg(format('%I.%I',n.nspname,c.relname),', ') into failures
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname in ('ca_private','ca_migrations','ca_ap_private','private') and c.relkind in ('r','p')
 and (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'));
 if failures is not null then raise exception 'Internal tables must not have direct client privileges: %',failures;end if;
end $$;
