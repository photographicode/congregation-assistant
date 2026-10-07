-- Department workspaces use the same revision-checked OCLM draft, without granting OCLM or report access.
alter table public.congregation_access drop constraint congregation_access_role_check;
alter table public.congregation_access add constraint congregation_access_role_check check(role in ('admin','field_service','attendance','oclm','group_overseer','publisher','attendant','av'));
alter policy congregations_read on public.congregations using(public.ca_has_role(id,array['admin','field_service','attendance','oclm','group_overseer','publisher','attendant','av']));
create table if not exists ca_private.department_duties(
 cong_id text not null references public.congregations(id) on delete cascade,
 id text not null check(id ~ '^Duty_[a-f0-9]{32}$'),
 department text not null check(department in ('attendant','av','cleaning')),
 primary key(cong_id,id)
);
create table if not exists ca_private.department_people(
 cong_id text not null, department text not null check(department in ('attendant','av','cleaning')),
 publisher_id text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 requested_by uuid, decided_by uuid, updated_at timestamptz not null default now(),
 primary key(cong_id,department,publisher_id),
 foreign key(publisher_id,cong_id) references public.publishers(id,cong_id) on delete cascade
);
alter table ca_private.department_duties enable row level security;
alter table ca_private.department_people enable row level security;
revoke all on ca_private.department_duties,ca_private.department_people from public,anon,authenticated;

