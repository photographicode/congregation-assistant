-- AP actions are append-only and inaccessible through direct client table access.
create schema if not exists ca_ap_private;
revoke all on schema ca_ap_private from public,anon;
grant usage on schema ca_ap_private to authenticated;
create table if not exists ca_ap_private.actions (
 id uuid primary key default gen_random_uuid(),
 cong_id text not null references public.congregations(id) on delete cascade,
 report_id text references public.reports(id) on delete set null,
 actor uuid references auth.users(id) on delete set null,
 action text not null check(action in ('revoke','undo')),
 occurred_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz,
 report_version text,
 undo_of uuid unique references ca_ap_private.actions(id),
 service_year integer not null, month integer not null
);
alter table ca_ap_private.actions enable row level security;
revoke all on ca_ap_private.actions from public,anon,authenticated;
create index if not exists ap_actions_cong_period on ca_ap_private.actions(cong_id,service_year,month,occurred_at desc);
create index if not exists ap_actions_report on ca_ap_private.actions(report_id);
create index if not exists ap_actions_actor on ca_ap_private.actions(actor);
create or replace function ca_ap_private.revoke_ap(p_cong_id text,p_expected jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.reports; expected jsonb; version text; event ca_ap_private.actions;
begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'Approved administrator or field service account required' using errcode='42501';end if;
 select * into r from public.reports where id=p_expected->>'id' and cong_id=p_cong_id for update;
 if not found then raise exception 'Report changed. Reload before revoking AP.' using errcode='40001';end if;
 select jsonb_object_agg(key,value) into expected from jsonb_each(to_jsonb(r)) where key=any(array['id','pub_id','cong_id','service_year','month','shared_in_ministry','studies','hours','comments','is_ap']);
 if expected is distinct from p_expected or r.is_ap is distinct from true then raise exception 'Report changed. Reload before revoking AP.' using errcode='40001';end if;
 update public.reports set is_ap=false where id=r.id returning * into r;
 select xmin::text||':'||md5(to_jsonb(current_report)::text) into version from public.reports current_report where id=r.id;
 insert into ca_ap_private.actions(cong_id,report_id,actor,action,expires_at,report_version,service_year,month)
 values(p_cong_id,r.id,auth.uid(),'revoke',clock_timestamp()+interval '10 seconds',version,r.service_year,r.month) returning * into event;
 return jsonb_build_object('report',to_jsonb(r),'actionId',event.id,'expiresAt',event.expires_at,'serverTime',clock_timestamp());
end $$;
create or replace function ca_ap_private.undo_ap(p_cong_id text,p_action_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare event ca_ap_private.actions; r public.reports; version text;
begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'Approved administrator or field service account required' using errcode='42501';end if;
 select * into event from ca_ap_private.actions where id=p_action_id and cong_id=p_cong_id and action='revoke' and actor=auth.uid() for update;
 if not found then raise exception 'This AP action is unavailable' using errcode='42501';end if;
 select * into r from public.reports where id=event.report_id and cong_id=p_cong_id for update;
 if not found then raise exception 'Report changed. Reload before editing AP status.' using errcode='40001';end if;
 select xmin::text||':'||md5(to_jsonb(current_report)::text) into version from public.reports current_report where id=r.id;
 if r.is_ap is distinct from false or version is distinct from event.report_version or exists(select 1 from ca_ap_private.actions where undo_of=event.id) then raise exception 'Report changed. Reload before editing AP status.' using errcode='40001';end if;
 if clock_timestamp()>event.expires_at then raise exception 'Undo expired. Review the report before changing AP status.' using errcode='40001';end if;
 if not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'AP review access required' using errcode='42501';end if;
 update public.reports set is_ap=true where id=r.id returning * into r;
 insert into ca_ap_private.actions(cong_id,report_id,actor,action,undo_of,service_year,month) values(p_cong_id,r.id,auth.uid(),'undo',event.id,r.service_year,r.month);
 return to_jsonb(r);
end $$;
revoke all on function ca_ap_private.revoke_ap(text,jsonb),ca_ap_private.undo_ap(text,uuid) from public,anon,authenticated;
grant execute on function ca_ap_private.revoke_ap(text,jsonb),ca_ap_private.undo_ap(text,uuid) to authenticated;
create or replace function public.ca_revoke_ap(p_cong_id text,p_expected jsonb) returns jsonb language sql security invoker set search_path='' as $$select ca_ap_private.revoke_ap(p_cong_id,p_expected)$$;
create or replace function public.ca_undo_ap(p_cong_id text,p_action_id uuid) returns jsonb language sql security invoker set search_path='' as $$select ca_ap_private.undo_ap(p_cong_id,p_action_id)$$;
revoke all on function public.ca_revoke_ap(text,jsonb),public.ca_undo_ap(text,uuid) from public,anon,authenticated;
grant execute on function public.ca_revoke_ap(text,jsonb),public.ca_undo_ap(text,uuid) to authenticated;

-- Canonical AP revocation preserves report contents and rejects stale reviewed rows.
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
   saved=jsonb_populate_record(null::public.reports,ca_ap_private.revoke_ap(p_cong_id,r->'expected_report')->'report');
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
revoke all on function public.save_congregation_reports(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_congregation_reports(text,jsonb) to authenticated;

-- Limited roster API avoids granting OCLM access to private publisher/contact records.
create or replace function public.get_oclm_roster(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'OCLM access required' using errcode='42501';end if;return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'gender',gender,'isElder',is_elder,'isMS',is_ms) order by name),'[]') from public.publishers where cong_id=p_cong_id);end $$;
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
 raise exception 'AP review requires an administrator or field service account' using errcode='42501';end if;
 s=coalesce((r->>'shared_in_ministry')::boolean,false);st=coalesce((r->>'studies')::integer,0);h=coalesce((r->>'hours')::numeric,0);
 if st not between 0 and 1000 or h not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Invalid report values';end if;
 insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap) values(gen_random_uuid()::text,p_cong_id,p.id,p_year,p_month,s,case when s then st else 0 end,case when s then h else 0 end,coalesce(r->>'comments',''),s and coalesce((r->>'is_ap')::boolean,false)) on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap returning * into saved;
 rows=rows||jsonb_build_array(to_jsonb(saved));end loop;return rows;end $function$
;
revoke all on function public.get_oclm_roster(text),public.save_group_reports(text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.get_oclm_roster(text),public.save_group_reports(text,integer,integer,jsonb) to authenticated;
