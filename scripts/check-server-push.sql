\set ON_ERROR_STOP on
begin;
set request.jwt.claims='{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"scheduler-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.register_push_subscription('a',jsonb_build_object('endpoint','https://fcm.googleapis.com/test-only','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('B',22))));
do $$begin begin perform public.register_push_subscription('b',jsonb_build_object('endpoint','https://fcm.googleapis.com/test-only','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('B',22))));raise exception 'cross congregation subscription';exception when insufficient_privilege then null;end;begin perform public.claim_workspace_push();raise exception 'browser claims endpoint secrets';exception when insufficient_privilege then null;end;end$$;
select public.remove_push_subscription('https://fcm.googleapis.com/test-only');
reset role;rollback;
\echo PASS approved push registration, cross-congregation rejection, private worker guard and removal
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','scheduler-a@example.com',now(),'{"provider":"google"}');
set request.jwt.claims='{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","email":"scheduler-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select set_config('test.push_subscription',public.register_push_subscription('a',jsonb_build_object('endpoint','https://fcm.googleapis.com/isolated-lease-test','keys',jsonb_build_object('p256dh',repeat('A',87),'auth',repeat('B',22))))::text,true);
reset role;
insert into ca_private.push_outbox(subscription_id,dedupe,title,body) values(current_setting('test.push_subscription')::uuid,'isolated-worker-job','Test','Generic task reminder');
set request.jwt.claims='{"role":"service_role"}';set role service_role;
select set_config('test.push_jobs',public.claim_workspace_push()::text,true);
reset role;select test.assert(jsonb_array_length(current_setting('test.push_jobs')::jsonb)>=1,'worker leases queued jobs');
set role service_role;select set_config('test.push_second',public.claim_workspace_push()::text,true);reset role;
select test.assert(jsonb_array_length(current_setting('test.push_second')::jsonb)=0,'leased jobs are not claimed twice');
set role service_role;
select set_config('test.push_wrong',public.finish_workspace_push((current_setting('test.push_jobs')::jsonb->0->>'id')::uuid,gen_random_uuid(),201)::text,true);
select set_config('test.push_correct',public.finish_workspace_push((current_setting('test.push_jobs')::jsonb->0->>'id')::uuid,(current_setting('test.push_jobs')::jsonb->0->>'lease')::uuid,201)::text,true);
reset role;select test.assert(current_setting('test.push_wrong')='false' and current_setting('test.push_correct')='true','only correct lease confirms delivery');rollback;
