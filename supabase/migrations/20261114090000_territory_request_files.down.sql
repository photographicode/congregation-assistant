-- Removes request attachments and gives the requests list back to Congregation Assistant owners only.
-- Attached files are deleted with their table: download any you need from the territory dashboard first.
drop function if exists public.get_territory_request_file(uuid);
drop function if exists public.submit_territory_request_with_files(text,text,text,text,text,text,jsonb);

create or replace function public.get_territory_requests() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  from (select * from ca_private.territory_requests order by created_at desc limit 500) r);
end $$;

create or replace function public.update_territory_request(p_id uuid,p_status text,p_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.ca_is_superadmin() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if p_status not in('new','in_progress','done','declined') then raise exception 'Choose a valid status'; end if;
 if length(coalesce(p_note,''))>2000 then raise exception 'Keep the note under 2000 characters'; end if;
 update ca_private.territory_requests set status=p_status,owner_note=case when p_note is null then owner_note else nullif(trim(p_note),'') end,updated_at=now() where id=p_id;
 if not found then raise exception 'Request not found. Refresh the list.'; end if;
 return jsonb_build_object('status',p_status);
end $$;

revoke all on function public.get_territory_requests(),public.update_territory_request(uuid,text,text) from public,anon,authenticated;
grant execute on function public.get_territory_requests(),public.update_territory_request(uuid,text,text) to authenticated;
drop table if exists ca_private.territory_request_files;
