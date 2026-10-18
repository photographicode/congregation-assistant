-- Refinement only: preserve AP report contents, compare reviewed rows atomically,
-- persist the existing auxiliary setting and omit disabled auxiliary names publicly.
CREATE OR REPLACE FUNCTION public.save_group_reports(p_cong_id text, p_year integer, p_month integer, p_reports jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r jsonb;p public.publishers;s boolean;st integer;h numeric;rows jsonb='[]';saved public.reports;
begin if not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['group_overseer']) then raise exception 'Approved group account required' using errcode='42501';end if;
if p_year is null or p_year not between 1900 and 2200 or p_month is null or p_month not between 0 and 11 or jsonb_typeof(p_reports) is distinct from 'array' or jsonb_array_length(p_reports)>250 then raise exception 'Invalid reporting period or batch';end if;
if (select count(*) from jsonb_array_elements(p_reports))<>(select count(distinct x->>'pub_id') from jsonb_array_elements(p_reports) x) then raise exception 'Duplicate or missing publisher';end if;
for r in select value from jsonb_array_elements(p_reports) loop
 select * into p from public.publishers where id=r->>'pub_id' and cong_id=p_cong_id;
 if p.id is null or not public.ca_can_read_group(p_cong_id,p.service_group) then raise exception 'Publisher is outside your assigned group' using errcode='42501';end if;
 if coalesce((r->>'clear_auxiliary')::boolean,false) then
 select * into saved from public.reports where cong_id=p_cong_id and pub_id=p.id and service_year=p_year and month=p_month for update;
 if not found or (select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(saved)) where key=any(array['id','pub_id','cong_id','service_year','month','shared_in_ministry','studies','hours','comments','is_ap'])) is distinct from r->'expected_report' then raise exception 'This report changed. Reload before revoking AP.' using errcode='40001';end if;
 update public.reports set is_ap=false where id=saved.id returning * into saved;
 rows=rows||jsonb_build_array(to_jsonb(saved));continue;end if;
 s=coalesce((r->>'shared_in_ministry')::boolean,false);st=coalesce((r->>'studies')::integer,0);h=coalesce((r->>'hours')::numeric,0);
 if st not between 0 and 1000 or h not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Invalid report values';end if;
 insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap) values(gen_random_uuid()::text,p_cong_id,p.id,p_year,p_month,s,case when s then st else 0 end,case when s then h else 0 end,coalesce(r->>'comments',''),s and coalesce((r->>'is_ap')::boolean,false)) on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap returning * into saved;
 rows=rows||jsonb_build_array(to_jsonb(saved));end loop;return rows;end $function$
;

