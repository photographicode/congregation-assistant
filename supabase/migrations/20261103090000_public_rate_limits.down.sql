-- Restores the unwrapped public link functions and removes the rate-limit helpers.
do $$
declare spec record;types text;
begin
 for spec in select * from (values
  ('get_public_link_context','text'),
  ('submit_public_report','text,jsonb'),
  ('get_attendance_meeting','text'),
  ('submit_current_attendance','text,date,integer'),
  ('get_oclm_public_snapshot','text'),
  ('get_oclm_public_revision','text'),
  ('ca_v2_exchange_weekend','text')
 ) as s(name,types)
 loop
  continue when to_regprocedure(format('ca_private.%I(%s)',spec.name||'_unlimited',spec.types)) is null;
  execute format('drop function if exists public.%I(%s)',spec.name,spec.types);
  execute format('alter function ca_private.%I(%s) rename to %I',spec.name||'_unlimited',spec.types,spec.name);
  execute format('alter function ca_private.%I(%s) set schema public',spec.name,spec.types);
  execute format('grant execute on function public.%I(%s) to anon,authenticated',spec.name,spec.types);
 end loop;
end $$;
drop function if exists ca_private.public_report_month_allowed(jsonb);
drop function if exists ca_private.rate_guard(text,text,integer,integer,integer);
drop function if exists ca_private.rate_hit(text,text,integer);
drop function if exists ca_private.client_ip();
drop table if exists ca_private.rate_limits;
