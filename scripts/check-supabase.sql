\set ON_ERROR_STOP on
-- Isolated PostgreSQL emulates Supabase JWT claims; never points at a production database.
create role anon nologin;create role authenticated nologin;create role service_role nologin;
create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create function auth.role() returns text language sql stable as $$ select auth.jwt()->>'role' $$;
grant execute on function auth.uid() to anon,authenticated;
grant usage on schema auth to anon,authenticated;
grant execute on function auth.jwt() to anon,authenticated;
\i supabase/fresh-project.sql
\i supabase/group-overseer.sql
\i supabase/section-assistants.sql
\i supabase/oclm-additional-duties.sql
create schema test;
create function test.assert(ok boolean,label text) returns void language plpgsql as $$ begin if ok is distinct from true then raise exception 'FAILED: %',label;end if;end $$;
grant usage on schema test to anon,authenticated;grant execute on function test.assert(boolean,text) to anon,authenticated;
insert into public.ca_superadmins(email) values('owner@example.com');
set request.jwt.claims='{"email":"owner@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(public.ca_is_superadmin(),'verified owner is superadmin');
select test.assert((select count(*)=1 from public.ca_superadmins),'owner reads only their own owner entry');
select public.provision_congregation('{"id":"a","name":"Example A","payment_date":"2026-10-03"}','admin-a@example.com');
select public.provision_congregation('{"id":"b","name":"Example B"}','admin-b@example.com');
select test.assert((select trial_days=30 from public.congregations where id='a'),'new trial is thirty days');
select test.assert((select payment_date=date '2026-10-03' from public.congregations where id='a'),'provisioning preserves the entered payment date');
update public.congregations set status='active';
reset role;
insert into public.publishers(id,cong_id,name,service_group,phone,address) values('pub-a','a','Sample Person A','Group 1','PRIVATE PHONE','PRIVATE ADDRESS'),('pub-b','b','Sample Person B','Group 2','OTHER PHONE','OTHER ADDRESS');
insert into public.congregation_access(cong_id,email,role) values('a','field-a@example.com','field_service'),('a','attendance-a@example.com','attendance'),('a','scheduler-a@example.com','oclm');
set request.jwt.claims='{"email":"field-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert((select count(*)=1 from public.publishers),'field role only reads its congregation');
select test.assert((select count(*)=1 from public.congregation_access),'field role reads only their own active membership');
do $$ begin
 begin update public.publishers set cong_id='b' where id='pub-a';raise exception 'Tenant move accepted';exception when insufficient_privilege then null;end;
 begin insert into public.reports(id,cong_id,pub_id,service_year,month) values('bad','a','pub-b',2026,8);raise exception 'Cross-tenant publisher accepted';exception when foreign_key_violation then null;end;
end $$;
select public.create_public_link('a','report','Group 1','pub-a')->>'token' as report_token \gset
reset role;
set request.jwt.claims='{"email":"attendance-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert((select count(*)=0 from public.publishers),'attendance role cannot read publisher records');
select public.create_public_link('a','attendance',null,null)->>'token' as attendance_token \gset
reset role;
set request.jwt.claims='{"email":"scheduler-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert((select count(*)=0 from public.reports),'OCLM cannot read reports');
select test.assert((select count(*)=0 from public.meeting_attendance),'OCLM cannot read attendance');
select test.assert((select count(*)=0 from public.publishers),'OCLM cannot read private publisher records');
do $$ begin begin insert into public.reports(id,cong_id,pub_id,service_year,month) values('denied-oclm','a','pub-a',2026,8);raise exception 'OCLM wrote a report';exception when insufficient_privilege then null;end;end $$;