create or replace function ca_private.can_manage_department(p_cong text,p_department text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and case p_department when 'attendant' then public.ca_has_role(p_cong,array['attendance','attendant']) when 'av' then public.ca_has_role(p_cong,array['av']) when 'cleaning' then public.ca_has_role(p_cong,array['oclm']) else false end;
$$;
revoke all on function ca_private.can_manage_department(text,text) from public,anon,authenticated;

-- Adopt known existing department duties without changing any assignments or granting eligibility.
insert into ca_private.department_duties(cong_id,id,department)
select w.cong_id,d->>'id',case when lower(trim(d->>'section')) in ('av','audio video','audio video department') then 'av' when lower(trim(d->>'section'))='cleaning' then 'cleaning' else 'attendant' end
from public.ca_oclm_workspaces w,jsonb_array_elements(coalesce(w.data->'additionalDuties','[]')) d
where lower(trim(d->>'section')) in ('attendant','attendants','attendance','attendant (attendance department)','av','audio video','audio video department','cleaning') on conflict do nothing;
insert into ca_private.department_people(cong_id,department,publisher_id,status)
select distinct r.cong_id,r.department,p.publisher_id,'pending' from ca_private.department_duties r join public.ca_oclm_workspaces w on w.cong_id=r.cong_id
cross join lateral (select person->>'publisherId' publisher_id from jsonb_array_elements(w.data->'personnel') person where person->'roles' ? r.id or exists(select 1 from jsonb_each(w.data->'assignments') week,jsonb_each(week.value) part where part.key like r.id||'_%' and part.value->>'personId'=person->>'id')) p
join public.publishers publisher on publisher.cong_id=r.cong_id and publisher.id=p.publisher_id on conflict do nothing;

create or replace function public.get_department_workspace(p_cong_id text,p_department text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare w public.ca_oclm_workspaces;begin
 if not ca_private.can_manage_department(p_cong_id,p_department) then raise exception 'Department access required' using errcode='42501';end if;
 select * into w from public.ca_oclm_workspaces where cong_id=p_cong_id;
 return jsonb_build_object('revision',coalesce(w.revision,0),'duties',(select coalesce(jsonb_agg(d),'[]') from jsonb_array_elements(coalesce(w.data->'additionalDuties','[]')) d join ca_private.department_duties r on r.cong_id=p_cong_id and r.id=d->>'id' and r.department=p_department),'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'status',coalesce(a.status,'not_requested'),'availability',coalesce((select person->'availability' from jsonb_array_elements(coalesce(w.data->'personnel','[]')) person where person->>'publisherId'=p.id or person->>'id'=p.id limit 1),'[]')) order by p.name),'[]') from public.publishers p left join ca_private.department_people a on a.cong_id=p.cong_id and a.publisher_id=p.id and a.department=p_department where p.cong_id=p_cong_id),'assignments',(select coalesce(jsonb_object_agg(week.key,(select coalesce(jsonb_object_agg(part.key,part.value||jsonb_build_object('name',(select person->>'name' from jsonb_array_elements(coalesce(w.data->'personnel','[]')) person where person->>'id'=part.value->>'personId' limit 1),'publisherId',(select coalesce(person->>'publisherId',person->>'id') from jsonb_array_elements(coalesce(w.data->'personnel','[]')) person where person->>'id'=part.value->>'personId' limit 1))),'{}') from jsonb_each(week.value) part join ca_private.department_duties r on r.cong_id=p_cong_id and r.department=p_department and r.id=regexp_replace(part.key,'_[1-4]$',''))),'{}') from jsonb_each(coalesce(w.data->'assignments','{}')) week));
end $$;

create or replace function public.request_department_person(p_cong_id text,p_department text,p_publisher_id text) returns boolean language plpgsql security definer set search_path='' as $$begin
 if not ca_private.can_manage_department(p_cong_id,p_department) then raise exception 'Department access required' using errcode='42501';end if;
 if not exists(select 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id) then raise exception 'Choose a publisher in this congregation';end if;
 insert into ca_private.department_people(cong_id,department,publisher_id,requested_by) values(p_cong_id,p_department,p_publisher_id,auth.uid()) on conflict(cong_id,department,publisher_id) do update set status=case when department_people.status='approved' then 'approved' else 'pending' end,requested_by=auth.uid(),updated_at=clock_timestamp();return true;
end $$;

create or replace function public.decide_department_person(p_cong_id text,p_department text,p_publisher_id text,p_approve boolean) returns boolean language plpgsql security definer set search_path='' as $$begin
 if p_approve is null then raise exception 'Choose approve or reject';end if;
 if auth.uid() is null or not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator approval required' using errcode='42501';end if;
 update ca_private.department_people set status=case when p_approve then 'approved' else 'rejected' end,decided_by=auth.uid(),updated_at=clock_timestamp() where cong_id=p_cong_id and department=p_department and publisher_id=p_publisher_id;
 if not found then raise exception 'Request this publisher first';end if;return true;
end $$;

create or replace function public.save_department_duty(p_cong_id text,p_department text,p_expected_revision bigint,p_id text,p_name text,p_slots integer,p_enabled boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.ca_oclm_workspaces;data jsonb;duty jsonb;duties jsonb;d_id text;section text;begin
 if not ca_private.can_manage_department(p_cong_id,p_department) then raise exception 'Department access required' using errcode='42501';end if;
 if length(trim(coalesce(p_name,''))) not between 1 and 100 or p_slots not between 1 and 4 or p_enabled is null then raise exception 'Enter a duty name and choose 1 to 4 people';end if;
 perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));select * into w from public.ca_oclm_workspaces where cong_id=p_cong_id;
 if p_expected_revision is distinct from coalesce(w.revision,0) then raise exception 'The schedule changed. Reload before saving; your entry is kept.' using errcode='40001';end if;
 data=coalesce(w.data,'{"v":3,"personnel":[],"assignments":{},"additionalDuties":[],"programs":{},"template":"modern"}'::jsonb);d_id=coalesce(nullif(p_id,''),'Duty_'||replace(gen_random_uuid()::text,'-',''));
 if nullif(p_id,'') is not null and not exists(select 1 from ca_private.department_duties where cong_id=p_cong_id and department=p_department and department_duties.id=p_id) then raise exception 'This duty belongs to another department' using errcode='42501';end if;
 if nullif(p_id,'') is null and jsonb_array_length(data->'additionalDuties')>=20 then raise exception 'Up to 20 additional duties are supported. Disable unused duties.';end if;
 if nullif(p_id,'') is not null and exists(select 1 from jsonb_each(data->'assignments') week,jsonb_each(week.value) part where part.key ~ '^Duty_[a-f0-9]{32}_[1-4]$' and regexp_replace(part.key,'_[1-4]$','')=p_id and right(part.key,1)::integer>p_slots and nullif(part.value->>'personId','') is not null) then raise exception 'These extra places have existing assignments. Keep that number of people or add a separate duty.';end if;
 section=case p_department when 'av' then 'Audio Video Department' when 'attendant' then 'Attendant (Attendance Department)' else 'Cleaning' end;
 select coalesce(jsonb_agg(d),'[]') into duties from jsonb_array_elements(data->'additionalDuties') d where d->>'id'<>d_id;
 if exists(select 1 from jsonb_array_elements(duties) d where lower(d->>'name')=lower(trim(p_name)) and d->>'section'=section) then raise exception 'This duty name already exists';end if;
 duty=jsonb_build_object('id',d_id,'name',trim(p_name),'section',section,'slots',p_slots,'enabled',p_enabled);data=jsonb_set(data,'{additionalDuties}',duties||jsonb_build_array(duty));
 insert into ca_private.department_duties values(p_cong_id,d_id,p_department) on conflict do nothing;
 insert into public.ca_oclm_workspaces(cong_id,revision,data,updated_at,updated_by) values(p_cong_id,coalesce(w.revision,0)+1,data,clock_timestamp(),auth.uid()) on conflict(cong_id) do update set revision=excluded.revision,data=excluded.data,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 return public.get_department_workspace(p_cong_id,p_department);
end $$;

create or replace function public.save_department_assignments(p_cong_id text,p_department text,p_expected_revision bigint,p_week text,p_assignments jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.ca_oclm_workspaces;draft_data jsonb;weekdata jsonb;part record;person jsonb;pid text;pub public.publishers;duty jsonb;startdate date;before_part jsonb;after_part jsonb;begin
 if not ca_private.can_manage_department(p_cong_id,p_department) then raise exception 'Department access required' using errcode='42501';end if;
 if p_week !~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$' or jsonb_typeof(p_assignments) is distinct from 'object' or pg_column_size(p_assignments)>32768 then raise exception 'Choose a valid week and assignments';end if;
 startdate=to_date(p_week||'-1','IYYY-"W"IW-ID');
 perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));select * into w from public.ca_oclm_workspaces where cong_id=p_cong_id;
 if w.cong_id is null or p_expected_revision is distinct from w.revision then raise exception 'The schedule changed. Reload before saving; your choices are kept.' using errcode='40001';end if;
 draft_data=w.data;weekdata=coalesce(draft_data->'assignments'->p_week,'{}');
 for part in select * from jsonb_each_text(p_assignments) loop
 select d into duty from jsonb_array_elements(draft_data->'additionalDuties') d join ca_private.department_duties r on r.cong_id=p_cong_id and r.department=p_department and r.id=d->>'id' where part.key ~ '^Duty_[a-f0-9]{32}_[1-4]$' and r.id=regexp_replace(part.key,'_[1-4]$','') and right(part.key,1)::integer<=(d->>'slots')::integer;
 if duty is null then raise exception 'This assignment belongs to another department' using errcode='42501';end if;
 if nullif(part.value,'') is null then weekdata=weekdata||jsonb_build_object(part.key,jsonb_build_object('personId',null,'status','scheduled','assignmentType',duty->>'id','customTitle',''));continue;end if;
 if not coalesce((duty->>'enabled')::boolean,true) then raise exception 'This duty is disabled for new assignments';end if;
 if not exists(select 1 from ca_private.department_people where cong_id=p_cong_id and department=p_department and publisher_id=part.value and status='approved') then raise exception 'Administrator approval required for this publisher' using errcode='42501';end if;
 select * into pub from public.publishers where cong_id=p_cong_id and id=part.value;if not found then raise exception 'Publisher no longer available';end if;
 select p into person from jsonb_array_elements(draft_data->'personnel') p where p->>'publisherId'=pub.id or p->>'id'=pub.id limit 1;
 if exists(select 1 from jsonb_array_elements(coalesce(person->'availability','[]')) away where (away->>'from')::date<=startdate+6 and (away->>'to')::date>=startdate) then raise exception 'This publisher is unavailable that week';end if;
 if person is null then person=jsonb_build_object('id',pub.id,'publisherId',pub.id,'name',pub.name,'gender',pub.gender,'appointment','Other','roles','[]'::jsonb,'exceptions','{}'::jsonb,'availability','[]'::jsonb,'archived',false);draft_data=jsonb_set(draft_data,'{personnel}',draft_data->'personnel'||jsonb_build_array(person));end if;pid=person->>'id';
 weekdata=weekdata||jsonb_build_object(part.key,jsonb_build_object('personId',pid,'status','scheduled','assignmentType',duty->>'id','customTitle',''));
 end loop;
 for part in select * from jsonb_each_text(p_assignments) loop
 before_part=w.data->'assignments'->p_week->part.key;after_part=weekdata->part.key;
 if before_part->>'personId' is distinct from after_part->>'personId' then
 insert into public.ca_oclm_assignment_events(cong_id,revision,week,slot,assignment_type,previous_person,person_id,status,actor) values(p_cong_id,w.revision+1,p_week,part.key,after_part->>'assignmentType',before_part->>'personId',after_part->>'personId',case when nullif(after_part->>'personId','') is null then 'cancelled' when nullif(before_part->>'personId','') is not null then 'reassigned' else 'scheduled' end,auth.uid());end if;
 end loop;
 draft_data=jsonb_set(draft_data,'{assignments}',(draft_data->'assignments')||jsonb_build_object(p_week,weekdata));draft_data=ca_private.clean_oclm_draft(p_cong_id,draft_data);
 update public.ca_oclm_workspaces set revision=w.revision+1,data=draft_data,updated_at=clock_timestamp(),updated_by=auth.uid() where cong_id=p_cong_id;
 return public.get_department_workspace(p_cong_id,p_department);
end $$;

-- Only minimal duty IDs are needed by the OCLM screen to make owned controls read-only.
create or replace function public.get_managed_duties(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'Scheduler access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'department',department)),'[]') from ca_private.department_duties where cong_id=p_cong_id);
end $$;
revoke all on function public.get_department_workspace(text,text),public.request_department_person(text,text,text),public.decide_department_person(text,text,text,boolean),public.save_department_duty(text,text,bigint,text,text,integer,boolean),public.save_department_assignments(text,text,bigint,text,jsonb),public.get_managed_duties(text) from public,anon,authenticated;
grant execute on function public.get_department_workspace(text,text),public.request_department_person(text,text,text),public.decide_department_person(text,text,text,boolean),public.save_department_duty(text,text,bigint,text,text,integer,boolean),public.save_department_assignments(text,text,bigint,text,jsonb),public.get_managed_duties(text) to authenticated;

create or replace function public.save_oclm_workspace(p_cong_id text,p_expected_revision bigint,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$declare old public.ca_oclm_workspaces;newrow public.ca_oclm_workspaces;clean jsonb;week text;slot text;before_part jsonb;after_part jsonb;begin
if not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'Scheduler access required' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));select * into old from public.ca_oclm_workspaces where cong_id=p_cong_id;
if p_expected_revision is distinct from coalesce(old.revision,0) then raise exception 'This shared draft changed on another device. Keep your recovery copy and load the shared draft before editing.' using errcode='40001';end if;
-- OCLM clients cannot forge department-owned definitions or assignments.
if current_setting('ca.restoring_departments',true) is distinct from 'true' then
if exists(select 1 from jsonb_array_elements(coalesce(p_data->'additionalDuties','[]')) d where lower(trim(d->>'section')) in ('attendant','attendants','attendance','attendant (attendance department)','av','audio video','audio video department','cleaning') and not exists(select 1 from ca_private.department_duties r where r.cong_id=p_cong_id and r.id=d->>'id')) then raise exception 'Set up department duties in the department workspace' using errcode='42501';end if;


if exists(select 1 from jsonb_each(coalesce(old.data->'assignments','{}')) week,jsonb_each(week.value) part
join ca_private.department_duties r on r.cong_id=p_cong_id and r.id=regexp_replace(part.key,'_[1-4]$','')
join lateral (select person from jsonb_array_elements(old.data->'personnel') person where person->>'id'=part.value->>'personId' limit 1) prior on true
left join lateral (select person from jsonb_array_elements(p_data->'personnel') person where person->>'id'=part.value->>'personId' limit 1) incoming on true
left join public.publishers pub on pub.cong_id=p_cong_id and pub.id=coalesce(prior.person->>'publisherId',prior.person->>'id')
where incoming.person is null or incoming.person->>'publisherId' is distinct from prior.person->>'publisherId' or incoming.person->>'name' is distinct from coalesce(pub.name,prior.person->>'name')) then raise exception 'Department assignments must keep their approved publisher identity' using errcode='42501';end if;

if exists(select 1 from ca_private.department_duties r where r.cong_id=p_cong_id and
 (select d from jsonb_array_elements(coalesce(old.data->'additionalDuties','[]')) d where d->>'id'=r.id limit 1) is distinct from
 (select d from jsonb_array_elements(coalesce(p_data->'additionalDuties','[]')) d where d->>'id'=r.id limit 1)) then raise exception 'Use the department workspace to change its duties' using errcode='42501';end if;
if exists(select 1 from jsonb_each(coalesce(old.data->'assignments','{}')||coalesce(p_data->'assignments','{}')) week,ca_private.department_duties r,generate_series(1,4) n where r.cong_id=p_cong_id and
 coalesce(old.data->'assignments'->week.key->(r.id||'_'||n)::text,'null'::jsonb) is distinct from coalesce(p_data->'assignments'->week.key->(r.id||'_'||n)::text,'null'::jsonb)) then raise exception 'Use the department workspace to change its assignments' using errcode='42501';end if;
end if;
clean=ca_private.clean_oclm_draft(p_cong_id,p_data);
insert into public.ca_oclm_workspaces(cong_id,revision,data,updated_at,updated_by) values(p_cong_id,coalesce(old.revision,0)+1,clean,clock_timestamp(),auth.uid()) on conflict(cong_id) do update set revision=excluded.revision,data=excluded.data,updated_at=excluded.updated_at,updated_by=excluded.updated_by returning * into newrow;
for week in select key from jsonb_each(coalesce(old.data->'assignments','{}')||(clean->'assignments')) loop
for slot in select key from jsonb_each(coalesce(old.data->'assignments'->week,'{}')||coalesce(clean->'assignments'->week,'{}')) loop
before_part=old.data->'assignments'->week->slot;after_part=clean->'assignments'->week->slot;
if (nullif(before_part->>'personId','') is not null or nullif(after_part->>'personId','') is not null) and (before_part->>'personId' is distinct from after_part->>'personId' or coalesce(before_part->>'status','scheduled') is distinct from coalesce(after_part->>'status','cancelled') or before_part->>'assignmentType' is distinct from after_part->>'assignmentType') then
insert into public.ca_oclm_assignment_events(cong_id,revision,week,slot,assignment_type,previous_person,person_id,status,actor) values(p_cong_id,newrow.revision,week,slot,coalesce(after_part->>'assignmentType',before_part->>'assignmentType',ca_private.oclm_role_for_slot(slot)),before_part->>'personId',after_part->>'personId',case when before_part->>'personId' is not null and after_part->>'personId' is not null and before_part->>'personId' is distinct from after_part->>'personId' then 'reassigned' else coalesce(after_part->>'status','cancelled') end,auth.uid());end if;end loop;end loop;
return jsonb_build_object('revision',newrow.revision,'draft',newrow.data,'updatedAt',newrow.updated_at);end $$;

create or replace function public.export_congregation_workspace(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare payload jsonb;begin
if not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator access required' using errcode='42501';end if;
payload=jsonb_build_object('format','ca-workspace-v1','congregation',p_cong_id,'profile',(select jsonb_build_object('name',name,'email',email,'notes',notes) from public.congregations where id=p_cong_id),'publishers',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.publishers p where cong_id=p_cong_id),'reports',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.reports r where cong_id=p_cong_id),'attendance',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.meeting_attendance a where cong_id=p_cong_id),'meetingSettings',(select to_jsonb(s) from public.ca_meeting_settings s where cong_id=p_cong_id),'calendar',(select coalesce(jsonb_agg(to_jsonb(c) order by meeting_date),'[]') from public.ca_meeting_calendar c where cong_id=p_cong_id),'memorial',(select coalesce(jsonb_agg(to_jsonb(m) order by meeting_date),'[]') from public.ca_memorial_attendance m where cong_id=p_cong_id),'scheduler',(select data from public.ca_oclm_workspaces where cong_id=p_cong_id),'publication',(select snapshot from public.ca_oclm_publications where cong_id=p_cong_id),'publicationHistory',(select coalesce(jsonb_agg(to_jsonb(h)-'actor' order by version),'[]') from public.ca_oclm_publication_history h where cong_id=p_cong_id),'assignmentHistory',(select coalesce(jsonb_agg(to_jsonb(e)-'actor' order by id),'[]') from public.ca_oclm_assignment_events e where cong_id=p_cong_id),'access',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.congregation_access a where cong_id=p_cong_id),'departmentDuties',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from ca_private.department_duties d where cong_id=p_cong_id),'departmentPeople',(select coalesce(jsonb_agg(to_jsonb(d)-'requested_by'-'decided_by' order by department,publisher_id),'[]') from ca_private.department_people d where cong_id=p_cong_id),'emailSettings',(select to_jsonb(s) from ca_private.workspace_mail s where cong_id=p_cong_id));
return jsonb_build_object('data',payload,'fingerprint',md5(payload::text));end $$;
create or replace function public.restore_congregation_workspace(p_cong_id text,p_expected_fingerprint text,p_backup jsonb) returns boolean language plpgsql security definer set search_path='' as $$declare current_backup jsonb;old_revision bigint;old_version bigint;restored jsonb;item jsonb;rowvalue jsonb;pub public.ca_oclm_publications;layouts jsonb='{}';meeting_week record;clean_layout jsonb;begin
if not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator access required' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtextextended('oclm:'||p_cong_id,0));lock table public.publishers,public.reports,public.meeting_attendance,public.congregation_access,public.ca_meeting_settings,public.ca_meeting_calendar,public.ca_memorial_attendance in share row exclusive mode;
current_backup=public.export_congregation_workspace(p_cong_id);if p_expected_fingerprint is distinct from current_backup->>'fingerprint' then raise exception 'Workspace changed. Export its latest recovery copy before restoring.' using errcode='40001';end if;
if p_backup->>'format' is distinct from 'ca-workspace-v1' or p_backup->>'congregation' is distinct from p_cong_id or pg_column_size(p_backup)>33554432 then raise exception 'Choose a valid backup for this congregation';end if;
foreach rowvalue in array array[p_backup->'publishers',p_backup->'reports',p_backup->'attendance',p_backup->'calendar',p_backup->'memorial',p_backup->'access'] loop if jsonb_typeof(rowvalue) is distinct from 'array' then raise exception 'Backup datasets are incomplete';end if;end loop;
-- Preserve billing, public-link tokens and current membership grants. They are reviewed separately.
-- Publisher grants survive when their publisher IDs remain; omitted IDs remove those grants by FK.
set constraints all deferred;
delete from public.reports where cong_id=p_cong_id;delete from public.meeting_attendance where cong_id=p_cong_id;
-- Update existing publishers without deleting their bindings; insert absent records, remove omitted ones.
for item in select value from jsonb_array_elements(p_backup->'publishers') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign congregation record';end if;if exists(select 1 from public.publishers where id=item->>'id' and cong_id<>p_cong_id) then raise exception 'Foreign publisher ID' using errcode='42501';end if;
insert into public.publishers select (jsonb_populate_record(null::public.publishers,item)).* on conflict(id) do update set name=excluded.name,service_group=excluded.service_group,gender=excluded.gender,hope=excluded.hope,dob=excluded.dob,baptized=excluded.baptized,is_elder=excluded.is_elder,is_ms=excluded.is_ms,is_rp=excluded.is_rp,is_sp=excluded.is_sp,is_fm=excluded.is_fm,phone=excluded.phone,address=excluded.address,emergency_name=excluded.emergency_name,emergency_relationship=excluded.emergency_relationship,emergency_phone=excluded.emergency_phone,spiritual_status=excluded.spiritual_status,family_head_id=excluded.family_head_id;end loop;
delete from public.publishers where cong_id=p_cong_id and not exists(select 1 from jsonb_array_elements(p_backup->'publishers') p where p->>'id'=publishers.id);
for item in select value from jsonb_array_elements(p_backup->'reports') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign report';end if;insert into public.reports select (jsonb_populate_record(null::public.reports,item)).*;end loop;
for item in select value from jsonb_array_elements(p_backup->'attendance') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign attendance';end if;insert into public.meeting_attendance select (jsonb_populate_record(null::public.meeting_attendance,item)).*;end loop;
delete from public.ca_meeting_calendar where cong_id=p_cong_id;delete from public.ca_memorial_attendance where cong_id=p_cong_id;
for item in select value from jsonb_array_elements(p_backup->'calendar') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign meeting';end if;insert into public.ca_meeting_calendar select (jsonb_populate_record(null::public.ca_meeting_calendar,item)).*;end loop;
for item in select value from jsonb_array_elements(p_backup->'memorial') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign memorial record';end if;insert into public.ca_memorial_attendance(cong_id,meeting_date,attendance) values(p_cong_id,(item->>'meeting_date')::date,(item->>'attendance')::integer);end loop;
if jsonb_typeof(p_backup->'meetingSettings')='object' then item=p_backup->'meetingSettings';if item->>'cong_id' is distinct from p_cong_id or not exists(select 1 from pg_timezone_names where name=item->>'timezone') then raise exception 'Invalid meeting settings';end if;insert into public.ca_meeting_settings select (jsonb_populate_record(null::public.ca_meeting_settings,item)).* on conflict(cong_id) do update set timezone=excluded.timezone,midweek_day=excluded.midweek_day,weekend_day=excluded.weekend_day;else delete from public.ca_meeting_settings where cong_id=p_cong_id;end if;
select revision into old_revision from public.ca_oclm_workspaces where cong_id=p_cong_id;select version into old_version from public.ca_oclm_publications where cong_id=p_cong_id;
if p_backup ? 'departmentDuties' then
if jsonb_typeof(p_backup->'departmentDuties') is distinct from 'array' or jsonb_typeof(p_backup->'departmentPeople') is distinct from 'array' then raise exception 'Invalid department backup';end if;
delete from ca_private.department_duties where cong_id=p_cong_id;delete from ca_private.department_people where cong_id=p_cong_id;
for item in select value from jsonb_array_elements(p_backup->'departmentDuties') loop if item->>'cong_id' is distinct from p_cong_id or not exists(select 1 from jsonb_array_elements(coalesce(p_backup->'scheduler'->'additionalDuties','[]')) d where d->>'id'=item->>'id') then raise exception 'Invalid department duty';end if;insert into ca_private.department_duties(cong_id,id,department) values(p_cong_id,item->>'id',item->>'department');end loop;
for item in select value from jsonb_array_elements(p_backup->'departmentPeople') loop if item->>'cong_id' is distinct from p_cong_id then raise exception 'Foreign department approval';end if;insert into ca_private.department_people(cong_id,department,publisher_id,status,decided_by) values(p_cong_id,item->>'department',item->>'publisher_id',item->>'status',auth.uid());end loop;
else
-- Legacy files do not revoke present eligibility approvals. Remove only orphan ownership definitions.
delete from ca_private.department_duties r where r.cong_id=p_cong_id and not exists(select 1 from jsonb_array_elements(coalesce(p_backup->'scheduler'->'additionalDuties','[]')) d where d->>'id'=r.id);
end if;
perform set_config('ca.restoring_departments','true',true);
if jsonb_typeof(p_backup->'scheduler')='object' then restored=public.save_oclm_workspace(p_cong_id,coalesce(old_revision,0),p_backup->'scheduler');end if;perform set_config('ca.restoring_departments','false',true);
if jsonb_typeof(p_backup->'publication')='object' then perform set_config('ca.skip_publication_mail','true',true);perform public.upsert_oclm_public_snapshot(p_cong_id,p_backup->'publication');perform set_config('ca.skip_publication_mail','false',true);
for meeting_week in select * from jsonb_each(coalesce(p_backup->'publication'->'weekDetails','{}')) loop clean_layout=ca_private.clean_oclm_draft(p_cong_id,jsonb_build_object('personnel','[]'::jsonb,'assignments','{}'::jsonb,'additionalDuties',coalesce(meeting_week.value->'additionalDuties','[]'),'programs',case when jsonb_typeof(meeting_week.value->'program')='object' then jsonb_build_object(meeting_week.key,meeting_week.value->'program') else '{}'::jsonb end));layouts=layouts||jsonb_build_object(meeting_week.key,jsonb_build_object('additionalDuties',clean_layout->'additionalDuties','program',clean_layout->'programs'->meeting_week.key));end loop;
update public.ca_oclm_publications set snapshot=snapshot||jsonb_build_object('weekDetails',layouts),version=coalesce(old_version,0)+1,updated_at=clock_timestamp() where cong_id=p_cong_id returning * into pub;insert into public.ca_oclm_publication_history(cong_id,version,snapshot,action,actor) values(p_cong_id,pub.version,pub.snapshot,'restore_workspace',auth.uid());end if;
if jsonb_typeof(p_backup->'emailSettings')='object' then item=p_backup->'emailSettings';perform public.set_workspace_email(p_cong_id,item->>'email',(item->>'enabled')::boolean,(item->>'published')::boolean,(item->>'reports')::boolean,(item->>'oclm')::boolean,(item->>'oclm_day')::integer,(item->>'reminder_time')::time,item->>'timezone');perform public.set_attendance_email(p_cong_id,(item->>'attendance')::boolean,(item->>'attendance_link')::boolean,(item->>'attendance_time')::time,(item->>'attendance_link_time')::time);else delete from ca_private.workspace_mail where cong_id=p_cong_id;end if;
update public.congregations set name=left(p_backup->'profile'->>'name',150),email=left(p_backup->'profile'->>'email',254),notes=left(p_backup->'profile'->>'notes',10000) where id=p_cong_id;
return true;end $$;
revoke all on function public.export_congregation_workspace(text),public.restore_congregation_workspace(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.export_congregation_workspace(text),public.restore_congregation_workspace(text,text,jsonb) to authenticated;
