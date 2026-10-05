\set ON_ERROR_STOP on
begin;
insert into public.congregation_access(cong_id,email,role,publisher_id) values('a','own-publisher@example.com','publisher','pub-a');
set request.jwt.claims='{"email":"own-publisher@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(public.get_my_publisher_home('a')->>'name'='Sample Person A','publisher sees own name');
select test.assert(public.get_my_publisher_home('a')::text not like '%PRIVATE%' and public.get_my_publisher_home('a')::text not like '%Sample Person B%','personal home contains no contact fields or other congregation');
select test.assert(jsonb_array_length(public.get_my_publisher_home('a')->'assignments')=1,'personal home uses own publisher binding');
select test.assert((select count(*)=0 from public.publishers),'publisher cannot list private roster');
select test.assert((select count(*)=0 from public.reports),'publisher cannot list congregation reports');
select public.submit_my_publisher_report('a',true,2,0,'Own report',false);
select test.assert((public.get_my_publisher_home('a')->'report'->>'submitted')::boolean,'own report status saved');
do $$begin begin perform public.get_my_publisher_home('b');raise exception 'other home accessible';exception when insufficient_privilege then null;end;begin perform public.submit_my_publisher_report('b',true,1,0,'',false);raise exception 'other report submitted';exception when insufficient_privilege then null;end;end$$;
reset role;
do $$begin begin insert into public.congregation_access(cong_id,email,role,publisher_id) values('a','foreign-publisher@example.com','publisher','pub-b');raise exception 'foreign binding accepted';exception when foreign_key_violation then null;end;end$$;
rollback;
\echo PASS publisher binding, own assignments and report, no private roster and cross-congregation denial
