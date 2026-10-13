-- Manual rollback only. Export V2 records before running. Never picked up by apply script.
begin;
do $$begin if exists(select 1 from public.congregation_access where role='weekend') then raise exception 'Reassign weekend roles before rollback';end if;end $$;
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ca_v2_%' loop execute format('drop function %s',f.signature);end loop;end $$;
drop function ca_private.v2_require(text,text[]);
drop function ca_private.v2_clean_weekend(jsonb);
drop table ca_private.weekend_publications,ca_private.weekend_history,ca_private.weekend_weeks,ca_private.v2_setup,ca_private.v2_import_batches,ca_private.v2_public_limits;
alter table public.publishers drop constraint publishers_group_cong_fk;
alter table public.publishers drop column group_id;
drop table public.service_groups;
alter table public.congregation_access drop constraint congregation_access_role_check;
alter table public.congregation_access add constraint congregation_access_role_check check(role in('admin','field_service','attendance','oclm','group_overseer','publisher','attendant','av','cleaning'));
commit;
