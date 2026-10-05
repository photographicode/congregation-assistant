-- Publish only safe Additional Duties definitions alongside assigned names.
-- Preserve valid ISO week keys when sanitizing public schedules.
create or replace function public.upsert_oclm_public_snapshot(p_cong_id text,p_snapshot jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
 declare outrow public.ca_oclm_publications; clean jsonb; weeks jsonb; assignments jsonb; people jsonb; duties jsonb;
 begin
 if not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'Approved scheduler account required' using errcode='42501';end if;
 if pg_column_size(p_snapshot)>1048576 then raise exception 'Schedule is too large';end if;
 if p_snapshot->>'kind'='midweek' then
  if p_snapshot->>'v'<>'2' or jsonb_typeof(p_snapshot->'publishedWeeks')<>'array' or jsonb_typeof(p_snapshot->'assignments')<>'object' or jsonb_typeof(p_snapshot->'people')<>'array' then raise exception 'Invalid schedule';end if;
  select coalesce(jsonb_agg(w),'[]') into weeks from jsonb_array_elements_text(p_snapshot->'publishedWeeks') as entries(w) where w ~ '^[0-9]{4}-W[0-9]{2}$';
  select coalesce(jsonb_object_agg(k,v),'{}') into assignments from (
   select week.key k,(select coalesce(jsonb_object_agg(part.key,jsonb_build_object('personId',part.value->>'personId','customTitle',left(part.value->>'customTitle',300))),'{}') from jsonb_each(week.value) part) v
   from jsonb_each(p_snapshot->'assignments') week where weeks ? week.key and jsonb_typeof(week.value)='object') x;
  select coalesce(jsonb_agg(jsonb_build_object('id',p->>'id','name',left(p->>'name',150))),'[]') into people
   from jsonb_array_elements(p_snapshot->'people') p where exists(select 1 from jsonb_each(assignments) w,jsonb_each(w.value) a where a.value->>'personId'=p->>'id');
  if p_snapshot ? 'additionalDuties' and jsonb_typeof(p_snapshot->'additionalDuties')<>'array' then raise exception 'Invalid additional duties';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',d->>'id','name',left(trim(d->>'name'),100),'slots',(d->>'slots')::integer)),'[]') into duties from (
   select distinct on (d->>'id') d from jsonb_array_elements(coalesce(p_snapshot->'additionalDuties','[]')) d
    where d->>'id' ~ '^Duty_[a-f0-9]{32}$' and length(trim(d->>'name')) between 1 and 100 and d->>'slots' ~ '^[1-4]$' order by d->>'id' limit 20) checked;
  clean=jsonb_build_object('v',2,'kind','midweek','additionalDuties',duties,'congregation',(select name from public.congregations where id=p_cong_id),'defaultWeek',p_snapshot->>'defaultWeek','publishedWeeks',weeks,'assignments',assignments,'people',people,'generatedAt',p_snapshot->'generatedAt');
 else raise exception 'Use the current midweek scheduler to publish';
 end if;
 insert into public.ca_oclm_publications(cong_id,snapshot) values(p_cong_id,clean)
 on conflict(cong_id) do update set snapshot=excluded.snapshot,updated_at=now() returning * into outrow;
 return jsonb_build_object('token',outrow.token,'updated_at',outrow.updated_at);
 end $$;

revoke all on function public.upsert_oclm_public_snapshot(text,jsonb) from public,anon;
grant execute on function public.upsert_oclm_public_snapshot(text,jsonb) to authenticated;
