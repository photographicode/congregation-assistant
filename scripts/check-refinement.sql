\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000971','admin-a@example.com',now()),('00000000-0000-4000-8000-000000000972','refinement-group@example.invalid',now()),('00000000-0000-4000-8000-000000000973','refinement-oclm@example.invalid',now());
insert into public.congregation_access(cong_id,email,role,service_group) values('a','refinement-group@example.invalid','group_overseer','Group 1'),('a','refinement-oclm@example.invalid','oclm',null);
insert into public.publishers(id,cong_id,name,service_group) values('refinement-a','a','Synthetic AP One','Group 1'),('refinement-b','a','Synthetic AP Two','Group 2');
insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap) values('refinement-report-a','a','refinement-a',2027,9,true,2,30.25,'Retain every comment',true),('refinement-report-b','a','refinement-b',2027,9,true,3,25.5,'Other group',true),('refinement-report-old','a','refinement-a',2027,8,true,1,15.25,'Previous month',true);
create function pg_temp.reviewed_report(p_id text) returns jsonb language sql as $$select jsonb_object_agg(key,value) from public.reports r cross join lateral jsonb_each(to_jsonb(r)) where r.id=p_id and key=any(array['id','pub_id','cong_id','service_year','month','shared_in_ministry','studies','hours','comments','is_ap'])$$;
set request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000971","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';
set role authenticated;
do $$declare r jsonb;payload jsonb;result jsonb;begin
r=pg_temp.reviewed_report('refinement-report-a');payload=r||jsonb_build_object('clear_auxiliary',true,'expected_report',r);result=public.save_congregation_reports('a',jsonb_build_array(payload));
if result->0->>'is_ap'<>'false' or result->0->>'hours'<>'30.25' or result->0->>'comments'<>'Retain every comment' or result->0->>'studies'<>'2' then raise exception 'AP revoke lost report contents';end if;
if not (select is_ap from public.reports where id='refinement-report-old') then raise exception 'Other month changed';end if;
begin perform public.save_congregation_reports('a',jsonb_build_array(payload));raise exception 'Stale AP snapshot accepted';exception when serialization_failure then null;end;
payload=jsonb_set(payload,'{cong_id}','"b"');begin perform public.save_congregation_reports('b',jsonb_build_array(payload));raise exception 'Cross-congregation AP revoke accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.reports set is_ap=true where id='refinement-report-a';
set request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000972","email":"refinement-group@example.invalid","app_metadata":{"provider":"google"}}';
set role authenticated;
do $$declare r jsonb;payload jsonb;begin
r=pg_temp.reviewed_report('refinement-report-a');payload=r||jsonb_build_object('clear_auxiliary',true,'expected_report',r);
begin perform public.save_group_reports('a',2027,9,jsonb_build_array(payload));raise exception 'Group-only AP review allowed';exception when insufficient_privilege then null;end;
payload=payload||jsonb_build_object('pub_id','refinement-b');begin perform public.save_group_reports('a',2027,9,jsonb_build_array(payload));raise exception 'Another group accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
set request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000973","email":"refinement-oclm@example.invalid","app_metadata":{"provider":"google"}}';
set role authenticated;
do $$begin begin perform public.save_congregation_reports('a','[{"cong_id":"a","pub_id":"refinement-a","service_year":2027,"month":9,"clear_auxiliary":true}]');raise exception 'Scheduler revoked AP';exception when insufficient_privilege then null;end;end $$;
reset role;
do $$declare p jsonb;board jsonb;w text=to_char(current_date,'IYYY-"W"IW');begin
p=ca_private.safe_oclm_program('{"parts":[{"id":"Reading","type":"BibleReading","section":"treasures","title":"Synthetic reading","minutes":4,"assistant":false}],"reading":"Synthetic","sourceMonth":"2026-10","auxiliary":true,"meetingDate":"2026-10-21","startTime":"19:00"}');
if p->>'auxiliary'<>'true' then raise exception 'Auxiliary flag not retained';end if;
board=ca_private.noticeboard_snapshot('a',jsonb_build_object('assignments',jsonb_build_object(w,'{"Reading":{"personId":"main"},"ReadingAux":{"personId":"aux"},"AuxiliaryCounselor":{"personId":"counselor"}}'::jsonb),'weekDetails',jsonb_build_object(w,jsonb_build_object('program',p||'{"auxiliary":false}'::jsonb)),'people','[{"id":"main","name":"Main"},{"id":"aux","name":"Aux"},{"id":"counselor","name":"Counselor"}]'::jsonb));
if board->'assignments'->w ? 'ReadingAux' or board->'assignments'->w ? 'AuxiliaryCounselor' or jsonb_array_length(board->'people')<>1 then raise exception 'Disabled auxiliary data exposed';end if;
board=ca_private.noticeboard_snapshot('a',jsonb_build_object('assignments',jsonb_build_object(w,'{"Reading":{"personId":"main"},"ReadingAux":{"personId":"aux"}}'::jsonb),'weekDetails',jsonb_build_object(w,jsonb_build_object('program',p)),'people','[{"id":"main","name":"Main"},{"id":"aux","name":"Aux"}]'::jsonb));
if not (board->'assignments'->w ? 'ReadingAux') then raise exception 'Enabled auxiliary assignment missing';end if;
end $$;
-- Publisher edits retain unrelated fields and the canonical gender.
set request.jwt.claims='{"sub":"00000000-0000-4000-8000-000000000971","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';
set role authenticated;
select public.ca_v3_save_person('a','{"id":"refine-gender","name":"Synthetic Publisher","group":"","email":"","gender":"Female","phone":"+919876543210","address":"Synthetic address","expected_login":[]}',false);
select public.ca_v3_save_person('a','{"id":"refine-gender","name":"Synthetic Publisher","group":"","email":"","gender":"Male","phone":"+919876543210","address":"Synthetic address","expected_login":[]}',false);
reset role;
do $$begin if not exists(select 1 from public.publishers where id='refine-gender' and gender='Male' and phone='+919876543210' and address='Synthetic address') then raise exception 'Gender or unrelated field persistence failed';end if;end $$;
rollback;
\echo PASS refinement AP data preservation/CAS/role/group isolation and auxiliary metadata/public filtering
