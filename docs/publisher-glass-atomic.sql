-- Atomic administrator reminder release. Private rollback snapshot; no existing record or policy changes.
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
select 'publisher_glass_20261009','RELEASE_SOURCE_COMMIT',
(select jsonb_object_agg(table_name,fingerprint) from ca_followup_preservation),
(select coalesce(jsonb_object_agg(p.oid::regprocedure::text,pg_get_functiondef(p.oid)),'{}'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in('send_congregation_reminder','export_congregation_workspace','get_report_retention_policy')) ),
(select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in('public','ca_private'));
-- Explicitly approved publisher accounts only; no new direct table access.
create or replace function public.send_congregation_reminder(p_cong_id text,p_publisher_id text,p_request_id text,p_title text,p_date text,p_time text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare recipient record;existing jsonb;reminder jsonb;prior jsonb;version bigint;counted integer=0;begin
 if auth.uid() is null or not public.ca_is_congregation_admin(p_cong_id) or not public.ca_google_identity() or not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and lower(u.email)=lower(auth.jwt()->>'email')) then raise exception 'Main administrator Google sign-in required.' using errcode='42501';end if;
 if coalesce(p_request_id,'') !~ '^[A-Za-z0-9_-]{1,64}$' or length(trim(coalesce(p_title,''))) not between 1 and 75 or coalesce(p_date,'') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_time,'') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Choose a short reminder title, date and time.';end if;
 perform p_date::date;
 reminder=jsonb_build_object('id','admin_'||p_request_id,'title','Congregation reminder: '||trim(p_title),'date',p_date,'time',p_time);
 for recipient in select p.id from public.publishers p where p.cong_id=p_cong_id and p.transferred_at is null and (p_publisher_id is null or p.id=p_publisher_id) and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.publisher_id=p.id and a.role='publisher' and a.active) order by p.id for share of p loop
  perform pg_advisory_xact_lock(hashtextextended('publisher-preferences:'||p_cong_id||':'||recipient.id,0));
  select pref.reminders,pref.revision into existing,version from ca_private.publisher_preferences pref where pref.cong_id=p_cong_id and pref.publisher_id=recipient.id;
  existing=coalesce(existing,'[]');
  select value into prior from jsonb_array_elements(existing) where value->>'id'=reminder->>'id';
  if prior is not null then if prior<>reminder then raise exception 'This reminder request already has different details. Start a new reminder.';end if;
  else
   if jsonb_array_length(existing)>=12 then raise exception 'A selected publisher already has 12 reminders. Ask them to remove an old reminder, then try again. No reminders were added.';end if;
   insert into ca_private.publisher_preferences(cong_id,publisher_id,revision,reminders) values(p_cong_id,recipient.id,coalesce(version,0)+1,existing||jsonb_build_array(reminder)) on conflict(cong_id,publisher_id) do update set revision=excluded.revision,reminders=excluded.reminders,updated_at=clock_timestamp();
  end if;
  counted=counted+1;
 end loop;
 if counted=0 then raise exception 'No approved publisher account is available. Approve publisher login first.';end if;
 return jsonb_build_object('recipients',counted);
end $$;
revoke all on function public.send_congregation_reminder(text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.send_congregation_reminder(text,text,text,text,text,text) to authenticated;

-- Keep the current and previous COMPLETE service year. No rolling-month deletion.
-- Private helpers are not exposed to publisher/admin clients.
create or replace function ca_private.service_year_at(p_time timestamptz,p_timezone text) returns integer
language sql stable set search_path='' as $$select extract(year from p_time at time zone coalesce(p_timezone,'Asia/Kolkata'))::integer+case when extract(month from p_time at time zone coalesce(p_timezone,'Asia/Kolkata'))>=9 then 1 else 0 end$$;
create or replace function ca_private.report_year_current(p_cong text,p_time timestamptz default now()) returns integer
language sql stable security definer set search_path='' as $$select ca_private.service_year_at(p_time,coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong),'Asia/Kolkata'))$$;
create or replace function ca_private.enforce_report_service_year() returns trigger
language plpgsql security definer set search_path='' as $$declare current_year integer;begin
 current_year=ca_private.report_year_current(new.cong_id);
 if new.service_year not between current_year-1 and current_year then raise exception 'Only the current and previous complete service year can be saved. Remove older or future-year rows from this import or restore file.' using errcode='23514';end if;
 return new;
