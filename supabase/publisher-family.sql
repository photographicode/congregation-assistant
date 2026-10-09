-- Family reporting is separate from personal publisher access.
create table if not exists ca_private.publisher_report_access (
 cong_id text not null, email text not null check(email=lower(trim(email))),
 publisher_id text not null, active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key(cong_id,email,publisher_id),
 foreign key(publisher_id,cong_id) references public.publishers(id,cong_id) on delete cascade
);
create index if not exists publisher_report_access_publisher_idx on ca_private.publisher_report_access(publisher_id,cong_id);
alter table ca_private.publisher_report_access enable row level security;
revoke all on ca_private.publisher_report_access from public,anon,authenticated;

create or replace function ca_private.report_publisher(p_cong text,p_publisher text) returns public.publishers language plpgsql stable security definer set search_path='' as $$
declare principal text;person public.publishers;begin
 principal=ca_private.my_publisher(p_cong);
 select * into person from public.publishers where cong_id=p_cong and id=p_publisher and transferred_at is null;
 if person.id is null or (p_publisher<>principal and not exists(select 1 from ca_private.publisher_report_access a where a.cong_id=p_cong and a.publisher_id=p_publisher and a.email=lower(auth.jwt()->>'email') and a.active)) then
 raise exception 'You do not have report permission for this publisher. Ask your administrator.' using errcode='42501';end if;
 return person;
end $$;
revoke all on function ca_private.report_publisher(text,text) from public,anon,authenticated;

