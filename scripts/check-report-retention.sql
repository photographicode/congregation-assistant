\set ON_ERROR_STOP on
\i supabase/report-retention.sql
begin;
reset role;
create table if not exists ca_private.release_recovery_snapshots(release_id text primary key,created_at timestamptz default now(),source_commit text,tables jsonb,functions jsonb,policies jsonb);
select test.assert(ca_private.service_year_at('2026-08-31 18:29:00+00','Asia/Kolkata')=2026,'India August boundary retains ending year 2026');
select test.assert(ca_private.service_year_at('2026-08-31 18:30:00+00','Asia/Kolkata')=2027,'India September boundary advances to 2027');
select test.assert(ca_private.service_year_at('2026-09-01 00:10:00+00','America/New_York')=2026,'US service year does not advance early');
select test.assert(not has_function_privilege('authenticated','ca_private.purge_expired_service_reports(timestamptz)','execute'),'client cannot trigger permanent cleanup or choose a cutoff');
do $$declare current_year integer=ca_private.report_year_current('a');begin
 begin insert into public.reports(id,cong_id,pub_id,service_year,month) values('retention-too-old','a','pub-a',current_year-2,7);raise exception 'Old report accepted';exception when check_violation then null;end;
 begin insert into public.reports(id,cong_id,pub_id,service_year,month) values('retention-future','a','pub-a',current_year+1,8);raise exception 'Future year accepted';exception when check_violation then null;end;
end$$;
-- Synthetic historical rows represent data predating installation, not an authorized user bypass.
alter table public.reports disable trigger ca_report_service_year_limit;
insert into public.reports(id,cong_id,pub_id,service_year,month) values('retention-old','a','pub-a',2025,7) on conflict(pub_id,service_year,month) do update set hours=1;
insert into ca_private.release_recovery_snapshots(release_id,source_commit,tables,functions,policies) values('retention-fictional-test','fictional','{"public.reports":[{"cong_id":"a","service_year":2025},{"cong_id":"a","service_year":2026},{"cong_id":"a","service_year":2027}]}','{}','[]');
alter table public.reports enable trigger ca_report_service_year_limit;
select ca_private.purge_expired_service_reports('2026-09-01 12:00:00+00');
select test.assert(not exists(select 1 from public.reports where id='retention-old'),'only expired complete service year removed');
select test.assert(exists(select 1 from public.reports where cong_id='a' and service_year=2026),'entire previous service year survives cleanup for S-21');
select test.assert((select jsonb_array_length(tables->'public.reports')=2 from ca_private.release_recovery_snapshots where release_id='retention-fictional-test'),'managed rollback copies remove the expired year too');
select test.assert(ca_private.purge_expired_service_reports('2026-09-02 12:00:00+00')->>'reportsRemoved'='0','daily catch-up does not delete rolling months');
rollback;