CREATE OR REPLACE FUNCTION ca_private.noticeboard_snapshot(p_cong_id text, p_snapshot jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
if coalesce((p_snapshot->'weekDetails'->target_week->'program'->>'auxiliary')::boolean,false)=false then
select coalesce(jsonb_object_agg(key,value),'{}') into data from jsonb_each(data) where key<>'AuxiliaryCounselor' and key !~ '(Aux|AuxAssistant|AssistantAux)$';end if;
assignments=assignments||jsonb_build_object(target_week,data);layouts=layouts||jsonb_build_object(target_week,coalesce(p_snapshot->'weekDetails'->target_week,'{}')||jsonb_build_object('additionalDuties',duties,'oclmPublished',coalesce(p_snapshot->'assignments','{}') ? target_week));end loop;
 select coalesce(jsonb_agg(person),'[]') into people from(select distinct on (p->>'id') p person from jsonb_array_elements(people) p where exists(select 1 from jsonb_each(assignments) w cross join lateral jsonb_each(w.value) a where (a.value->>'personId'=p->>'id' or a.value->>'assistantId'=p->>'id')) order by p->>'id') x;
 return coalesce(result,'{}')||jsonb_build_object('assignments',assignments,'people',people,'weekDetails',layouts,'publishedWeeks',(select coalesce(jsonb_agg(key order by key),'[]') from jsonb_object_keys(assignments) key),'defaultWeek',(select min(key) from jsonb_object_keys(assignments) key),'currentWeek',current_week);
end $function$
;

CREATE OR REPLACE FUNCTION public.save_congregation_reports(p_cong_id text, p_reports jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r jsonb; saved public.reports; rows jsonb='[]';
begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'Approved administrator or field service account required' using errcode='42501';end if;
 if jsonb_typeof(p_reports) is distinct from 'array' or jsonb_array_length(p_reports) not between 1 and 5000 then raise exception 'Choose between 1 and 5000 report rows';end if;
 if (select count(*) from jsonb_array_elements(p_reports))<>(select count(distinct (x->>'pub_id',x->>'service_year',x->>'month')) from jsonb_array_elements(p_reports) x) then raise exception 'The same publisher and month appear twice';end if;
 for r in select value from jsonb_array_elements(p_reports) loop
  if r->>'cong_id' is distinct from p_cong_id or not exists(select 1 from public.publishers p where p.cong_id=p_cong_id and p.id=r->>'pub_id') then raise exception 'Publisher is outside this congregation' using errcode='42501';end if;
  if r->>'service_year' is null or (r->>'service_year')::integer not between 1900 and 2200 or r->>'month' is null or (r->>'month')::integer not between 0 and 11 or coalesce((r->>'studies')::integer,0) not between 0 and 1000 or coalesce((r->>'hours')::numeric,0) not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Check the reporting month, studies, hours and remarks';end if;
  if coalesce((r->>'clear_auxiliary')::boolean,false) then
   select * into saved from public.reports where cong_id=p_cong_id and pub_id=r->>'pub_id' and service_year=(r->>'service_year')::integer and month=(r->>'month')::integer for update;
   if not found or (select jsonb_object_agg(key,value) from jsonb_each(to_jsonb(saved)) where key=any(array['id','pub_id','cong_id','service_year','month','shared_in_ministry','studies','hours','comments','is_ap'])) is distinct from r->'expected_report' then raise exception 'This report changed. Reload before revoking AP.' using errcode='40001';end if;
   update public.reports set is_ap=false where id=saved.id returning * into saved;
   rows=rows||jsonb_build_array(to_jsonb(saved));continue;
  end if;
  insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
  values(pg_catalog.gen_random_uuid()::text,p_cong_id,r->>'pub_id',(r->>'service_year')::integer,(r->>'month')::integer,coalesce((r->>'shared_in_ministry')::boolean,false),coalesce((r->>'studies')::integer,0),coalesce((r->>'hours')::numeric,0),coalesce(r->>'comments',''),coalesce((r->>'is_ap')::boolean,false))
  on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap
  returning * into saved;
  rows=rows||jsonb_build_array(to_jsonb(saved));
 end loop;return rows;
end $function$
;

CREATE OR REPLACE FUNCTION ca_private.safe_oclm_program(p_program jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$declare p jsonb;parts jsonb='[]';ids text[]='{}';begin
if jsonb_typeof(p_program) is distinct from 'object' or jsonb_typeof(p_program->'parts') is distinct from 'array' or jsonb_array_length(p_program->'parts')>36 then raise exception 'Invalid reviewed meeting program';end if;
for p in select value from jsonb_array_elements(p_program->'parts') loop
if coalesce(p->>'id','') !~ '^[A-Za-z][A-Za-z0-9_]{0,63}$' or p->>'id'=any(ids) or coalesce(p->>'type','')<>all(array['Chairman','Prayer','TreasuresTalk','SpiritualGems','BibleReading','Conversation','FollowingUp','Disciples','Beliefs','Assistant','ChristianParts','BibleStudy','BibleStudyReader']) or coalesce(p->>'section','')<>all(array['treasures','field','living']) or coalesce(p->>'minutes','') !~ '^[0-9]{1,2}$' or (p->>'minutes')::integer>60 then raise exception 'Check each part ID, type, section and duration';end if;
ids=array_append(ids,p->>'id');parts=parts||jsonb_build_array(jsonb_build_object('id',p->>'id','type',p->>'type','section',p->>'section','title',left(coalesce(p->>'title',''),300),'minutes',(p->>'minutes')::integer,'assistant',coalesce((p->>'assistant')::boolean,false)));
end loop;if p_program ? 'meetingDate' then perform (p_program->>'meetingDate')::date;end if;if p_program ? 'startTime' and p_program->>'startTime' !~ '^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid first-part time';end if;if p_program ? 'auxiliary' and jsonb_typeof(p_program->'auxiliary')<>'boolean' then raise exception 'Invalid auxiliary classroom setting';end if;return jsonb_build_object('auxiliary',coalesce((p_program->>'auxiliary')::boolean,false),'parts',parts,'reviewed',coalesce((p_program->>'reviewed')::boolean,false),'reading',left(coalesce(p_program->>'reading',''),150),'sourceMonth',left(coalesce(p_program->>'sourceMonth',''),7))||jsonb_strip_nulls(jsonb_build_object('meetingDate',p_program->>'meetingDate','startTime',p_program->>'startTime'));end $function$
;
