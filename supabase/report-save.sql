-- Match the existing publisher/month key; never replace an existing report ID.
create or replace function public.save_congregation_reports(p_cong_id text,p_reports jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r jsonb; saved public.reports; rows jsonb='[]';
begin
 if auth.uid() is null or not public.ca_google_identity() or not public.ca_has_role(p_cong_id,array['admin','field_service']) then raise exception 'Approved administrator or field service account required' using errcode='42501';end if;
 if jsonb_typeof(p_reports) is distinct from 'array' or jsonb_array_length(p_reports) not between 1 and 5000 then raise exception 'Choose between 1 and 5000 report rows';end if;
 if (select count(*) from jsonb_array_elements(p_reports))<>(select count(distinct (x->>'pub_id',x->>'service_year',x->>'month')) from jsonb_array_elements(p_reports) x) then raise exception 'The same publisher and month appear twice';end if;
 for r in select value from jsonb_array_elements(p_reports) loop
  if r->>'cong_id' is distinct from p_cong_id or not exists(select 1 from public.publishers p where p.cong_id=p_cong_id and p.id=r->>'pub_id') then raise exception 'Publisher is outside this congregation' using errcode='42501';end if;
  if r->>'service_year' is null or (r->>'service_year')::integer not between 1900 and 2200 or r->>'month' is null or (r->>'month')::integer not between 0 and 11 or coalesce((r->>'studies')::integer,0) not between 0 and 1000 or coalesce((r->>'hours')::numeric,0) not between 0 and 744 or length(coalesce(r->>'comments',''))>4000 then raise exception 'Check the reporting month, studies, hours and remarks';end if;
  if coalesce((r->>'clear_auxiliary')::boolean,false) then
   -- Clear only AP fields, preserving a publisher's newer ministry/study correction.
   update public.reports set is_ap=false,hours=0,comments='' where cong_id=p_cong_id and pub_id=r->>'pub_id' and service_year=(r->>'service_year')::integer and month=(r->>'month')::integer returning * into saved;
   if not found then raise exception 'This report changed. Refresh the reports before clearing auxiliary pioneer details.' using errcode='40001';end if;
   rows=rows||jsonb_build_array(to_jsonb(saved));continue;
  end if;
  insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
  values(pg_catalog.gen_random_uuid()::text,p_cong_id,r->>'pub_id',(r->>'service_year')::integer,(r->>'month')::integer,coalesce((r->>'shared_in_ministry')::boolean,false),coalesce((r->>'studies')::integer,0),coalesce((r->>'hours')::numeric,0),coalesce(r->>'comments',''),coalesce((r->>'is_ap')::boolean,false))
  on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap
  returning * into saved;
  rows=rows||jsonb_build_array(to_jsonb(saved));
 end loop;return rows;
end $$;
revoke all on function public.save_congregation_reports(text,jsonb) from public,anon,authenticated;
grant execute on function public.save_congregation_reports(text,jsonb) to authenticated;
