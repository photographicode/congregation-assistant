-- Receives only reviewed structured values, never the local command text.
create or replace function public.ca_v3_save_assistant_report(p_cong_id text,p_publisher_id text,p_year integer,p_month integer,p_hours numeric,p_studies integer,p_expected jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.reports;saved public.reports;current_record jsonb;pub public.publishers;begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501';end if;
 select * into pub from public.publishers where cong_id=p_cong_id and id=p_publisher_id and transferred_at is null;
 if pub.id is null or not(public.ca_has_role(p_cong_id,array['field_service']) or public.ca_can_read_group(p_cong_id,pub.service_group)) then raise exception 'Publisher outside your report scope' using errcode='42501';end if;
 if p_year is null or p_year not between 1900 and 2200 or p_month is null or p_month not between 0 and 11 or p_hours is null or p_hours<0 or p_hours>744 or p_studies is null or p_studies<0 or p_studies>1000 then raise exception 'Check reporting month, hours and studies';end if;
 select * into old from public.reports where cong_id=p_cong_id and pub_id=p_publisher_id and service_year=p_year and month=p_month for update;
 if old.id is not null then current_record=jsonb_build_object('shared',coalesce(old.shared_in_ministry,false),'hours',coalesce(old.hours,0),'studies',coalesce(old.studies,0),'comments',coalesce(old.comments,''),'auxiliary',coalesce(old.is_ap,false));end if;
 if p_expected is distinct from current_record then raise exception 'This report changed after your preview. Reload it and review again.' using errcode='40001';end if;
 if old.id is null then
  insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,hours,studies,comments,is_ap) values(gen_random_uuid()::text,p_cong_id,p_publisher_id,p_year,p_month,true,p_hours,p_studies,'',false) on conflict(pub_id,service_year,month) do nothing returning * into saved;
  if saved.id is null then raise exception 'A report was added after your preview. Reload and review.' using errcode='40001';end if;
 else
  update public.reports set shared_in_ministry=true,hours=p_hours,studies=p_studies,comments=case when old.comments='Not Participated' then '' else old.comments end where id=old.id and cong_id=p_cong_id returning * into saved;
 end if;
 return to_jsonb(saved);
end $$;
revoke all on function public.ca_v3_save_assistant_report(text,text,integer,integer,numeric,integer,jsonb) from public,anon;
grant execute on function public.ca_v3_save_assistant_report(text,text,integer,integer,numeric,integer,jsonb) to authenticated;
