\set ON_ERROR_STOP on
begin;
set request.jwt.claims='{"email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select set_config('test.backup',public.export_congregation_workspace('a')::text,true);
select test.assert(current_setting('test.backup')::jsonb->'data'->'scheduler'->'personnel'->0->>'name'='Recovery Sample','backup includes scheduling people and qualifications');
select public.restore_congregation_workspace('a',current_setting('test.backup')::jsonb->>'fingerprint',current_setting('test.backup')::jsonb->'data');
select test.assert((select count(*)>=1 from public.publishers),'records restored');
select test.assert(public.get_oclm_workspace('a')->>'revision'='2','restore increments shared revision');
do $$begin begin perform public.restore_congregation_workspace('a',current_setting('test.backup')::jsonb->>'fingerprint',current_setting('test.backup')::jsonb->'data');raise exception 'stale recovery accepted';exception when serialization_failure then null;end;end$$;
set request.jwt.claims='{"email":"scheduler-a@example.com","app_metadata":{"provider":"google"}}';
do $$begin begin perform public.export_congregation_workspace('a');raise exception 'scheduler exported contacts';exception when insufficient_privilege then null;end;begin perform public.restore_congregation_workspace('a','invalid','{}');raise exception 'scheduler restored contacts';exception when insufficient_privilege then null;end;end$$;
reset role;rollback;
\echo PASS full records, scheduling recovery, incremented revisions and restricted recovery access
