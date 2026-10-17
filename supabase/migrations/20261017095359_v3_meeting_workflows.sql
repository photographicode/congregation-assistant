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
-- The owner requires administrator-approved pools for AV and Attendant only.
-- Cleaning still checks active, in-congregation identity, availability and revisions.

create or replace function public.save_department_assignments(p_cong_id text,p_department text,p_expected_revision bigint,p_week text,p_assignments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare w ca_private.department_workspaces;assigned jsonb;part record;p public.publishers;duty jsonb;draft jsonb;begin
if not ca_private.can_manage_department(p_cong_id,p_department) then raise exception 'Department access required' using errcode='42501';end if;
if p_week is null or p_week !~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$' or jsonb_typeof(p_assignments) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_assignments))>80 then raise exception 'Check week and assignments';end if;
perform pg_advisory_xact_lock(hashtextextended('department:'||p_cong_id||':'||p_department,0));select * into w from ca_private.department_workspaces where cong_id=p_cong_id and department=p_department;
if w.cong_id is null or p_expected_revision is distinct from w.revision then raise exception 'This department changed. Reload and review before saving.' using errcode='40001';end if;
assigned=coalesce(w.data->'assignments'->p_week,'{}');select data into draft from public.ca_oclm_workspaces where cong_id=p_cong_id;
for part in select * from jsonb_each_text(p_assignments) loop
select x into duty from jsonb_array_elements(w.data->'duties') x where x->>'id'=regexp_replace(part.key,'_[1-4]$','');if duty is null or part.key !~ '^Duty_[a-f0-9]{32}_[1-4]$' or substring(part.key from '_([1-4])$')::integer>(duty->>'slots')::integer then raise exception 'Assignment is outside this department' using errcode='42501';end if;
if coalesce(part.value,'')='' then assigned=assigned||jsonb_build_object(part.key,jsonb_build_object('personId',null,'publisherId',null,'status','scheduled'));continue;end if;
select * into p from public.publishers where cong_id=p_cong_id and id=part.value and transferred_at is null;if p.id is null then raise exception 'Choose an active publisher in this congregation' using errcode='42501';end if;
if p_department<>'cleaning' and not exists(select 1 from ca_private.department_people where cong_id=p_cong_id and department=p_department and publisher_id=p.id and status='approved') then raise exception 'Main administrator approval required' using errcode='42501';end if;
if exists(select 1 from jsonb_array_elements(coalesce(draft->'personnel','[]')) person cross join lateral jsonb_array_elements(coalesce(person->'availability','[]')) away where (person->>'publisherId'=p.id or person->>'id'=p.id) and to_date(p_week||'-1','IYYY-"W"IW-ID')<=(away->>'to')::date and to_date(p_week||'-7','IYYY-"W"IW-ID')>=(away->>'from')::date) then raise exception 'This publisher is unavailable that week';end if;
assigned=assigned||jsonb_build_object(part.key,jsonb_build_object('personId',p.id,'publisherId',p.id,'name',p.name,'status','scheduled'));end loop;
update ca_private.department_workspaces set data=jsonb_set(data,array['assignments',p_week],assigned),revision=w.revision+1,updated_at=clock_timestamp(),actor=auth.uid() where cong_id=p_cong_id and department=p_department;
return public.get_department_workspace(p_cong_id,p_department);end $$;

create or replace function public.publish_department_week(p_cong_id text,p_department text,p_week text,p_expected_revision bigint,p_expected_version bigint) returns jsonb language plpgsql security definer set search_path='' as $$declare w ca_private.department_workspaces;old ca_private.department_publications;duties jsonb;assigned jsonb;people jsonb;events jsonb;snapshot jsonb;begin
if not ca_private.can_publish_department(p_cong_id,p_department) then raise exception 'Department publisher access required; assistants cannot publish' using errcode='42501';end if;
if p_week is null or p_week !~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$' then raise exception 'Choose a valid week';end if;
perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));perform pg_advisory_xact_lock(hashtextextended('department:'||p_cong_id||':'||p_department,0));select * into w from ca_private.department_workspaces where cong_id=p_cong_id and department=p_department;select * into old from ca_private.department_publications where cong_id=p_cong_id and department=p_department and week=p_week;
if w.cong_id is null or p_expected_revision is distinct from w.revision or p_expected_version is distinct from coalesce(old.version,0) then raise exception 'Department changed. Reload and review before publishing.' using errcode='40001';end if;
select coalesce(jsonb_agg(d),'[]') into duties from jsonb_array_elements(w.data->'duties') d where coalesce((d->>'enabled')::boolean,true);if jsonb_array_length(duties)=0 then raise exception 'Add an enabled duty first';end if;
assigned=coalesce(w.data->'assignments'->p_week,'{}');select coalesce(jsonb_object_agg(e.key,e.value),'{}') into events from jsonb_each(w.data->'events') e where e.value->>'week'=p_week;
if events<>'{}'::jsonb then raise exception 'Date-specific duties need a separate review before publishing';end if;
if exists(select 1 from(select assigned records union all select e.value->'assignments' from jsonb_each(events) e) all_records cross join lateral jsonb_each(records) a left join public.publishers p on p.cong_id=p_cong_id and p.id=a.value->>'publisherId' where nullif(a.value->>'publisherId','') is not null and (p.id is null or p.transferred_at is not null or (p_department<>'cleaning' and not exists(select 1 from ca_private.department_people elig where elig.cong_id=p_cong_id and elig.department=p_department and elig.publisher_id=p.id and elig.status='approved')))) then raise exception 'Review publisher eligibility before publishing' using errcode='42501';end if;
select coalesce(jsonb_agg(person),'[]') into people from(select distinct jsonb_build_object('id',a.value->>'personId','name',a.value->>'name') person from(select assigned records union all select e.value->'assignments' from jsonb_each(events) e) all_records cross join lateral jsonb_each(records) a where nullif(a.value->>'personId','') is not null) x;
snapshot=jsonb_build_object('duties',duties,'assignments',assigned,'events',events,'people',people,'source',p_department,'sourceRevision',w.revision);
insert into ca_private.department_publications(cong_id,department,week,version,snapshot,updated_at,actor) values(p_cong_id,p_department,p_week,coalesce(old.version,0)+1,snapshot,clock_timestamp(),auth.uid()) on conflict(cong_id,department,week) do update set snapshot=excluded.snapshot,version=excluded.version,updated_at=excluded.updated_at,actor=excluded.actor;
insert into ca_private.department_publication_history(cong_id,department,week,version,snapshot,actor) values(p_cong_id,p_department,p_week,coalesce(old.version,0)+1,snapshot,auth.uid());
perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));perform set_config('ca.skip_publication_mail','true',true);
insert into public.ca_oclm_publications(cong_id,version,snapshot) values(p_cong_id,0,jsonb_build_object('v',2,'kind','midweek','publishedWeeks','[]'::jsonb,'assignments','{}'::jsonb,'people','[]'::jsonb)) on conflict(cong_id) do update set updated_at=clock_timestamp();perform set_config('ca.skip_publication_mail','false',true);
return public.get_department_workspace(p_cong_id,p_department);end $$;
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
