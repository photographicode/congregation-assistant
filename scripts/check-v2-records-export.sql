\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('export-a','Fictional A','active'),('export-b','Fictional B','active');
insert into public.congregation_access(cong_id,email,role,active) values('export-a','export@example.invalid','admin',true);
insert into public.service_groups(cong_id,name) values('export-a','Own group'),('export-b','Other group');
insert into ca_private.weekend_weeks(cong_id,week,data) values('export-a','2026-10-12','{"chairman":"Fictional Person"}'),('export-b','2026-10-12','{"chairman":"Other Person"}');
insert into ca_private.weekend_publications(cong_id,week,token_hash,snapshot,revision) values('export-a','2026-10-12','SECRET_HASH_NOT_EXPORTED','{"speaker":"Fictional Visitor"}',1);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","email":"export@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$declare value jsonb;begin
 value=public.ca_v2_export_records('export-a');
 if jsonb_array_length(value->'serviceGroups')<>1 or value->'serviceGroups'->0->>'name'<>'Own group' then raise exception 'Group tenant isolation failed';end if;
 if jsonb_array_length(value->'weekendWeeks')<>1 or value->'weekendWeeks'->0->'data'->>'chairman'<>'Fictional Person' then raise exception 'Weekend export incomplete';end if;
 if value::text like '%SECRET_HASH_NOT_EXPORTED%' then raise exception 'Bearer hash leaked into records export';end if;
 begin perform public.ca_v2_export_records('export-b');raise exception 'Other tenant export accepted';exception when insufficient_privilege then null;end;
end $$;
rollback;
