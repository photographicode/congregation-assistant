-- Limited roster API avoids granting OCLM access to private publisher/contact records.
create or replace function public.get_oclm_roster(p_cong_id text) returns jsonb language plpgsql stable security definer set search_path='' as $$begin if not public.ca_has_role(p_cong_id,array['oclm']) then raise exception 'OCLM access required' using errcode='42501';end if;return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'gender',gender,'isElder',is_elder,'isMS',is_ms) order by name),'[]') from public.publishers where cong_id=p_cong_id);end $$;
create or replace function public.save_group_reports(p_cong_id text,p_year integer,p_month integer,p_reports jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;p public.publishers;s boolean;st integer;h numeric;rows jsonb='[]';saved public.reports;
begin if not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['group_overseer']) then raise exception 'Approved group account required' using errcode='42501';end if;
if p_year is null or p_year not between 1900 and 2200 or p_month is null or p_month not between 0 and 11 or jsonb_typeof(p_reports) is distinct from 'array' or jsonb_array_length(p_reports)>250 then raise exception 'Invalid reporting period or batch';end if;
if (select count(*) from jsonb_array_elements(p_reports))<>(select count(distinct x->>'pub_id') from jsonb_array_elements(p_reports) x) then raise exception 'Duplicate or missing publisher';end if;
for r in select value from jsonb_array_elements(p_reports) loop
 select * into p from public.publishers where id=r->>'pub_id' and cong_id=p_cong_id;
 if p.id is null or not public.ca_can_read_group(p_cong_id,p.service_group) then raise exception 'Publisher is outside your assigned group' using errcode='42501';end if;
 s=coalesce((r->>'shared_in_ministry')::boolean,false);st=coalesce((r->>'studies')::integer,0);h=coalesce((r->>'hours')::numeric,0);
 if st not between 0 and 1000 or h not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Invalid report values';end if;
 insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap) values(gen_random_uuid()::text,p_cong_id,p.id,p_year,p_month,s,case when s then st else 0 end,case when s then h else 0 end,coalesce(r->>'comments',''),s and coalesce((r->>'is_ap')::boolean,false)) on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap returning * into saved;
 rows=rows||jsonb_build_array(to_jsonb(saved));end loop;return rows;end $$;
revoke all on function public.get_oclm_roster(text),public.save_group_reports(text,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.get_oclm_roster(text),public.save_group_reports(text,integer,integer,jsonb) to authenticated;
