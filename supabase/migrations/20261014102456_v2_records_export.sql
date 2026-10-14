create or replace function public.ca_v2_export_records(p_cong_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare payload jsonb;begin
 perform ca_private.v2_require(p_cong_id,array['admin']);
 payload=public.export_congregation_workspace(p_cong_id)->'data';
 payload=payload||jsonb_build_object('format','ca-records-export-v2',
 'settings',(select settings from public.congregations where id=p_cong_id),
 'serviceGroups',(select coalesce(jsonb_agg(to_jsonb(g) order by id),'[]') from public.service_groups g where cong_id=p_cong_id),
 'weekendWeeks',(select coalesce(jsonb_agg(to_jsonb(w)-'updated_by' order by week),'[]') from ca_private.weekend_weeks w where cong_id=p_cong_id),
 'weekendPublications',(select coalesce(jsonb_agg(to_jsonb(p)-'token_hash' order by week),'[]') from ca_private.weekend_publications p where cong_id=p_cong_id),
 'weekendHistory',(select coalesce(jsonb_agg(to_jsonb(h)-'actor' order by week,revision),'[]') from ca_private.weekend_history h where cong_id=p_cong_id),
 'setup',(select to_jsonb(s) from ca_private.v2_setup s where cong_id=p_cong_id),
 'importHistory',(select coalesce(jsonb_agg(to_jsonb(b)-'actor' order by created_at),'[]') from ca_private.v2_import_batches b where cong_id=p_cong_id));
 return payload;
end $$;
revoke all on function public.ca_v2_export_records(text) from public,anon,authenticated;
grant execute on function public.ca_v2_export_records(text) to authenticated;
