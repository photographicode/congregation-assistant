-- Atomic function-only release. Private function rollback snapshot; no record changes.
begin;
set local lock_timeout='15s';
set local statement_timeout='90s';
create temporary table ca_followup_preservation(table_name text primary key,fingerprint text) on commit drop;
do $$declare t record;value text;begin
 for t in select n.nspname,c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','ca_private') and c.relkind='r' and c.relname<>'release_recovery_snapshots' order by n.nspname,c.relname loop
 execute format('lock table %I.%I in share row exclusive mode',t.nspname,t.relname);
 execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from %I.%I r',t.nspname,t.relname) into value;
 insert into ca_followup_preservation values(t.nspname||'.'||t.relname,value);
 end loop;
end$$;
insert into ca_private.release_recovery_snapshots(release_id,source_commit,tables,functions,policies)
select 'publisher_followup_20261008','RELEASE_SOURCE_COMMIT',
(select jsonb_object_agg(table_name,fingerprint) from ca_followup_preservation),
(select jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('get_my_publisher_portal','queue_publisher_reminders','save_congregation_reports','get_publisher_login','set_publisher_login')) or (n.nspname='ca_private' and p.proname='noticeboard_snapshot')),
(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in('public','ca_private'));
-- Match the existing publisher/month key; never replace an existing report ID.
create or replace function public.save_congregation_reports(p_cong_id text,p_reports jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; saved public.reports; rows jsonb='[]';
begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'Approved administrator or field service account required' using errcode='42501';end if;
 if jsonb_typeof(p_reports) is distinct from 'array' or jsonb_array_length(p_reports) not between 1 and 5000 then raise exception 'Choose between 1 and 5000 report rows';end if;
 if (select count(*) from jsonb_array_elements(p_reports))<>(select count(distinct (x->>'pub_id',x->>'service_year',x->>'month')) from jsonb_array_elements(p_reports) x) then raise exception 'The same publisher and month appear twice';end if;
 for r in select value from jsonb_array_elements(p_reports) loop
  if r->>'cong_id' is distinct from p_cong_id or not exists(select 1 from public.publishers p where p.cong_id=p_cong_id and p.id=r->>'pub_id') then raise exception 'Publisher is outside this congregation' using errcode='42501';end if;
  if r->>'service_year' is null or (r->>'service_year')::integer not between 1900 and 2200 or r->>'month' is null or (r->>'month')::integer not between 0 and 11 or coalesce((r->>'studies')::integer,0) not between 0 and 1000 or coalesce((r->>'hours')::numeric,0) not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Check the reporting month, studies, hours and remarks';end if;
  if coalesce((r->>'clear_auxiliary')::boolean,false) then
   -- Clear only AP fields, preserving a publisher's newer ministry/study correction.
   update public.reports set is_ap=false,hours=0,comments='' where cong_id=p_cong_id and pub_id=r->>'pub_id' and service_year=(r->>'service_year')::integer and month=(r->>'month')::integer returning * into saved;
   if not found then raise exception 'This report changed. Refresh the reports before clearing auxiliary pioneer details.' using errcode='40001';end if;
   rows=rows||jsonb_build_array(to_jsonb(saved));continue;
  end if;
  insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
  values(pg_catalog.gen_random_uuid()::text,p_cong_id,r->>'pub_id',(r->>'service_year')::integer,(r->>'month')::integer,coalesce((r->>'shared_in_ministry')::boolean,false),coalesce((r->>'studies')::integer,0),coalesce((r->>'hours')::numeric,0),coalesce(r->>'comments',''),coalesce((r->>'is_ap')::boolean,false))
  on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap
  returning * into saved;
  rows=rows||jsonb_build_array(to_jsonb(saved));
 end loop;return rows;
end $$;
revoke all on function public.save_congregation_reports(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_congregation_reports(text,jsonb) to authenticated;
create or replace function ca_private.noticeboard_snapshot(p_cong_id text,p_snapshot jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb=p_snapshot;assignments jsonb='{}';layouts jsonb=coalesce(p_snapshot->'weekDetails','{}');people jsonb=coalesce(p_snapshot->'people','[]');target_week text;data jsonb;duties jsonb;pub record;current_week text;begin
select to_char(now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'),'IYYY-"W"IW') into current_week;
layouts='{}'::jsonb;
for target_week in select key from jsonb_each(coalesce(p_snapshot->'assignments','{}')) union select dp.week from ca_private.department_publications dp where dp.cong_id=p_cong_id loop
if target_week<current_week then continue;end if;
 select coalesce(jsonb_object_agg(a.key,a.value),'{}') into data from jsonb_each(coalesce(p_snapshot->'assignments'->target_week,'{}')) a where not exists(select 1 from ca_private.department_duties r where r.cong_id=p_cong_id and r.id=regexp_replace(a.key,'_[1-4]$',''));
 select coalesce(jsonb_agg(d),'[]') into duties from jsonb_array_elements(coalesce(p_snapshot->'weekDetails'->target_week->'additionalDuties',p_snapshot->'additionalDuties','[]')) d where not exists(select 1 from ca_private.department_duties r where r.cong_id=p_cong_id and r.id=d->>'id');
 for pub in select department,snapshot from ca_private.department_publications where cong_id=p_cong_id and department in('attendant','av','cleaning') and department_publications.week=target_week loop
 data=data||(select coalesce(jsonb_object_agg(a.key,jsonb_build_object('personId',a.value->>'personId','status',coalesce(a.value->>'status','scheduled'))),'{}') from jsonb_each(coalesce(pub.snapshot->'assignments','{}')) a join ca_private.department_duties r on r.cong_id=p_cong_id and r.department=pub.department and r.id=regexp_replace(a.key,'_[1-4]$',''));
 duties=duties||(select coalesce(jsonb_agg(jsonb_build_object('id',d->>'id','name',d->>'name','section',d->>'section','slots',d->'slots','enabled',d->'enabled')),'[]') from jsonb_array_elements(coalesce(pub.snapshot->'duties','[]')) d join ca_private.department_duties r on r.cong_id=p_cong_id and r.department=pub.department and r.id=d->>'id');
 people=people||(select coalesce(jsonb_agg(jsonb_build_object('id',p->>'id','name',p->>'name')),'[]') from jsonb_array_elements(coalesce(pub.snapshot->'people','[]')) p);end loop;
 -- Departments not published for this target_week still show their duty names, without exposing drafts.
 duties=duties||(select coalesce(jsonb_agg(d),'[]') from ca_private.department_workspaces w cross join lateral jsonb_array_elements(w.data->'duties') d join ca_private.department_duties r on r.cong_id=w.cong_id and r.id=d->>'id' and r.department=w.department where w.cong_id=p_cong_id and coalesce((d->>'enabled')::boolean,true) and not exists(select 1 from ca_private.department_publications dp where dp.cong_id=p_cong_id and dp.department=r.department and dp.week=target_week));
 if target_week>=to_char(current_date,'IYYY-"W"IW') then select coalesce(jsonb_object_agg(a.key,case when exists(select 1 from public.ca_oclm_workspaces w cross join lateral jsonb_array_elements(w.data->'personnel') person join public.publishers p on p.cong_id=w.cong_id and p.id=coalesce(person->>'publisherId',person->>'id') where w.cong_id=p_cong_id and p.transferred_at is not null and person->>'id'=a.value->>'personId') or exists(select 1 from public.publishers p where p.cong_id=p_cong_id and p.id=a.value->>'personId' and p.transferred_at is not null) then a.value||jsonb_build_object('personId',null) else a.value end),'{}') into data from jsonb_each(data) a;end if;
 -- A department without a configured duty still has a clear public placeholder.
for pub in select * from(values('av','Audio Video Department','Duty_fffffffffffffffffffffffffffffff1'),('attendant','Attendant (Attendance Department)','Duty_fffffffffffffffffffffffffffffff2'),('cleaning','Cleaning','Duty_fffffffffffffffffffffffffffffff3')) as departments(department,title,id) loop
if not exists(select 1 from jsonb_array_elements(duties) d where d->>'section'=pub.title) then duties=duties||jsonb_build_array(jsonb_build_object('id',pub.id,'name',pub.title,'section',pub.title,'slots',1,'enabled',true));end if;end loop;
assignments=assignments||jsonb_build_object(target_week,data);layouts=layouts||jsonb_build_object(target_week,coalesce(p_snapshot->'weekDetails'->target_week,'{}')||jsonb_build_object('additionalDuties',duties,'oclmPublished',coalesce(p_snapshot->'assignments','{}') ? target_week));end loop;
 select coalesce(jsonb_agg(person),'[]') into people from(select distinct on (p->>'id') p person from jsonb_array_elements(people) p where exists(select 1 from jsonb_each(assignments) w cross join lateral jsonb_each(w.value) a where (a.value->>'personId'=p->>'id' or a.value->>'assistantId'=p->>'id')) order by p->>'id') x;
 return coalesce(result,'{}')||jsonb_build_object('assignments',assignments,'people',people,'weekDetails',layouts,'publishedWeeks',(select coalesce(jsonb_agg(key order by key),'[]') from jsonb_object_keys(assignments) key),'defaultWeek',(select min(key) from jsonb_object_keys(assignments) key),'currentWeek',current_week);
end $$;
create or replace function public.get_my_publisher_portal(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare pid text;p public.publishers;w jsonb;snapshot jsonb;away jsonb;own_ids text[];assignments jsonb;h jsonb;begin
 pid=ca_private.my_publisher(p_cong_id);select * into p from public.publishers where cong_id=p_cong_id and id=pid;
 h=public.get_my_publisher_home(p_cong_id);select data into w from public.ca_oclm_workspaces where cong_id=p_cong_id;select ca_private.noticeboard_snapshot(p_cong_id,pub.snapshot) into snapshot from public.ca_oclm_publications pub where pub.cong_id=p_cong_id;
 select coalesce(jsonb_agg(a),'[]') into away from (select distinct x a from jsonb_array_elements(coalesce(w->'personnel','[]')) person cross join lateral jsonb_array_elements(coalesce(person->'availability','[]')) x where person->>'publisherId'=pid or person->>'id'=pid) periods;
 select coalesce(array_agg(person->>'id'),'{}')||array[pid] into own_ids from jsonb_array_elements(coalesce(w->'personnel','[]')) person where person->>'publisherId'=pid or person->>'id'=pid;
 select coalesce(jsonb_agg(jsonb_build_object('week',week.key,'slot',a.key,'isAssistant',coalesce(a.value->>'personId'=any(own_ids),false)=false and a.value->>'assistantId'=any(own_ids),'title',coalesce(nullif(a.value->>'customTitle',''),(select d->>'name' from jsonb_array_elements(coalesce(snapshot->'weekDetails'->week.key->'additionalDuties','[]')) d where a.key like (d->>'id')||'_%' limit 1),(select part->>'title' from jsonb_array_elements(coalesce(snapshot->'weekDetails'->week.key->'program'->'parts','[]')) part where part->>'id'=a.key limit 1),a.key),'time',case when coalesce(snapshot->'assignments'->week.key->'MeetingStart'->>'customTitle','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then snapshot->'assignments'->week.key->'MeetingStart'->>'customTitle' else null end,'department',(select r.department from ca_private.department_duties r where r.cong_id=p_cong_id and r.id=regexp_replace(a.key,'_[1-4]$','')),'date',to_date(week.key||'-1','IYYY-"W"IW-ID')+coalesce((select midweek_day from public.ca_meeting_settings where cong_id=p_cong_id)+6,9)%7) order by week.key,a.key),'[]') into assignments from jsonb_each(coalesce(snapshot->'assignments','{}')) week cross join lateral jsonb_each(week.value) a where (a.value->>'personId'=any(own_ids) or a.value->>'assistantId'=any(own_ids)) and coalesce(a.value->>'status','scheduled') not in('cancelled','completed') and to_date(week.key||'-1','IYYY-"W"IW-ID')+coalesce((select midweek_day from public.ca_meeting_settings where cong_id=p_cong_id)+6,9)%7>=(now() at time zone coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'))::date;
 return h||jsonb_build_object('assignments',assignments,'schedule',snapshot,'email',lower(auth.jwt()->>'email'),'profileComplete',not exists(select 1 from jsonb_each_text(ca_private.publisher_contact(p)) c where trim(c.value)=''),'contact',ca_private.publisher_contact(p),'away',away,'scheduleRevision',coalesce((select revision from public.ca_oclm_workspaces where cong_id=p_cong_id),0),'reminders',coalesce((select reminders from ca_private.publisher_preferences where cong_id=p_cong_id and publisher_id=pid),'[]'),'preferencesRevision',coalesce((select revision from ca_private.publisher_preferences where cong_id=p_cong_id and publisher_id=pid),0),'attendance',ca_private.publisher_attendance(p_cong_id,pid),'timezone',coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata'));
end $$;
create or replace function public.queue_publisher_reminders() returns integer language plpgsql security definer set search_path='' as $$declare recipient record;item jsonb;board jsonb;own_ids text[];week record;slot record;local_time timestamp;event_date date;lead_days integer;meeting_time time;added integer=0;rows integer;begin
 if auth.role() is distinct from 'service_role' then raise exception 'Private worker required' using errcode='42501';end if;
 delete from ca_private.push_outbox j using ca_private.push_subscriptions s where j.subscription_id=s.id and j.dedupe like 'publisher:%' and j.delivered_at is null and not exists(select 1 from public.congregation_access a join public.publishers p on p.cong_id=a.cong_id and p.id=a.publisher_id where a.cong_id=s.cong_id and a.email=s.email and a.role='publisher' and a.active and p.transferred_at is null);
 for recipient in select s.id,s.cong_id,s.preferences,p.id publisher_id,pref.reminders,coalesce((select timezone from public.ca_meeting_settings where cong_id=s.cong_id),'Asia/Kolkata') timezone from ca_private.push_subscriptions s join public.congregation_access a on a.cong_id=s.cong_id and a.email=s.email and a.active and a.role='publisher' join public.publishers p on p.cong_id=a.cong_id and p.id=a.publisher_id and p.transferred_at is null join public.congregations c on c.id=s.cong_id join auth.users u on u.id=s.user_id and lower(u.email)=s.email and u.email_confirmed_at is not null left join ca_private.publisher_preferences pref on pref.cong_id=p.cong_id and pref.publisher_id=p.id where c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now() loop
 local_time=now() at time zone recipient.timezone;
 for item in select value from jsonb_array_elements(coalesce(recipient.reminders,'[]')) loop if (item->>'date')::date=local_time::date and local_time::time>=(item->>'time')::time then insert into ca_private.push_outbox(subscription_id,dedupe,title,body) values(recipient.id,'publisher:personal:'||recipient.id||':'||(item->>'id')||':'||md5(item::text),'Personal reminder','A personal reminder is due. Open My Home to check it.') on conflict(dedupe) do nothing;get diagnostics rows=row_count;added=added+rows;end if;end loop;
 if coalesce((recipient.preferences->>'assignments')::boolean,true) then
 select ca_private.noticeboard_snapshot(p.cong_id,p.snapshot) into board from public.ca_oclm_publications p where p.cong_id=recipient.cong_id;
 select coalesce(array_agg(person->>'id'),'{}')||array[recipient.publisher_id] into own_ids from public.ca_oclm_workspaces w cross join lateral jsonb_array_elements(coalesce(w.data->'personnel','[]')) person where w.cong_id=recipient.cong_id and (person->>'publisherId'=recipient.publisher_id or person->>'id'=recipient.publisher_id);
 for week in select * from jsonb_each(coalesce(board->'assignments','{}')) loop event_date=to_date(week.key||'-1','IYYY-"W"IW-ID')+coalesce((select midweek_day+6 from public.ca_meeting_settings where cong_id=recipient.cong_id),9)%7;
 meeting_time=case when coalesce(week.value->'MeetingStart'->>'customTitle','') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then (week.value->'MeetingStart'->>'customTitle')::time else '09:00'::time end;
 foreach lead_days in array array[14,7,3,1] loop
 if event_date=local_time::date+lead_days and local_time::time>=meeting_time then for slot in select * from jsonb_each(week.value) loop if (slot.value->>'personId'=any(own_ids) or slot.value->>'assistantId'=any(own_ids)) and coalesce(slot.value->>'status','scheduled') not in('cancelled','completed') then insert into ca_private.push_outbox(subscription_id,dedupe,title,body) values(recipient.id,'publisher:assignment:'||recipient.id||':'||week.key||':'||slot.key||':'||lead_days,'Upcoming assignment','You have a published assignment or duty in '||lead_days||' day(s). Open My assignments to check it.') on conflict(dedupe) do nothing;get diagnostics rows=row_count;added=added+rows;end if;end loop;end if;end loop;end loop;
 end if;end loop;return added;
end $$;

-- Main-admin enrollment uses existing membership enforcement. No private-table grants broadened.
create or replace function public.get_publisher_login(p_cong_id text,p_publisher_id text) returns jsonb language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin']) then raise exception 'Main administrator access required' using errcode='42501';end if;
if not exists(select 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id and transferred_at is null) then raise exception 'Choose an active publisher in this congregation' using errcode='42501';end if;
return coalesce((select jsonb_agg(email order by email) from public.congregation_access where cong_id=p_cong_id and publisher_id=p_publisher_id and role='publisher' and active),'[]');end $$;
create or replace function public.set_publisher_login(p_cong_id text,p_publisher_id text,p_expected jsonb,p_email text) returns jsonb language plpgsql security definer set search_path='' as $$declare current_emails jsonb;new_email text=lower(trim(coalesce(p_email,'')));begin
if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin']) then raise exception 'Main administrator access required' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtextextended('publisher-login:'||p_cong_id,0));
perform 1 from public.publishers where cong_id=p_cong_id and id=p_publisher_id and transferred_at is null for update;if not found then raise exception 'Transferred publishers cannot regain access. Choose an active publisher.' using errcode='42501';end if;
current_emails=public.get_publisher_login(p_cong_id,p_publisher_id);if p_expected is distinct from current_emails then raise exception 'Login changed on another device. Reopen the publisher record before changing access.' using errcode='40001';end if;
if new_email<>'' and (length(new_email)>254 or new_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then raise exception 'Enter a valid Google account email';end if;
if exists(select 1 from public.congregation_access where cong_id=p_cong_id and role='publisher' and email=new_email and publisher_id<>p_publisher_id) then raise exception 'This email is connected to another publisher. Review their record first.' using errcode='42501';end if;
update public.congregation_access set active=false where cong_id=p_cong_id and role='publisher' and publisher_id=p_publisher_id and active and email<>new_email;
if new_email<>'' then insert into public.congregation_access(cong_id,email,role,publisher_id,active) values(p_cong_id,new_email,'publisher',p_publisher_id,true) on conflict(cong_id,email,role) do update set active=true where congregation_access.publisher_id=p_publisher_id;end if;
return public.get_publisher_login(p_cong_id,p_publisher_id);end $$;
revoke all on function public.get_publisher_login(text,text),public.set_publisher_login(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.get_publisher_login(text,text),public.set_publisher_login(text,text,jsonb,text) to authenticated;
do $$declare t record;after_hash text;old_policies jsonb;begin
 for t in select * from ca_followup_preservation loop
 execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from %I.%I r',split_part(t.table_name,'.',1),split_part(t.table_name,'.',2)) into after_hash;
 if after_hash is distinct from t.fingerprint then raise exception 'Preservation check failed: %',t.table_name;end if;
 end loop;
 select policies into old_policies from ca_private.release_recovery_snapshots where release_id='publisher_followup_20261008';
 if old_policies is distinct from (select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in('public','ca_private')) then raise exception 'Policies unexpectedly changed';end if;
end$$;
commit;
