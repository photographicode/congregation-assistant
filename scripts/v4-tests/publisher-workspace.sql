\set ON_ERROR_STOP on
begin;
update public.congregations set status='active' where id in ('a','b');
insert into auth.users(id,email,email_confirmed_at) values ('a4444444-4444-4444-8444-444444444444','v4-publisher@example.com',now()),('b4444444-4444-4444-8444-444444444444','admin-a@example.com',now());
insert into public.congregation_access(cong_id,email,role,publisher_id) values('a','v4-publisher@example.com','publisher','pub-a');
select test.assert(not has_table_privilege('authenticated','ca_private.v4_announcements','SELECT,INSERT,UPDATE,DELETE'),'announcements have no direct authenticated grants');
select test.assert(not has_table_privilege('anon','ca_private.v4_contact_notifications','SELECT,INSERT,UPDATE,DELETE'),'notifications have no anonymous grants');
select test.assert(not has_function_privilege('anon','public.ca_v4_announcements(text)','EXECUTE'),'anonymous cannot read announcements');
select test.assert(not has_function_privilege('authenticated','ca_private.v4_contact_changed()','EXECUTE'),'trigger cannot be called directly');
set request.jwt.claims='{"sub":"a4444444-4444-4444-8444-444444444444","email":"v4-publisher@example.com","app_metadata":{"provider":"google"}}';
set role authenticated;
select test.assert(public.ca_v4_announcements('a')='[]'::jsonb,'empty publisher feed');
do $$begin
 begin perform public.ca_v4_announcements('b');raise exception 'Cross tenant read accepted';exception when insufficient_privilege then null;end;
 begin perform public.ca_v4_publish_announcement('a','Denied','Denied');raise exception 'Publisher wrote announcement';exception when insufficient_privilege then null;end;
 begin perform public.ca_v4_admin_notifications('a');raise exception 'Publisher read admin inbox';exception when insufficient_privilege then null;end;
end $$;
select public.get_my_publisher_portal('a')->'contact' as contact \gset
select public.update_my_publisher_contact('a',:'contact'::jsonb,:'contact'::jsonb);
reset role;
select test.assert((select count(*)=0 from ca_private.v4_contact_notifications),'unchanged contact creates no notification');
set role authenticated;
select public.update_my_publisher_contact('a',:'contact'::jsonb,jsonb_set(:'contact'::jsonb,'{phone}','"V4 fixture phone"'));
do $$begin begin perform public.update_my_publisher_contact('a','{}','{}');raise exception 'Stale contact accepted';exception when serialization_failure then null;end;end $$;
reset role;
select test.assert((select count(*)=1 from ca_private.v4_contact_notifications where cong_id='a' and publisher_id='pub-a' and changed_fields=array['phone']),'one actual contact change creates one notification');
select test.assert((select count(*)=0 from ca_private.v4_contact_notifications where cong_id='b'),'no foreign inbox entries');
set request.jwt.claims='{"sub":"b4444444-4444-4444-8444-444444444444","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.ca_v4_publish_announcement('a','Meeting update','Please check the published schedule.') as announcement_id \gset
select test.assert(jsonb_array_length(public.ca_v4_announcements('a'))=1,'admin published announcement');
select public.ca_v4_admin_notifications('a')->0->>'id' as notification_id \gset
select test.assert(public.ca_v4_admin_notifications('a')->0->'read_at'='null'::jsonb,'new inbox item unread');
select public.ca_v4_read_notification('a',:'notification_id'::uuid);
select test.assert(public.ca_v4_admin_notifications('a')->0->'read_at'<>'null'::jsonb,'mark notification read');
do $$begin
 begin perform public.ca_v4_admin_notifications('b');raise exception 'Cross tenant inbox accepted';exception when insufficient_privilege then null;end;
 begin perform public.ca_v4_publish_announcement('a',' ','body');raise exception 'Empty title accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ca_v4_publish_announcement('a','title',repeat('x',4001));raise exception 'Oversized body accepted';exception when invalid_parameter_value then null;end;
end $$;
set request.jwt.claims='{"sub":"a4444444-4444-4444-8444-444444444444","email":"v4-publisher@example.com","app_metadata":{"provider":"google"}}';
select test.assert(public.ca_v4_announcements('a')->0->>'title'='Meeting update','publisher sees published announcement');
select public.get_my_publisher_portal('a') as portal \gset
select public.save_my_publisher_away('a',(:'portal'::jsonb->>'scheduleRevision')::bigint,'[{"from":"2027-03-01","to":"2027-03-05"}]');
select test.assert(public.get_my_publisher_portal('a')->'away' @> '[{"from":"2027-03-01","to":"2027-03-05"}]','away saved without approval');
reset role;
update public.congregation_access set active=false where email='v4-publisher@example.com';set role authenticated;
do $$begin begin perform public.ca_v4_announcements('a');raise exception 'Revoked user read feed';exception when insufficient_privilege then null;end;end $$;
reset role;
set request.jwt.claims='{"sub":"b4444444-4444-4444-8444-444444444444","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.ca_v4_archive_announcement('a',:'announcement_id'::uuid);
select test.assert(public.ca_v4_announcements('a')='[]'::jsonb,'archived announcement hidden');
reset role;
rollback;
\echo PASS V4 member/admin boundaries, tenant isolation, contact notification, no-op/stale updates, announcement lifecycle, time away and revocation
