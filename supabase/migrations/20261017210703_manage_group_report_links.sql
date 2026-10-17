-- Only manage active whole-group report links within the caller's existing scope.
create function public.ca_v3_manage_group_link(p_cong_id text,p_token uuid,p_action text) returns jsonb language plpgsql security definer set search_path='' as $$
declare link public.ca_public_links;next_token uuid;begin
 if auth.uid() is null or p_action is null or p_action not in('rotate','revoke') then raise exception 'Link management access required' using errcode='42501';end if;
 select * into link from public.ca_public_links where cong_id=p_cong_id and token=p_token and kind='report' and service_group is not null and pub_id is null for update;
 if link.token is null or not (public.ca_has_role(p_cong_id,array['field_service']) or public.ca_can_read_group(p_cong_id,link.service_group)) then raise exception 'Link management access required' using errcode='42501';end if;
 if not link.active then raise exception 'This link was already withdrawn. Refresh the list.';end if;
 update public.ca_public_links set active=false where token=link.token and cong_id=p_cong_id;
 if p_action='rotate' then insert into public.ca_public_links(cong_id,kind,service_group,pub_id) values(p_cong_id,'report',link.service_group,null) returning token into next_token;end if;
 return jsonb_build_object('token',next_token,'action',p_action);
end $$;
revoke all on function public.ca_v3_manage_group_link(text,uuid,text) from public,anon,authenticated;
grant execute on function public.ca_v3_manage_group_link(text,uuid,text) to authenticated;
