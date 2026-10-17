-- Approved membership identity is distinct from whether paid/trial tools are open.
create or replace function ca_private.v2_admin_identity(p_cong_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.ca_google_identity() and exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.active and a.role='admin' and a.email=lower(auth.jwt()->>'email'));
$$;
revoke all on function ca_private.v2_admin_identity(text) from public,anon,authenticated;
create or replace function public.ca_v2_workspace_plan(p_cong_id text) returns jsonb
language plpgsql stable security definer set search_path='' as $$declare c public.congregations;ending timestamptz;locked boolean;begin
 if auth.uid() is null or not public.ca_google_identity() or not exists(select 1 from public.congregation_access a where a.cong_id=p_cong_id and a.active and a.email=lower(auth.jwt()->>'email')) then raise exception 'Approved congregation account required' using errcode='42501';end if;
 select * into strict c from public.congregations where id=p_cong_id;ending=c.created_at+c.trial_days*interval '1 day';locked=not(c.status='active' or(c.status='trial' and ending>now()));
 return jsonb_build_object('congregation',p_cong_id,'name',c.name,'status',case when locked then 'expired' else c.status end,'trialEndsAt',ending,'paymentDate',c.payment_date,'locked',locked,'serverTime',now());
end $$;
revoke all on function public.ca_v2_workspace_plan(text) from public,anon,authenticated;
grant execute on function public.ca_v2_workspace_plan(text) to authenticated;
-- Read-only records remain exportable by their actual Main Admin after expiry.
-- Clone the audited recovery export, retaining current schema/retention additions.
do $$declare definition text;begin
 definition=pg_get_functiondef('public.export_congregation_workspace(text)'::regprocedure);
 definition=replace(definition,'public.export_congregation_workspace','ca_private.v2_export_recovery_records');
 definition=replace(definition,'public.ca_is_congregation_admin(p_cong_id)','ca_private.v2_admin_identity(p_cong_id)');
 if definition not like '%v2_admin_identity(p_cong_id)%' then raise exception 'Export guard changed; review its identity boundary';end if;
 execute definition;
end $$;
revoke all on function ca_private.v2_export_recovery_records(text) from public,anon,authenticated;
do $$declare definition text;begin
 definition=pg_get_functiondef('public.ca_v2_export_records(text)'::regprocedure);
 definition=replace(definition,'perform ca_private.v2_require(p_cong_id,array[''admin'']);','if not ca_private.v2_admin_identity(p_cong_id) then raise exception ''Main administrator access required'' using errcode=''42501'';end if;');
 definition=replace(definition,'public.export_congregation_workspace(p_cong_id)','ca_private.v2_export_recovery_records(p_cong_id)');
 if definition not like '%v2_admin_identity(p_cong_id)%' then raise exception 'Records export guard changed; review before continuing';end if;
 execute definition;
end $$;