select public.upsert_oclm_public_snapshot('a','{"kind":"midweek","v":2,"defaultWeek":"2026-W40","publishedWeeks":["2026-W40"],"assignments":{"2026-W40":{"Chairman":{"personId":"sample","customTitle":"First title","privateNote":"SECRET"}}},"people":[{"id":"sample","name":"Sample Person","phone":"SECRET"},{"id":"unused","name":"UNPUBLISHED"}]}')->>'token' as schedule_token \gset
select test.assert(public.get_oclm_public_snapshot(:'schedule_token')::text not like '%SECRET%' and public.get_oclm_public_snapshot(:'schedule_token')::text not like '%UNPUBLISHED%','initial publication strips private fields and unassigned names');
select public.upsert_oclm_public_snapshot('a','{"kind":"midweek","v":2,"defaultWeek":"2026-W40","publishedWeeks":["2026-W40"],"assignments":{"2026-W40":{"Chairman":{"personId":"sample","customTitle":"Updated title"}}},"people":[{"id":"sample","name":"Sample Person"}]}')->>'token' as updated_token \gset
select test.assert(:'schedule_token'=:'updated_token','publishing keeps the same token');
do $$ begin begin perform public.upsert_oclm_public_snapshot('b','{}');raise exception 'Cross-tenant publication accepted';exception when insufficient_privilege then null;end;end $$;
reset role;set request.jwt.claims='{}';set role anon;
select test.assert(public.get_oclm_public_snapshot(:'schedule_token')->'snapshot'->'assignments'->'2026-W40'->'Chairman'->>'customTitle'='Updated title','same public URL sees updated publication');
select test.assert(public.get_oclm_public_snapshot(:'schedule_token')::text not like '%SECRET%' and public.get_oclm_public_snapshot(:'schedule_token')::text not like '%UNPUBLISHED%','public snapshot omits private and unassigned roster data');
select test.assert(public.get_oclm_public_snapshot('invalid') is null,'invalid schedule token cannot enumerate schedules');
select test.assert(public.get_public_link_context(:'report_token')::text not like '%PRIVATE%','report link exposes no contacts or addresses');
select public.submit_public_report(:'report_token','{"pub_id":"pub-a","service_year":2026,"month":8,"studies":2,"hours":5,"shared_in_ministry":true}');
select public.submit_public_attendance(:'attendance_token',2026,8,'{"w1_mid":"99","w2_end":"101"}');
select public.submit_public_attendance(:'attendance_token',2026,8,'{"w1_mid":"100"}');
select test.assert(public.get_public_attendance(:'attendance_token',2026,8)->>'w2_end'='101','public attendance preserves unrelated meeting values');
select test.assert(not has_table_privilege('anon','public.publishers','select') and not has_table_privilege('anon','public.reports','insert'),'anonymous users have no direct private-table access');
select test.assert(not has_function_privilege('anon','public.ca_resolve_link(text,text)','execute'),'internal capability resolver is not public');
reset role;
update public.ca_public_links set active=false where token=:'report_token';
set role anon;
select test.assert(public.get_public_link_context(:'report_token') is null,'withdrawn report link stops working');
reset role;
set request.jwt.claims='{"email":"admin-a@example.com","app_metadata":{"provider":"email"}}';set role authenticated;
select test.assert(not public.ca_has_role('a',array['admin']),'unverified email provider cannot impersonate approved Google admin');
reset role;
update public.congregation_access set active=false where email='field-a@example.com';
set request.jwt.claims='{"email":"field-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(not public.ca_has_role('a',array['field_service']),'disabled membership cannot access data');
reset role;
update public.congregations set status='trial',created_at=now()-interval '31 days' where id='a';
set role anon;
select test.assert(public.get_oclm_public_snapshot(:'schedule_token') is null,'expired tenant no longer exposes publication');
reset role;
\echo PASS isolated database: owner provisioning, thirty-day trials, tenant isolation, role restrictions, verified Google identities, stable publications, scoped public forms, revocation and expiry

-- Password owners require a matching actual confirmed account; role members still use Google.
reset role;
insert into auth.users values('1ecbe517-2305-4929-9f99-6f7dd03f5983','password-owner@example.invalid',now());
insert into public.ca_superadmins(email) values('password-owner@example.invalid');
set request.jwt.claims='{"sub":"1ecbe517-2305-4929-9f99-6f7dd03f5983","email":"password-owner@example.invalid","app_metadata":{"provider":"email"}}';
set role authenticated;
select test.assert(public.ca_is_superadmin(),'confirmed password owner accepted');
reset role;
update public.ca_superadmins set active=false where email='password-owner@example.invalid';
set role authenticated;
select test.assert(not public.ca_is_superadmin(),'disabled password owner rejected');
reset role;
update public.ca_superadmins set active=true where email='password-owner@example.invalid';
update auth.users set email_confirmed_at=null where email='password-owner@example.invalid';
set role authenticated;
select test.assert(not public.ca_is_superadmin(),'unconfirmed password owner rejected');
reset role;

\i scripts/check-group-access.sql

\i scripts/check-additional-features.sql

\i supabase/attendance-calendar.sql
\i scripts/check-attendance-calendar.sql

\i supabase/oclm-roster-group-bulk.sql
\i scripts/check-roster-group-bulk.sql
\i supabase/billing-fields-public-revision.sql
\i scripts/check-billing-boundaries.sql

alter table auth.users add column raw_app_meta_data jsonb;
\i supabase/onboarding-mail.sql
\i scripts/check-onboarding-mail.sql
\i supabase/google-only-owner.sql
\i scripts/check-google-only-owner.sql

\i supabase/shared-oclm.sql
\i scripts/check-shared-oclm.sql
\i supabase/publisher-home.sql
\i scripts/check-publisher-home.sql
\i supabase/workspace-recovery.sql
\i scripts/check-workspace-recovery.sql
\i supabase/server-push.sql
\i scripts/check-server-push.sql
\i supabase/admin-home.sql
begin;set request.jwt.claims='{"email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert((public.get_admin_home_tasks('a')->>'reportsMissing')::integer>=0,'administrator home calculates missing reports');
reset role;rollback;
