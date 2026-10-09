\set ON_ERROR_STOP on
begin;
update public.congregations set status='active' where id in('a','b');
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(public.get_publisher_login('a','pub-a')='[]','empty enrollment');
select public.set_publisher_login('a','pub-a','[]','new-publisher@example.com');
select test.assert(public.get_publisher_login('a','pub-a')='["new-publisher@example.com"]','inline enrollment saved');
do $$begin
begin perform public.set_publisher_login('a','pub-a','[]','other@example.com');raise exception 'stale enrollment accepted';exception when serialization_failure then null;end;
begin perform public.get_publisher_login('b','pub-b');raise exception 'foreign enrollment accepted';exception when insufficient_privilege then null;end;
end$$;
select public.set_publisher_login('a','pub-a','["new-publisher@example.com"]','replacement@example.com');
reset role;
select test.assert((select not active from public.congregation_access where cong_id='a' and email='new-publisher@example.com' and role='publisher'),'old publisher login revoked');
select test.assert((select active from public.congregation_access where cong_id='a' and email='admin-a@example.com' and role='admin'),'admin roles preserved');
-- Keep existing independent department/publication metadata; projection retains actual program titles.
select test.assert((ca_private.noticeboard_snapshot('a',jsonb_build_object('assignments',jsonb_build_object(to_char(current_date+21,'IYYY-"W"IW'),'{"BibleReading":{"personId":"pub-a"}}'::jsonb),'weekDetails',jsonb_build_object(to_char(current_date+21,'IYYY-"W"IW'),'{"program":{"parts":[{"id":"BibleReading","title":"Fictional reading title"}]}}'::jsonb))))->'weekDetails'->to_char(current_date+21,'IYYY-"W"IW')->'program'->'parts'->0->>'title'='Fictional reading title','published program titles preserved');
insert into auth.users(id,email,email_confirmed_at) values('a1111111-1111-4111-8111-111111111111','replacement@example.com',now());
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"replacement@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(public.get_my_publisher_portal('a')->>'email'='replacement@example.com','approved Google identity returned');
do $$begin begin perform public.set_publisher_login('a','pub-a','["replacement@example.com"]','hijack@example.com');raise exception 'publisher changed enrollment';exception when insufficient_privilege then null;end;end$$;
reset role;
update public.publishers set transferred_at=now() where id='pub-a' and cong_id='a';
set role authenticated;
do $$begin begin perform public.get_my_publisher_portal('a');raise exception 'transferred publisher accepted';exception when insufficient_privilege then null;end;end$$;
reset role;
set request.jwt.claims='{"sub":"a1111111-1111-4111-8111-111111111111","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
do $$begin begin perform public.set_publisher_login('a','pub-a','[]','replacement@example.com');raise exception 'transfer reapproved';exception when insufficient_privilege then null;end;end$$;
reset role;
select test.assert(not has_function_privilege('anon','public.get_publisher_login(text,text)','EXECUTE'),'anonymous enrollment denied');
rollback;
begin;
update public.congregations set status='active' where id='a';
insert into auth.users(id,email,email_confirmed_at) values('c1111111-1111-4111-8111-111111111111','interval@example.invalid',now());
insert into public.congregation_access(cong_id,email,role,publisher_id) values('a','interval@example.invalid','publisher','pub-a');
insert into ca_private.push_subscriptions(user_id,cong_id,email,endpoint,subscription,preferences) values('c1111111-1111-4111-8111-111111111111','a','interval@example.invalid','https://fcm.googleapis.com/fictional-interval-never-send','{}','{"assignments":true}');
set request.jwt.claims='{"role":"service_role"}';
do $$declare days integer;meeting_date date;week text;begin
foreach days in array array[14,7,3,1] loop
 meeting_date=(now() at time zone 'Asia/Kolkata')::date+days;week=to_char(meeting_date,'IYYY-"W"IW');
 insert into public.ca_meeting_settings(cong_id,timezone,midweek_day,weekend_day) values('a','Asia/Kolkata',extract(dow from meeting_date)::integer,(extract(dow from meeting_date)::integer+3)%7) on conflict(cong_id) do update set midweek_day=excluded.midweek_day,weekend_day=excluded.weekend_day;
 insert into public.ca_oclm_publications(cong_id,snapshot) values('a',jsonb_build_object('assignments',jsonb_build_object(week,'{"BibleReading":{"personId":"pub-a","customTitle":"PRIVATE PART TITLE"},"MeetingStart":{"customTitle":"00:00"}}'::jsonb),'publishedWeeks',jsonb_build_array(week))) on conflict(cong_id) do update set snapshot=excluded.snapshot;
 delete from ca_private.push_outbox where dedupe like 'publisher:assignment:%';
 perform test.assert(public.queue_publisher_reminders()=1,'requested reminder interval queues once');
 perform test.assert(public.queue_publisher_reminders()=0,'interval deduplicates');
 perform test.assert((select count(*)=1 and bool_and(dedupe like '%:'||days and body not like '%PRIVATE PART TITLE%') from ca_private.push_outbox where dedupe like 'publisher:assignment:%'),'interval fingerprint and generic notification');
end loop;
end$$;
rollback;
