-- Home links expose only a caller's authorized group links and reporting counts.
alter table public.reports add column if not exists submitted_at timestamptz;
create or replace function ca_private.stamp_report_submission() returns trigger language plpgsql set search_path='' as $$begin new.submitted_at=clock_timestamp();return new;end $$;
revoke all on function ca_private.stamp_report_submission() from public,anon,authenticated;
create trigger ca_stamp_report_submission before insert or update on public.reports for each row execute function ca_private.stamp_report_submission();
create function public.ca_v3_home_group_links(p_cong_id text,p_year integer,p_month integer) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or not public.ca_has_role(p_cong_id,array['field_service','group_overseer']) then raise exception 'Report access required' using errcode='42501';end if;
 if p_year not between 1900 and 2200 or p_month not between 0 and 11 then raise exception 'Invalid reporting period';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'token',l.token,'total',coalesce(s.total,0),'submitted',coalesce(s.submitted,0),'lastSubmission',s.latest) order by g.name),'[]') from public.service_groups g
 left join lateral(select token from public.ca_public_links where cong_id=g.cong_id and kind='report' and service_group=g.name and pub_id is null and active and expires_at>now() order by created_at desc limit 1) l on true
 left join lateral(select count(p.id) as total,count(r.id) as submitted,max(r.submitted_at) as latest from public.publishers p left join public.reports r on r.cong_id=p.cong_id and r.pub_id=p.id and r.service_year=p_year and r.month=p_month where p.cong_id=g.cong_id and p.service_group=g.name and p.transferred_at is null) s on true
 where g.cong_id=p_cong_id and g.archived_at is null and(public.ca_has_role(p_cong_id,array['field_service']) or public.ca_can_read_group(p_cong_id,g.name)));
end $$;
revoke all on function public.ca_v3_home_group_links(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ca_v3_home_group_links(text,integer,integer) to authenticated;
