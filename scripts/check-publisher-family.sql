\set ON_ERROR_STOP on
begin;
update public.congregations set status='active' where id in('a','b');
insert into public.publishers select (jsonb_populate_record(null::public.publishers,to_jsonb(p)||'{"id":"pub-parent","name":"Fictional Parent","phone":"FAMILY PRIVATE PHONE","address":"FAMILY PRIVATE ADDRESS","is_rp":false,"is_sp":false,"is_fm":false,"family_head_id":null}'::jsonb)).* from public.publishers p where id='pub-a';
insert into auth.users(id,email,email_confirmed_at) values('f1111111-1111-4111-8111-111111111111','family@example.com',now());
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.set_publisher_login('a','pub-a','[]','family@example.com');
select public.set_publisher_login('a','pub-parent','[]','family@example.com');
select test.assert(public.get_publisher_login('a','pub-parent')='["family@example.com"]','same email grants family reports');
reset role;
select test.assert((select count(*)=1 from public.congregation_access where cong_id='a' and email='family@example.com' and role='publisher'),'primary login is not duplicated or replaced');
select test.assert((select publisher_id='pub-a' from public.congregation_access where cong_id='a' and email='family@example.com' and role='publisher'),'primary personal record preserved');
set request.jwt.claims='{"sub":"f1111111-1111-4111-8111-111111111111","email":"family@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(jsonb_array_length(public.get_my_report_publishers('a'))=2,'only two approved report publishers');
select test.assert(public.get_my_family_report('a','pub-parent')::text not like '%FAMILY PRIVATE%' and not (public.get_my_family_report('a','pub-parent') ? 'contact'),'family report does not reveal contacts');
select test.assert(public.get_my_publisher_portal('a')->>'publisherId'='pub-a','contact and away APIs remain primary only');
select test.assert(jsonb_array_length(public.get_my_publisher_portal('a')->'reportPublishers')=2,'portal includes approved chooser');
do $$begin begin perform public.submit_family_report('a','pub-parent',true,2,12,'Wrong month','{"period":"An older month","record":null}');raise exception 'Wrong reporting month accepted';exception when serialization_failure then null;end;end $$;
select public.submit_family_report('a','pub-parent',true,2,12,'Fictional report',jsonb_build_object('period',public.get_my_family_report('a','pub-parent')->'report'->>'period','record',null)) as family_saved \gset
select test.assert(:'family_saved'::jsonb->'report'->'record'->>'studies'='2','family report saved to chosen publisher');
select test.assert(:'family_saved'::jsonb->'report'->'record'->>'auxiliaryPioneer'='true','original hours logic infers auxiliary pioneer');
do $$begin
begin perform public.submit_family_report('a','pub-parent',true,9,12,'stale overwrite',jsonb_build_object('period',public.get_my_family_report('a','pub-parent')->'report'->>'period','record',null));raise exception 'duplicate stale report accepted';exception when serialization_failure then null;end;
begin perform public.get_my_family_report('a','pub-b');raise exception 'foreign publisher report exposed';exception when insufficient_privilege then null;end;
begin perform public.get_my_report_publishers('b');raise exception 'foreign family list exposed';exception when insufficient_privilege then null;end;
begin perform public.set_publisher_login('a','pub-parent','["family@example.com"]','hijack@example.com');raise exception 'family user approved login';exception when insufficient_privilege then null;end;
end $$;
select public.submit_family_report('a','pub-parent',true,3,0,'Corrected',jsonb_build_object('period',:'family_saved'::jsonb->'report'->>'period','record',:'family_saved'::jsonb->'report'->'record'));
reset role;
select test.assert((select count(*)=1 from public.reports where cong_id='a' and pub_id='pub-parent'),'correction retains one natural-key report');
select test.assert(not has_table_privilege('authenticated','ca_private.publisher_report_access','SELECT'),'no direct family permission table access');
select test.assert(not has_function_privilege('anon','public.submit_family_report(text,text,boolean,integer,numeric,text,jsonb)','EXECUTE'),'anonymous family reporting denied');
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.export_congregation_workspace('a') as family_backup \gset
select test.assert(:'family_backup'::jsonb->'data'->'publisherReportAccess'->0->>'publisher_id'='pub-parent','recovery exports approvals for review');
select public.set_publisher_login('a','pub-parent','["family@example.com"]','');
select public.export_congregation_workspace('a') as current_family_backup \gset
select public.restore_congregation_workspace('a',:'current_family_backup'::jsonb->>'fingerprint',:'family_backup'::jsonb->'data');
select test.assert(public.get_publisher_login('a','pub-parent')='[]','old backup cannot re-enable revoked family access');
reset role;
set request.jwt.claims='{"sub":"f1111111-1111-4111-8111-111111111111","email":"family@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(jsonb_array_length(public.get_my_report_publishers('a'))=1,'revocation removes family chooser entry');
do $$begin begin perform public.get_my_family_report('a','pub-parent');raise exception 'revoked family access accepted';exception when insufficient_privilege then null;end;end $$;
reset role;
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.set_publisher_login('a','pub-parent','[]','family@example.com');
reset role;update public.publishers set transferred_at=now() where id='pub-parent';
set request.jwt.claims='{"sub":"f1111111-1111-4111-8111-111111111111","email":"family@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(jsonb_array_length(public.get_my_report_publishers('a'))=1,'transferred family member disappears');
do $$begin begin perform public.get_my_family_report('a','pub-parent');raise exception 'transferred family access accepted';exception when insufficient_privilege then null;end;end $$;
reset role;update public.publishers set transferred_at=now() where id='pub-a';set role authenticated;
do $$begin begin perform public.get_my_report_publishers('a');raise exception 'transferred primary account retained family access';exception when insufficient_privilege then null;end;end $$;
reset role;
rollback;
\echo PASS family reporting: primary identity preserved, report-only approval, tenant denial, stale corrections, revocation, transfer and recovery
