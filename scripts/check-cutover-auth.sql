\set ON_ERROR_STOP on
-- Run only on the isolated baseline fixture, never against production.
begin;
-- Refuse unguarded destructive selection without altering schema.
do $$begin
 if current_setting('ca.allow_legacy_auth_drop',true)='on' then raise exception 'Use an isolated test connection without pre-enabled destructive flags';end if;
end $$;
set local ca.allow_legacy_auth_drop='on';
\i supabase/migrations/20261013192548_drop_legacy_auth.sql
select test.assert(to_regclass('public.group_access') is null,'shared-password table removed');
select test.assert(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='congregations' and column_name='admin_password'),'admin password column removed');
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000001","email":"owner@example.com","app_metadata":{"provider":"google"}}';
select test.assert(public.ca_is_superadmin(),'approved Google owner remains authorized');
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000001","email":"owner@example.com","app_metadata":{"provider":"email"}}';
select test.assert(not public.ca_is_superadmin(),'email-only owner cannot become SuperAdmin');
set local request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000002","email":"unapproved@example.invalid","app_metadata":{"provider":"google"},"user_metadata":{"role":"superadmin"}}';
select test.assert(not public.ca_is_superadmin(),'unapproved Google and user-controlled metadata grant no owner access');
\i supabase/migrations/20261013192548_drop_legacy_auth.down.sql
select test.assert(to_regclass('public.group_access') is not null,'down restores empty group schema');
select test.assert(not has_table_privilege('authenticated','public.group_access','SELECT'),'restored password schema has no client grants');
rollback;
select 'Cutover auth UP/DOWN and approved-Google authorization passed; all changes rolled back' as result;
