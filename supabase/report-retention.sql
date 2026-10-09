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
