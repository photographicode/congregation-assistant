\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('request-test','Synthetic requested workflows','active'),('request-other','Other synthetic','active');
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000921','request-admin@example.invalid',now()),('00000000-0000-4000-8000-000000000922','request-attendant@example.invalid',now()),('00000000-0000-4000-8000-000000000923','request-group@example.invalid',now()),('00000000-0000-4000-8000-000000000924','request-av@example.invalid',now());
insert into public.congregation_access(cong_id,email,role,active,service_group) values('request-test','request-admin@example.invalid','admin',true,null),('request-test','request-attendant@example.invalid','attendant',true,null),('request-test','request-group@example.invalid','group_overseer',true,'Group 1'),('request-test','request-av@example.invalid','av',true,null);
insert into public.service_groups(cong_id,name) values('request-test','Group 1'),('request-test','Group 2');
insert into public.publishers(id,cong_id,name,service_group) values('request-person','request-test','Synthetic Maria','Group 1'),('request-person2','request-test','Other synthetic person','Group 2');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000921","email":"request-admin@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$declare days text[]=array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];dow integer=extract(dow from now() at time zone 'UTC');ctx jsonb;result jsonb;duty text;rev bigint;begin
 perform public.ca_v3_save_setup('request-test',2,jsonb_build_object('privacy','standard','delivery','digital','timezone','UTC','midweek',days[dow+1],'weekend',days[(dow+3)%7+1],'midweekTime','19:00','weekendTime','10:00'));
 result=public.create_public_link('request-test','report','Group 1',null);if public.ca_v3_home_group_links('request-test',2027,9)->0->>'token' is distinct from result->>'token' then raise exception 'Group link missing';end if;
 ctx=public.ca_v3_meeting_context('request-test');if ctx->>'kind'<>'midweek' or ctx->>'date'<>(now() at time zone 'UTC')::date::text then raise exception 'Wrong automatic meeting';end if;
 perform public.ca_v3_submit_attendance('request-test',(ctx->>'date')::date,123);
 if (public.ca_v3_meeting_context('request-test')->>'count')::integer<>123 then raise exception 'Attendance not saved';end if;
 begin perform public.ca_v3_submit_attendance('request-test',(ctx->>'date')::date-1,456);raise exception 'Stale attendance date accepted';exception when raise_exception then if sqlerrm='Stale attendance date accepted' then raise;end if;end;

end $$;
do $$declare data jsonb;duty text;rev bigint;expected jsonb;begin
 data=public.save_department_duty('request-test','av',0,null,'Sound desk',1,true);rev=(data->>'revision')::bigint;duty=data->'duties'->0->>'id';
 begin perform public.save_department_assignments('request-test','av',rev,'2026-W40',jsonb_build_object(duty||'_1','request-person'));raise exception 'Unapproved AV assignment accepted';exception when insufficient_privilege then null;end;
 perform public.request_department_person('request-test','av','request-person');perform public.decide_department_person('request-test','av','request-person',true);
 data=public.save_department_assignments('request-test','av',rev,'2026-W40',jsonb_build_object(duty||'_1','request-person'));
 if data->'assignments'->'2026-W40'->(duty||'_1')->>'publisherId'<>'request-person' then raise exception 'Approved pool not saved';end if;
 data=public.save_department_duty('request-test','cleaning',0,null,'Hall cleaning',1,true);rev=(data->>'revision')::bigint;duty=data->'duties'->0->>'id';begin perform public.save_department_assignments('request-test','cleaning',rev,'2026-W40',jsonb_build_object(duty||'_1','request-person2'));raise exception 'Unapproved cleaning assignment accepted';exception when insufficient_privilege then null;end;perform public.request_department_person('request-test','cleaning','request-person2');perform public.decide_department_person('request-test','cleaning','request-person2',true);perform public.save_department_assignments('request-test','cleaning',rev,'2026-W40',jsonb_build_object(duty||'_1','request-person2'));
 data=public.ca_v3_save_assistant_report('request-test','request-person',2027,8,3,2,null);
 if (data->>'hours')::numeric<>3 or (data->>'studies')::integer<>2 then raise exception 'Local command values lost';end if;
 begin perform public.ca_v3_save_assistant_report('request-test','request-person',2027,8,9,9,null);raise exception 'Stale preview accepted';exception when serialization_failure then null;end;
 expected=jsonb_build_object('shared',true,'hours',3,'studies',2,'comments','','auxiliary',false);
 perform public.ca_v3_save_assistant_report('request-test','request-person',2027,8,4,3,expected);
 if not(public.ca_v3_report_groups('request-test') @> '[{"name":"Group 2"}]') then raise exception 'Admin group list incomplete';end if;
 begin perform public.ca_v3_save_assistant_report('request-other','request-person',2027,8,3,2,null);raise exception 'Cross-tenant command accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000922","email":"request-attendant@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select public.ca_v3_submit_attendance('request-test',(public.ca_v3_meeting_context('request-test')->>'date')::date,124);
do $$begin begin perform public.ca_v3_save_assistant_report('request-test','request-person',2027,9,3,2,null);
 if (public.ca_v3_home_group_links('request-test',2027,9)->0->>'submitted')::integer<>1 or public.ca_v3_home_group_links('request-test',2027,9)->0->>'lastSubmission' is null then raise exception 'Group count or submission time missing';end if;raise exception 'Attendant wrote service report';exception when insufficient_privilege then null;end;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000923","email":"request-group@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$begin
 if jsonb_array_length(public.ca_v3_home_group_links('request-test',2027,9))<>1 then raise exception 'Home exposed other groups';end if;
 if jsonb_array_length(public.ca_v3_report_groups('request-test'))<>1 then raise exception 'Other group exposed';end if;
 begin perform public.ca_v3_save_assistant_report('request-test','request-person2',2027,9,3,2,null);raise exception 'Group overseer wrote another group';exception when insufficient_privilege then null;end;
 perform public.ca_v3_save_assistant_report('request-test','request-person',2027,9,3,2,null);
 if (public.ca_v3_home_group_links('request-test',2027,9)->0->>'submitted')::integer<>1 or public.ca_v3_home_group_links('request-test',2027,9)->0->>'lastSubmission' is null then raise exception 'Group count or submission time missing';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000924","email":"request-av@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$begin
 begin perform public.decide_department_person('request-test','av','request-person',true);raise exception 'AV self-approved';exception when insufficient_privilege then null;end;
 begin perform public.ca_v3_home_group_links('request-test',2027,9);raise exception 'AV read group links';exception when insufficient_privilege then null;end;
 begin perform public.ca_v3_submit_attendance('request-test',current_date,123);raise exception 'AV entered attendance';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{}',true);
do $$begin if has_function_privilege('anon','public.ca_v3_save_assistant_report(text,text,integer,integer,numeric,integer,jsonb)','execute') then raise exception 'Anonymous command grant';end if;begin perform public.ca_v3_meeting_context('request-test');raise exception 'Anonymous meeting metadata';exception when insufficient_privilege then null;end;end $$;
rollback;
select 'PASS requested attendance, approved pools, cleaning, report CAS and group-scope boundaries';
