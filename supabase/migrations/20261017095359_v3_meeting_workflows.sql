-- Preserve reviewed display date and timing without changing part identities or permissions.
create or replace function ca_private.safe_oclm_program(p_program jsonb) returns jsonb language plpgsql immutable set search_path='' as $$declare p jsonb;parts jsonb='[]';ids text[]='{}';begin
if jsonb_typeof(p_program) is distinct from 'object' or jsonb_typeof(p_program->'parts') is distinct from 'array' or jsonb_array_length(p_program->'parts')>36 then raise exception 'Invalid reviewed meeting program';end if;
for p in select value from jsonb_array_elements(p_program->'parts') loop
if coalesce(p->>'id','') !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' or p->>'id'=any(ids) or coalesce(p->>'type','')<>all(array['Chairman','Prayer','TreasuresTalk','SpiritualGems','BibleReading','Conversation','FollowingUp','Disciples','Beliefs','Assistant','ChristianParts','BibleStudy','BibleStudyReader']) or coalesce(p->>'section','')<>all(array['treasures','field','living']) or coalesce(p->>'minutes','') !~ '^[0-9]{1,2}$' or (p->>'minutes')::integer>60 then raise exception 'Check each part ID, type, section and duration';end if;
ids=array_append(ids,p->>'id');parts=parts||jsonb_build_array(jsonb_build_object('id',p->>'id','type',p->>'type','section',p->>'section','title',left(coalesce(p->>'title',''),300),'minutes',(p->>'minutes')::integer,'assistant',coalesce((p->>'assistant')::boolean,false)));
end loop;if p_program ? 'meetingDate' then perform (p_program->>'meetingDate')::date;end if;if p_program ? 'startTime' and p_program->>'startTime' !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid first-part time';end if;return jsonb_build_object('parts',parts,'reviewed',coalesce((p_program->>'reviewed')::boolean,false),'reading',left(coalesce(p_program->>'reading',''),150),'sourceMonth',left(coalesce(p_program->>'sourceMonth',''),7))||jsonb_strip_nulls(jsonb_build_object('meetingDate',p_program->>'meetingDate','startTime',p_program->>'startTime'));end $$;

revoke all on function ca_private.safe_oclm_program(jsonb) from public,anon,authenticated;
create or replace function public.ca_v3_meeting_context(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_has_role(p_cong_id,array['attendance','attendant','oclm']) then raise exception 'Meeting access required' using errcode='42501';end if;
 return ca_private.current_meeting(p_cong_id)||jsonb_build_object('settings',(select (to_jsonb(s)-'cong_id')||jsonb_build_object('midweek_time',(select data->>'midweekTime' from ca_private.v2_setup where cong_id=p_cong_id),'weekend_time',(select data->>'weekendTime' from ca_private.v2_setup where cong_id=p_cong_id)) from public.ca_meeting_settings s where cong_id=p_cong_id));end $$;
create or replace function public.ca_v3_submit_attendance(p_cong_id text,p_date date,p_count integer) returns boolean language plpgsql security definer set search_path='' as $$
declare ctx jsonb;y integer;m integer;w integer;column_name text;begin
 if auth.uid() is null or not public.ca_has_role(p_cong_id,array['attendance','attendant']) then raise exception 'Attendance access required' using errcode='42501';end if;
 ctx=ca_private.current_meeting(p_cong_id);
 if coalesce((ctx->>'canSubmit')::boolean,false) is not true or coalesce(ctx->>'kind','') not in('midweek','weekend') or p_date is distinct from (ctx->>'date')::date then raise exception 'Reload the current meeting before submitting';end if;
 if p_count is null or p_count<0 or p_count>99999 then raise exception 'Enter a whole attendance count';end if;
 y=(ctx->>'serviceYear')::integer;m=(ctx->>'month')::integer;w=(ctx->>'week')::integer;
 column_name='w'||w||case when ctx->>'kind'='midweek' then '_mid' else '_end' end;
 insert into public.meeting_attendance(id,cong_id,service_year,month) values(p_cong_id||'_'||y||'_'||m,p_cong_id,y,m) on conflict(cong_id,service_year,month) do nothing;
 execute format('update public.meeting_attendance set %I=$1 where cong_id=$2 and service_year=$3 and month=$4',column_name) using p_count::text,p_cong_id,y,m;
 return true;end $$;
create or replace function public.ca_v3_report_groups(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_has_role(p_cong_id,array['field_service','group_overseer']) then raise exception 'Report group access required' using errcode='42501';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name) order by g.name),'[]') from public.service_groups g where g.cong_id=p_cong_id and g.archived_at is null and (public.ca_has_role(p_cong_id,array['field_service']) or public.ca_can_read_group(p_cong_id,g.name)));end $$;
revoke all on function public.ca_v3_meeting_context(text),public.ca_v3_submit_attendance(text,date,integer),public.ca_v3_report_groups(text) from public,anon;
grant execute on function public.ca_v3_meeting_context(text),public.ca_v3_submit_attendance(text,date,integer),public.ca_v3_report_groups(text) to authenticated;
-- Department functions are deliberately unchanged: the resume orders require approved pools for all three departments.
-- Atomically keep the setup guide and attendance calendar on the same meeting days.
create or replace function public.ca_v3_save_setup(p_cong_id text,p_step integer,p_data jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare mid integer;weekend integer;days text[]=array['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];begin
 perform ca_private.v2_require(p_cong_id,array['admin']);
 if p_step>=2 then
  mid=array_position(days,lower(trim(p_data->>'midweek')))-1;weekend=array_position(days,lower(trim(p_data->>'weekend')))-1;
  if mid is null or weekend is null or mid=weekend or not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Choose valid distinct meeting days and timezone';end if;
  if coalesce(p_data->>'midweekTime','') !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' or coalesce(p_data->>'weekendTime','') !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Use a valid meeting time';end if;
  perform public.save_meeting_calendar(p_cong_id,p_data->>'timezone',mid,weekend,null,null);
 end if;
 return public.ca_v2_save_setup(p_cong_id,p_step,p_data);
end $$;
revoke all on function public.ca_v3_save_setup(text,integer,jsonb) from public,anon;
grant execute on function public.ca_v3_save_setup(text,integer,jsonb) to authenticated;
