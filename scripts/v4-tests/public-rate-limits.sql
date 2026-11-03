-- Acceptance for supabase/migrations/20261103090000_public_rate_limits.sql (run after it is applied).
select test.assert(to_regprocedure('ca_private.submit_public_report_unlimited(text,jsonb)') is not null,'report submission original moved to ca_private');
select test.assert(not has_function_privilege('anon','ca_private.submit_public_report_unlimited(text,jsonb)','execute'),'anonymous callers cannot reach the unlimited original');
select test.assert(has_function_privilege('anon','public.submit_public_report(text,jsonb)','execute') and has_function_privilege('anon','public.get_oclm_public_snapshot(text)','execute'),'anonymous callers keep the public wrappers');
select test.assert((select bool_and(p.prosecdef and p.proconfig::text like '%search_path=%') from pg_proc p where p.oid in ('public.submit_public_report(text,jsonb)'::regprocedure,'public.get_public_link_context(text)'::regprocedure,'public.get_oclm_public_snapshot(text)'::regprocedure)),'wrappers are security definer with a fixed search_path');
select test.assert(not has_table_privilege('anon','ca_private.rate_limits','select') and not has_table_privilege('authenticated','ca_private.rate_limits','insert'),'clients cannot read or write rate-limit counters');
select test.assert(ca_private.public_report_month_allowed(jsonb_build_object('service_year',extract(year from now())::int+case when extract(month from now())>=9 then 1 else 0 end,'month',extract(month from now())::int-1)),'current month is allowed through a shared link');
select test.assert(not ca_private.public_report_month_allowed('{"service_year":1990,"month":1}'),'old months are refused through a shared link');
select test.assert(not ca_private.public_report_month_allowed('{"service_year":"x","month":1}'),'malformed months are refused');
do $t$
declare calls integer=0;denied boolean=false;
begin
 -- A FOR loop variable is local to the loop, so count calls separately.
 for i in 1..200 loop
  calls=i;
  begin perform public.get_oclm_public_snapshot('00000000-0000-0000-0000-000000000000');
  exception when sqlstate 'PT429' then denied=true;exit; end;
 end loop;
 perform test.assert(denied and calls<=121,'repeated anonymous snapshot calls are limited per address');
end $t$;
select test.assert(not exists(select 1 from ca_private.rate_limits where bucket like '%00000000-0000%'),'link tokens are stored only as hashes');
delete from ca_private.rate_limits;
\echo PASS public link rate limits and recent-month report window
