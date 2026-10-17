\set ON_ERROR_STOP on
-- Supabase Auth session-table shape, in an isolated database only.
create table if not exists auth.sessions(id uuid primary key,user_id uuid not null,created_at timestamptz,updated_at timestamptz,not_after timestamptz,user_agent text);
\i supabase/migrations/20261014101856_v2_own_sessions.sql
begin;
insert into auth.sessions(id,user_id,created_at,updated_at,user_agent) values('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001',now(),now(),'Fictional own browser'),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002',now(),now(),'Other account must not appear');
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select test.assert(jsonb_array_length(public.ca_v2_own_sessions())=1,'Only own sessions');
select test.assert(public.ca_v2_own_sessions()->0->>'device'='Fictional own browser','Own browser metadata');
select set_config('request.jwt.claims','{}',true);
do $$begin begin perform public.ca_v2_own_sessions();raise exception 'Anonymous session read accepted';exception when insufficient_privilege then null;end;end $$;
rollback;
