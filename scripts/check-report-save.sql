\set ON_ERROR_STOP on
begin;
update public.congregations set status='active' where id in('a','b');
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';
-- Simulate a report first submitted by a publisher: a UUID, not a browser-generated ID.
insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
values('33333333-3333-4333-8333-333333333333','a','pub-a',2199,7,true,3,30,'AP remarks',true);
-- A publisher corrected the report after the admin's last refresh.
update public.reports set studies=7,shared_in_ministry=false where id='33333333-3333-4333-8333-333333333333';
set role authenticated;
select public.save_congregation_reports('a','[{"id":"pub-a_2199_7","cong_id":"a","pub_id":"pub-a","service_year":2199,"month":7,"shared_in_ministry":true,"studies":3,"hours":0,"comments":"","is_ap":false,"clear_auxiliary":true}]');
select test.assert((select count(*)=1 from public.reports where pub_id='pub-a' and service_year=2199 and month=7),'revocation never creates a second report');
select test.assert((select id='33333333-3333-4333-8333-333333333333' and not is_ap and hours=0 and studies=7 and not shared_in_ministry and comments='' from public.reports where pub_id='pub-a' and service_year=2199 and month=7),'AP revocation preserves ID and newer ministry/study corrections');
select public.save_congregation_reports('a','[{"cong_id":"a","pub_id":"pub-a","service_year":2199,"month":7,"shared_in_ministry":true,"studies":4,"hours":10,"comments":"Corrected","is_ap":true},{"cong_id":"a","pub_id":"pub-a","service_year":2199,"month":6,"shared_in_ministry":true,"studies":2,"hours":0,"comments":"Imported","is_ap":false}]');
select test.assert((select id='33333333-3333-4333-8333-333333333333' and studies=4 from public.reports where pub_id='pub-a' and service_year=2199 and month=7),'repeat edit/import keeps the existing ID');
do $$begin
 begin perform public.save_congregation_reports('a','[{"cong_id":"a","pub_id":"pub-a","service_year":2199,"month":7,"studies":99},{"cong_id":"a","pub_id":"pub-b","service_year":2199,"month":7}]');raise exception 'Foreign publisher accepted';exception when insufficient_privilege then null;end;
 begin perform public.save_congregation_reports('a','[{"cong_id":"a","pub_id":"pub-a","service_year":2199,"month":7},{"cong_id":"a","pub_id":"pub-a","service_year":2199,"month":7}]');raise exception 'Duplicate batch accepted';exception when raise_exception then if sqlerrm='Duplicate batch accepted' then raise;end if;end;
end$$;
select test.assert((select studies=4 from public.reports where pub_id='pub-a' and service_year=2199 and month=7),'failed batch rolls back earlier row changes');
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"pub-a@example.com","app_metadata":{"provider":"google"}}';
do $$begin begin perform public.save_congregation_reports('a','[]');raise exception 'Publisher used admin API';exception when insufficient_privilege then null;end;end$$;
reset role;
select test.assert(not has_function_privilege('anon','public.save_congregation_reports(text,jsonb)','EXECUTE'),'anonymous admin-report API denied');
rollback;
