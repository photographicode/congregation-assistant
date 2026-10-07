\set ON_ERROR_STOP on
begin;
set role anon;
select test.assert((public.submit_workspace_application('Sample Contact','sample-contact@example.com','sample-congregation@gmail.com','Fictional Congregation','',true)->>'received')::boolean,'Public request submits without email app');
select test.assert((public.submit_workspace_application('Sample Contact','sample-contact@example.com','sample-congregation@gmail.com','Fictional Congregation','',true)->>'received')::boolean,'Duplicate request does not duplicate');
reset role;
select test.assert((select count(*)=1 from ca_private.workspace_applications where admin_email='sample-congregation@gmail.com'),'Request deduplicated');
set request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000002","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
do $$begin perform public.get_workspace_applications();raise exception 'FAILED ordinary admin accepted';exception when insufficient_privilege then null;end $$;
reset role;
-- An isolated test owner, never a production owner or real email.
insert into public.ca_superadmins(email,active) values('test-board-owner@example.com',true);
set request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000002","email":"test-board-owner@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(jsonb_array_length(public.get_workspace_applications())=1,'Only SuperAdmin sees request queue');
select public.review_workspace_application((public.get_workspace_applications()->0->>'id')::uuid,'new-sample-workspace',true);
select test.assert((public.get_workspace_applications()->0->>'status')='approved','Approval creates workspace and finishes queue item');
select test.assert((public.get_workspace_welcome((public.get_workspace_applications()->0->>'id')::uuid)->>'emailStatus')='queued','Welcome remains queued before sender activation');
reset role;
select test.assert((select count(*)=1 from public.congregation_access where cong_id='new-sample-workspace' and email='sample-congregation@gmail.com' and role='admin' and active),'Congregation Gmail is administrator');
select test.assert((select count(*)=2 from ca_private.mail_outbox where dedupe like 'application-welcome-%'),'Admin welcome and safe contact notice queued');
rollback;
\echo PASS direct account request, duplicate protection, SuperAdmin-only review, approved Gmail administrator and queued welcome letters
