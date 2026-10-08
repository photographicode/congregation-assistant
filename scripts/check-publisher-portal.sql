\set ON_ERROR_STOP on
begin;
update public.congregations set status='active' where id in('a','b');
insert into auth.users(id,email,email_confirmed_at) values('a1111111-1111-4111-8111-111111111111','portal-a@example.com',now()),('b1111111-1111-4111-8111-111111111111','portal-b@example.com',now());
insert into public.congregation_access(cong_id,email,role,publisher_id) values('a','portal-a@example.com','publisher','pub-a'),('b','portal-b@example.com','publisher','pub-b');
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"portal-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.get_my_publisher_portal('a') as home \gset
select test.assert(:'home'::jsonb->'contact'->>'phone'='PRIVATE PHONE','own contact only');
select test.assert(:'home' not like '%OTHER PHONE%' and :'home' not like '%OTHER ADDRESS%' and :'home' not like '%admin-b@example.com%','no foreign or admin contacts');
select test.assert((select count(*)=0 from public.publishers),'publisher cannot read the roster');
select public.update_my_publisher_contact('a',:'home'::jsonb->'contact','{"phone":"111","address":"Fictional address","emergency_name":"Sample contact","emergency_relationship":"Relative","emergency_phone":"222"}');
do $$begin begin perform public.update_my_publisher_contact('a','{}','{}');raise exception 'stale contact accepted';exception when serialization_failure then null;end;begin perform public.get_my_publisher_portal('b');raise exception 'cross tenant accepted';exception when insufficient_privilege then null;end;end$$;
select public.get_my_publisher_portal('a') as home \gset
select public.save_my_publisher_away('a',(:'home'::jsonb->>'scheduleRevision')::bigint,'[{"from":"2027-01-01","to":"2027-01-07"}]');
select test.assert(public.get_my_publisher_portal('a')->'away' @> '[{"from":"2027-01-01","to":"2027-01-07"}]','away is shared with schedule');
do $$begin begin perform public.save_my_publisher_away('a',-1,'[]');raise exception 'stale schedule accepted';exception when serialization_failure then null;end;end$$;
select public.save_my_publisher_reminders('a',0,'[{"id":"sample","title":"Prepare assignment","date":"2027-01-01","time":"09:00"}]');
select test.assert(public.get_my_publisher_portal('a')->'reminders'->0->>'title'='Prepare assignment','reminder saved online');
do $$begin begin perform public.save_my_publisher_reminders('a',0,'[]');raise exception 'stale reminders accepted';exception when serialization_failure then null;end;begin perform public.submit_my_attendance('a',current_date,10,null);raise exception 'unassigned attendance accepted';exception when insufficient_privilege then null;end;begin perform public.queue_publisher_reminders();raise exception 'publisher called worker';exception when insufficient_privilege then null;end;end$$;
reset role;
select test.assert((select phone='PRIVATE PHONE' from public.publishers where id='pub-b') is false,'foreign contact fixture unchanged');
select test.assert((select phone='OTHER PHONE' from public.publishers where id='pub-b'),'foreign contact remains unchanged');
update public.congregation_access set active=false where email='portal-a@example.com';set role authenticated;
do $$begin begin perform public.get_my_publisher_portal('a');raise exception 'revoked access accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
update public.congregation_access set active=true where email='portal-a@example.com';
-- Attendant must be currently approved AND independently published for this week.
insert into ca_private.department_people(cong_id,department,publisher_id,status) values('a','attendant','pub-a','approved') on conflict(cong_id,department,publisher_id) do update set status='approved';
insert into public.ca_meeting_settings(cong_id,timezone,midweek_day,weekend_day) values('a','Asia/Kolkata',extract(dow from now() at time zone 'Asia/Kolkata')::integer,(extract(dow from now() at time zone 'Asia/Kolkata')::integer+3)%7) on conflict(cong_id) do update set midweek_day=excluded.midweek_day,weekend_day=excluded.weekend_day;
insert into ca_private.department_publications(cong_id,department,week,snapshot) values('a','attendant',to_char(now() at time zone 'Asia/Kolkata','IYYY-"W"IW'),'{"assignments":{"Duty_test_1":{"personId":"pub-a","publisherId":"pub-a","status":"scheduled"}}}') on conflict(cong_id,department,week) do update set snapshot=excluded.snapshot;
set role authenticated;
select public.get_my_publisher_portal('a') as home \gset
select test.assert(:'home'::jsonb->'attendance' is distinct from 'null'::jsonb,'assigned attendant gets only current form');
select public.submit_my_attendance('a',(:'home'::jsonb->'attendance'->>'date')::date,77,(:'home'::jsonb->'attendance'->>'count')::integer);
select test.assert(public.get_my_publisher_portal('a')->'attendance'->>'count'='77','today count saved');
do $$begin begin perform public.submit_my_attendance('a',current_date-1,10,null);raise exception 'old date accepted';exception when insufficient_privilege then null;end;end$$;
reset role;update ca_private.department_people set status='rejected' where cong_id='a' and department='attendant' and publisher_id='pub-a';set role authenticated;
select test.assert(public.get_my_publisher_portal('a')->'attendance'='null'::jsonb,'revoked eligibility removes attendance form');
reset role;
set request.jwt.claims='{"email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.export_congregation_workspace('a') as recovery \gset
select test.assert(:'recovery'::jsonb->'data'->'publisherPreferences'->0->'reminders'->0->>'title'='Prepare assignment','export includes personal reminders');
select public.restore_congregation_workspace('a',:'recovery'::jsonb->>'fingerprint',:'recovery'::jsonb->'data');
select public.export_congregation_workspace('a') as restored_recovery \gset
select test.assert(:'restored_recovery'::jsonb->'data'->'publisherPreferences'->0->'reminders'->0->>'title'='Prepare assignment','restoration retains personal reminders');
reset role;
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"portal-a@example.com","app_metadata":{"provider":"google"}}';
update public.congregation_access set active=true where email='portal-a@example.com';update public.publishers set transferred_at=now(),service_group=null where id='pub-a';set role authenticated;
do $$begin begin perform public.get_my_publisher_portal('a');raise exception 'transferred access accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"portal-b@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
do $$begin begin perform public.get_my_publisher_portal('b');raise exception 'mismatched confirmed identity accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set request.jwt.claims='{"role":"service_role"}';
select test.assert(public.queue_publisher_reminders()=0,'empty queue producer does not send or invent subscriptions');
select test.assert(not has_function_privilege('anon','public.get_my_publisher_portal(text)','execute'),'anonymous portal denied');
select test.assert(not has_table_privilege('authenticated','ca_private.publisher_preferences','select'),'no direct preference table access');
rollback;
\echo PASS personal portal: own contacts, shared away dates, reminder conflicts, tenant denial, revoked and transferred accounts, assigned attendance only