create or replace function public.get_my_family_report(p_cong_id text,p_publisher_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person public.publishers;previous date;sy integer;mo integer;report jsonb;begin
 person=ca_private.report_publisher(p_cong_id,p_publisher_id);
 previous=(date_trunc('month',now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'))-interval '1 month')::date;
 mo=extract(month from previous)::integer-1;sy=extract(year from previous)::integer+case when mo>=8 then 1 else 0 end;
 select jsonb_build_object('shared',shared_in_ministry,'studies',studies,'hours',hours,'comments',comments,'auxiliaryPioneer',is_ap) into report from public.reports where cong_id=p_cong_id and pub_id=person.id and month=mo and service_year=sy;
 return jsonb_build_object('publisherId',person.id,'name',person.name,'report',jsonb_build_object('period',to_char(previous,'FMMonth YYYY'),'month',mo,'serviceYear',sy,'submitted',report is not null,'record',report,'hoursRequired',coalesce(person.is_rp,false) or coalesce(person.is_sp,false) or coalesce(person.is_fm,false)));
end $$;

create or replace function public.get_my_report_publishers(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare principal text;result jsonb;begin
 principal=ca_private.my_publisher(p_cong_id);
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name) order by (p.id=principal) desc,p.name,p.id),'[]') into result from public.publishers p where p.cong_id=p_cong_id and p.transferred_at is null and (p.id=principal or exists(select 1 from ca_private.publisher_report_access a where a.cong_id=p_cong_id and a.publisher_id=p.id and a.email=lower(auth.jwt()->>'email') and a.active));return result;
end $$;

create or replace function public.submit_family_report(p_cong_id text,p_publisher_id text,p_shared boolean,p_studies integer,p_hours numeric,p_comments text,p_expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare h jsonb;sy integer;mo integer;auxiliary boolean;begin
 -- Serialize with login changes and hold the publisher row against transfer/deletion.
 perform pg_advisory_xact_lock(hashtextextended('publisher-login:'||p_cong_id,0));
 perform 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id for share;
 h=public.get_my_family_report(p_cong_id,p_publisher_id);
 if p_shared is null or p_studies is null or p_studies<0 or p_studies>1000 or p_hours is null or p_hours<0 or p_hours>744 or length(coalesce(p_comments,''))>2000 then raise exception 'Check the report values';end if;
 sy=(h->'report'->>'serviceYear')::integer;mo=(h->'report'->>'month')::integer;
 perform pg_advisory_xact_lock(hashtextextended('publisher-report:'||p_cong_id||':'||p_publisher_id||':'||sy||':'||mo,0));
 h=public.get_my_family_report(p_cong_id,p_publisher_id);
 if coalesce(p_expected,'null'::jsonb) is distinct from coalesce(h->'report'->'record','null'::jsonb) then raise exception 'This report was already saved or changed on another device. Your entries are kept. Refresh and review the saved report before correcting it.' using errcode='40001';end if;
 if not p_shared then p_studies=0;p_hours=0;p_comments='Not Participated';end if;
 auxiliary=p_shared and p_hours>0 and not (h->'report'->>'hoursRequired')::boolean;
 insert into public.reports as existing(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap) values(gen_random_uuid()::text,p_cong_id,p_publisher_id,sy,mo,p_shared,p_studies,p_hours,coalesce(p_comments,''),auxiliary)
 on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap where jsonb_build_object('shared',existing.shared_in_ministry,'studies',existing.studies,'hours',existing.hours,'comments',existing.comments,'auxiliaryPioneer',existing.is_ap) is not distinct from coalesce(p_expected,'null'::jsonb);
 if not found then raise exception 'This report changed while saving. Your entries are kept. Refresh and review before correcting it.' using errcode='40001';end if;
 return public.get_my_family_report(p_cong_id,p_publisher_id)||jsonb_build_object('saved',true);
end $$;

create or replace function public.get_publisher_login(p_cong_id text,p_publisher_id text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin']) then raise exception 'Main administrator access required' using errcode='42501';end if;
 if not exists(select 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id and transferred_at is null) then raise exception 'Choose an active publisher in this congregation' using errcode='42501';end if;
 return coalesce((select jsonb_agg(email order by email) from (select email from public.congregation_access where cong_id=p_cong_id and publisher_id=p_publisher_id and role='publisher' and active union select email from ca_private.publisher_report_access where cong_id=p_cong_id and publisher_id=p_publisher_id and active) emails),'[]');
end $$;

create or replace function public.set_publisher_login(p_cong_id text,p_publisher_id text,p_expected jsonb,p_email text) returns jsonb language plpgsql security definer set search_path='' as $$declare current_emails jsonb;new_email text=lower(trim(coalesce(p_email,'')));principal text;begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin']) then raise exception 'Main administrator access required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('publisher-login:'||p_cong_id,0));
 perform 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id and transferred_at is null for update;if not found then raise exception 'Transferred publishers cannot regain access. Choose an active publisher.' using errcode='42501';end if;
 current_emails=public.get_publisher_login(p_cong_id,p_publisher_id);if p_expected is distinct from current_emails then raise exception 'Login changed on another device. Reopen the publisher record before changing access.' using errcode='40001';end if;
 if new_email<>'' and (length(new_email)>254 or new_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Enter a valid Google account email';end if;
 if new_email<>'' then
 select publisher_id into principal from public.congregation_access where cong_id=p_cong_id and role='publisher' and email=new_email;
 if principal is not null and principal<>p_publisher_id and not exists(select 1 from public.congregation_access a join public.publishers p on p.id=a.publisher_id and p.cong_id=a.cong_id where a.cong_id=p_cong_id and a.email=new_email and a.role='publisher' and a.active and p.transferred_at is null) then raise exception 'This email has an inactive personal login. Restore the correct active publisher login first or choose another email.' using errcode='42501';end if;
 end if;
 update public.congregation_access set active=false where cong_id=p_cong_id and role='publisher' and publisher_id=p_publisher_id and active and email<>new_email;
 update ca_private.publisher_report_access set active=false where cong_id=p_cong_id and publisher_id=p_publisher_id and active and email<>new_email;
 if new_email<>'' then
 if principal is null or principal=p_publisher_id then
 insert into public.congregation_access(cong_id,email,role,publisher_id,active) values(p_cong_id,new_email,'publisher',p_publisher_id,true) on conflict(cong_id,email,role) do update set active=true where congregation_access.publisher_id=p_publisher_id;
 else
 insert into ca_private.publisher_report_access(cong_id,email,publisher_id,active) values(p_cong_id,new_email,p_publisher_id,true) on conflict(cong_id,email,publisher_id) do update set active=true;
 end if;end if;
 return public.get_publisher_login(p_cong_id,p_publisher_id);
end $$;
revoke all on function public.get_my_family_report(text,text),public.get_my_report_publishers(text),public.submit_family_report(text,text,boolean,integer,numeric,text,jsonb),public.get_publisher_login(text,text),public.set_publisher_login(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.get_my_family_report(text,text),public.get_my_report_publishers(text),public.submit_family_report(text,text,boolean,integer,numeric,text,jsonb),public.get_publisher_login(text,text),public.set_publisher_login(text,text,jsonb,text) to authenticated;

create or replace function public.get_my_publisher_portal(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare pid text;p public.publishers;w jsonb;snapshot jsonb;away jsonb;own_ids text[];assignments jsonb;h jsonb;begin
 pid=ca_private.my_publisher(p_cong_id);select * into p from public.publishers where cong_id=p_cong_id and id=pid;
 h=public.get_my_publisher_home(p_cong_id)||public.get_my_family_report(p_cong_id,pid);select data into w from public.ca_oclm_workspaces where cong_id=p_cong_id;select ca_private.noticeboard_snapshot(p_cong_id,pub.snapshot) into snapshot from public.ca_oclm_publications pub where pub.cong_id=p_cong_id;
 select coalesce(jsonb_agg(a),'[]') into away from (select distinct x a from jsonb_array_elements(coalesce(w->'personnel','[]')) person cross join lateral jsonb_array_elements(coalesce(person->'availability','[]')) x where person->>'publisherId'=pid or person->>'id'=pid) periods;
 select coalesce(array_agg(person->>'id'),'{}')||array[pid] into own_ids from jsonb_array_elements(coalesce(w->'personnel','[]')) person where person->>'publisherId'=pid or person->>'id'=pid;
 select coalesce(jsonb_agg(jsonb_build_object('week',week.key,'slot',a.key,'isAssistant',coalesce(a.value->>'personId'=any(own_ids),false)=false and a.value->>'assistantId'=any(own_ids),'title',coalesce(nullif(a.value->>'customTitle',''),(select d->>'name' from jsonb_array_elements(coalesce(snapshot->'weekDetails'->week.key->'additionalDuties','[]')) d where a.key like (d->>'id')||'_%' limit 1),(select part->>'title' from jsonb_array_elements(coalesce(snapshot->'weekDetails'->week.key->'program'->'parts','[]')) part where part->>'id'=a.key limit 1),a.key),'time',case when coalesce(snapshot->'assignments'->week.key->'MeetingStart'->>'customTitle','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then snapshot->'assignments'->week.key->'MeetingStart'->>'customTitle' else null end,'department',(select r.department from ca_private.department_duties r where r.cong_id=p_cong_id and r.id=regexp_replace(a.key,'_[1-4]$','')),'date',to_date(week.key||'-1','IYYY-"W"IW-ID')+coalesce((select midweek_day from public.ca_meeting_settings where cong_id=p_cong_id)+6,9)%7) order by week.key,a.key),'[]') into assignments from jsonb_each(coalesce(snapshot->'assignments','{}')) week cross join lateral jsonb_each(week.value) a where (a.value->>'personId'=any(own_ids) or a.value->>'assistantId'=any(own_ids)) and coalesce(a.value->>'status','scheduled') not in('cancelled','completed') and to_date(week.key||'-1','IYYY-"W"IW-ID')+coalesce((select midweek_day from public.ca_meeting_settings where cong_id=p_cong_id)+6,9)%7>=(now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'))::date;
 return h||jsonb_build_object('assignments',assignments,'schedule',snapshot,'email',lower(auth.jwt()->>'email'),'profileComplete',not exists(select 1 from jsonb_each_text(ca_private.publisher_contact(p)) c where trim(c.value)=''),'publisherId',pid,'reportPublishers',public.get_my_report_publishers(p_cong_id),'contact',ca_private.publisher_contact(p),'away',away,'scheduleRevision',coalesce((select revision from public.ca_oclm_workspaces where cong_id=p_cong_id),0),'reminders',coalesce((select reminders from ca_private.publisher_preferences where cong_id=p_cong_id and publisher_id=pid),'[]'),'preferencesRevision',coalesce((select revision from ca_private.publisher_preferences where cong_id=p_cong_id and publisher_id=pid),0),'attendance',ca_private.publisher_attendance(p_cong_id,pid),'timezone',coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'));
end $$;

-- Account approvals are included for review but, like existing login grants, are not re-enabled by restoration.
create or replace function public.export_congregation_workspace(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare payload jsonb;begin
if not public.ca_is_congregation_admin(p_cong_id) then raise exception 'Main administrator access required' using errcode='42501';end if;
payload=jsonb_build_object('format','ca-workspace-v1','congregation',p_cong_id,'profile',(select jsonb_build_object('name',name,'email',email,'notes',notes) from public.congregations where id=p_cong_id),'publishers',(select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.publishers p where cong_id=p_cong_id),'reports',(select coalesce(jsonb_agg(to_jsonb(r) order by id),'[]') from public.reports r where cong_id=p_cong_id),'attendance',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.meeting_attendance a where cong_id=p_cong_id),'meetingSettings',(select to_jsonb(s) from public.ca_meeting_settings s where cong_id=p_cong_id),'calendar',(select coalesce(jsonb_agg(to_jsonb(c) order by meeting_date),'[]') from public.ca_meeting_calendar c where cong_id=p_cong_id),'memorial',(select coalesce(jsonb_agg(to_jsonb(m) order by meeting_date),'[]') from public.ca_memorial_attendance m where cong_id=p_cong_id),'scheduler',(select data from public.ca_oclm_workspaces where cong_id=p_cong_id),'publication',(select snapshot from public.ca_oclm_publications where cong_id=p_cong_id),'publicationHistory',(select coalesce(jsonb_agg(to_jsonb(h)-'actor' order by version),'[]') from public.ca_oclm_publication_history h where cong_id=p_cong_id),'assignmentHistory',(select coalesce(jsonb_agg(to_jsonb(e)-'actor' order by id),'[]') from public.ca_oclm_assignment_events e where cong_id=p_cong_id),'access',(select coalesce(jsonb_agg(to_jsonb(a) order by id),'[]') from public.congregation_access a where cong_id=p_cong_id),'departmentPublicationHistory',(select coalesce(jsonb_agg(to_jsonb(h)-'actor' order by department,week,version),'[]') from ca_private.department_publication_history h where cong_id=p_cong_id),'departmentWorkspaces',(select coalesce(jsonb_agg(to_jsonb(dw)-'actor' order by department),'[]') from ca_private.department_workspaces dw where cong_id=p_cong_id),'departmentPublications',(select coalesce(jsonb_agg(to_jsonb(dp)-'actor' order by department,week),'[]') from ca_private.department_publications dp where cong_id=p_cong_id),'departmentDuties',(select coalesce(jsonb_agg(to_jsonb(d) order by id),'[]') from ca_private.department_duties d where cong_id=p_cong_id),'departmentPeople',(select coalesce(jsonb_agg(to_jsonb(d)-'requested_by'-'decided_by' order by department,publisher_id),'[]') from ca_private.department_people d where cong_id=p_cong_id),'emailSettings',(select to_jsonb(s) from ca_private.workspace_mail s where cong_id=p_cong_id));
payload=payload||jsonb_build_object('publisherPreferences',(select coalesce(jsonb_agg(to_jsonb(p) order by publisher_id),'[]') from ca_private.publisher_preferences p where cong_id=p_cong_id));
payload=payload||jsonb_build_object('publisherReportAccess',(select coalesce(jsonb_agg(to_jsonb(a) order by email,publisher_id),'[]') from ca_private.publisher_report_access a where cong_id=p_cong_id));
return jsonb_build_object('data',payload,'fingerprint',md5(payload::text));end $$;
