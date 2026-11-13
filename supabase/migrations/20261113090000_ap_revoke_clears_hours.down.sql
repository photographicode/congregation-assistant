-- Restores the 2026-10-18 revoke/undo (AP flag only; hours untouched) and drops the stored hours.
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
alter table ca_ap_private.actions drop column if exists prev_hours;
