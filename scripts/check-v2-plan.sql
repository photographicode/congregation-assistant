\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status,created_at) values('plan-active','Fictional active','active',now()),('plan-expired','Fictional expired','expired',now()),('plan-trial','Fictional old trial','trial',now()-interval '60 days');
insert into public.publishers(id,cong_id,name) values('plan-publisher','plan-trial','Fictional Publisher');
insert into public.congregation_access(cong_id,email,role,active,publisher_id) values('plan-active','plan@example.invalid','admin',true,null),('plan-expired','plan@example.invalid','admin',true,null),('plan-trial','plan@example.invalid','publisher',true,'plan-publisher');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","email":"plan@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select test.assert(not(public.ca_v2_workspace_plan('plan-active')->>'locked')::boolean,'Active plan open');
select test.assert((public.ca_v2_workspace_plan('plan-expired')->>'locked')::boolean,'Expired plan locked');
select test.assert((public.ca_v2_workspace_plan('plan-trial')->>'locked')::boolean,'Old trial locked by server');
select test.assert(public.ca_v2_export_records('plan-expired')->>'congregation'='plan-expired','Own admin can export expired records');
do $$begin begin perform public.ca_v2_export_records('plan-trial');raise exception 'Publisher exported full records';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000124","email":"other@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$begin begin perform public.ca_v2_workspace_plan('plan-active');raise exception 'Other account read billing';exception when insufficient_privilege then null;end;end $$;
rollback;
