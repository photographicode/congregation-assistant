-- Explicit SFTS classification supplements existing special pioneer / missionary flags.
alter table public.publishers add column if not exists is_sfts boolean not null default false;
create or replace function public.ca_v3_save_person(p_cong_id text,p_person jsonb,p_shared boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform ca_private.v2_require(p_cong_id,array['admin']);
 if p_person ? 'isSFTS' and jsonb_typeof(p_person->'isSFTS') is distinct from 'boolean' then raise exception 'SFTS must be true or false' using errcode='22023';end if;
 result=public.ca_v2_save_person(p_cong_id,p_person-'isSFTS',p_shared);
 if p_person ? 'isSFTS' then update public.publishers set is_sfts=(p_person->>'isSFTS')::boolean where cong_id=p_cong_id and id=result->>'id';end if;
 return result;
end $$;
revoke all on function public.ca_v3_save_person(text,jsonb,boolean) from public,anon;
grant execute on function public.ca_v3_save_person(text,jsonb,boolean) to authenticated;
-- Keep full workspace restore round trips lossless for the added publisher field.
do $$declare f record;definition text;begin
 for f in select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='restore_congregation_workspace' loop
  definition=pg_get_functiondef(f.oid);
  if position('is_sfts=excluded.is_sfts' in definition)=0 and position('is_fm=excluded.is_fm' in definition)>0 then execute replace(definition,'is_fm=excluded.is_fm','is_fm=excluded.is_fm,is_sfts=excluded.is_sfts');end if;
 end loop;
end $$;