end$$;
drop trigger if exists ca_report_service_year_limit on public.reports;
create trigger ca_report_service_year_limit before insert or update on public.reports for each row execute function ca_private.enforce_report_service_year();
create or replace function ca_private.purge_expired_service_reports(p_time timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$declare deleted integer;removed integer=0;record record;clean jsonb;begin
 perform pg_advisory_xact_lock(hashtextextended('ca-service-year-retention',0));
 delete from public.reports r where r.service_year<ca_private.report_year_current(r.cong_id,p_time)-1;
 get diagnostics deleted=row_count;
 if to_regclass('ca_private.release_recovery_snapshots') is not null then
 for record in select release_id,tables->'public.reports' rows from ca_private.release_recovery_snapshots where jsonb_typeof(tables->'public.reports')='array' for update loop
  select coalesce(jsonb_agg(value order by ordinal),'[]') into clean from jsonb_array_elements(record.rows) with ordinality entries(value,ordinal) where (value->>'service_year')::integer>=ca_private.report_year_current(value->>'cong_id',p_time)-1;
  removed=removed+jsonb_array_length(record.rows)-jsonb_array_length(clean);
  if clean is distinct from record.rows then update ca_private.release_recovery_snapshots set tables=jsonb_set(tables,'{public.reports}',clean) where release_id=record.release_id;end if;
 end loop;
 end if;
 return jsonb_build_object('reportsRemoved',deleted,'rollbackCopyRowsRemoved',removed);
end$$;
revoke all on function ca_private.service_year_at(timestamptz,text),ca_private.report_year_current(text,timestamptz),ca_private.enforce_report_service_year(),ca_private.purge_expired_service_reports(timestamptz) from public,anon,authenticated;
create or replace function public.get_report_retention_policy(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$declare zone text;year integer;begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['field_service','group_overseer','publisher','oclm','attendance','av','attendant','cleaning']) then raise exception 'Approved congregation access required.' using errcode='42501';end if;
 zone=coalesce((select timezone from public.ca_meeting_settings where cong_id=p_cong_id),'Asia/Kolkata');year=ca_private.service_year_at(now(),zone);
 return jsonb_build_object('timezone',zone,'currentYear',year,'previousYear',year-1,'serverTime',now());
end$$;
revoke all on function public.get_report_retention_policy(text) from public,anon,authenticated;
grant execute on function public.get_report_retention_policy(text) to authenticated;
-- Exports also exclude expired years during the short interval before daily cleanup.
do $$declare definition text;patched text;begin
 definition=pg_get_functiondef('public.export_congregation_workspace(text)'::regprocedure);
 patched=replace(definition,'from public.reports r where cong_id=p_cong_id)', 'from public.reports r where cong_id=p_cong_id and r.service_year between ca_private.report_year_current(p_cong_id)-1 and ca_private.report_year_current(p_cong_id))');
 if patched=definition and definition not like '%r.service_year between ca_private.report_year_current%' then raise exception 'Export definition changed. Review the retention integration before deploying.';end if;
 if patched<>definition then execute patched;end if;
end$$;

do $$declare t record;after_hash text;old_policies jsonb;begin
 for t in select * from ca_followup_preservation loop
 execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,''[]'')) from %I.%I r',split_part(t.table_name,'.',1),split_part(t.table_name,'.',2)) into after_hash;
 if after_hash is distinct from t.fingerprint then raise exception 'Preservation check failed: %',t.table_name;end if;
 end loop;
 select policies into old_policies from ca_private.release_recovery_snapshots where release_id='publisher_glass_20261009';
 if old_policies is distinct from (select coalesce(jsonb_agg(to_jsonb(p) order by schemaname,tablename,policyname),'[]') from pg_policies p where schemaname in('public','ca_private')) then raise exception 'Policies unexpectedly changed';end if;
end$$;
commit;
