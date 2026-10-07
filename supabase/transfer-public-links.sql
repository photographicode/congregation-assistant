begin;
CREATE OR REPLACE FUNCTION public.create_public_link(p_cong_id text, p_kind text, p_group text DEFAULT NULL::text, p_pub_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare t uuid;
 begin
 if p_kind not in ('report','attendance') then raise exception 'Access denied' using errcode='42501';end if;
 if not public.ca_has_role(p_cong_id,case when p_kind='report' then array['field_service'] else array['attendance'] end) then
  if p_kind<>'report' or p_group is null or not public.ca_can_read_group(p_cong_id,p_group) then raise exception 'Access denied' using errcode='42501';end if;
 end if;
 if p_pub_id is not null and not exists(select 1 from public.publishers p where p.id=p_pub_id and p.cong_id=p_cong_id and p.transferred_at is null and (p_group is null or p.service_group=p_group)) then raise exception 'Publisher is outside link scope' using errcode='42501';end if;
 insert into public.ca_public_links(cong_id,kind,service_group,pub_id) values(p_cong_id,p_kind,nullif(p_group,''),nullif(p_pub_id,'')) returning token into t;
 return jsonb_build_object('token',t);
 end $function$;

CREATE OR REPLACE FUNCTION public.get_public_link_context(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare l public.ca_public_links; pubs jsonb;
 begin
 l=public.ca_resolve_link(p_token);if l.token is null then return null;end if;
 if l.kind='report' then select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'service_group',service_group,'is_rp',is_rp,'is_sp',is_sp,'is_fm',is_fm)),'[]') into pubs
 from public.publishers where cong_id=l.cong_id and transferred_at is null and (l.service_group is null or service_group=l.service_group) and (l.pub_id is null or id=l.pub_id);end if;
 return jsonb_build_object('cong_id',l.cong_id,'congregation',(select name from public.congregations where id=l.cong_id),'kind',l.kind,'service_group',l.service_group,'publishers',coalesce(pubs,'[]'));
 end $function$;

CREATE OR REPLACE FUNCTION public.submit_public_report(p_token text, p_report jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare l public.ca_public_links;p public.publishers;y integer;m integer;
 begin
 l=public.ca_resolve_link(p_token,'report');if l.token is null then raise exception 'Invalid or withdrawn report link' using errcode='42501';end if;
 select * into p from public.publishers where transferred_at is null and id=p_report->>'pub_id' and cong_id=l.cong_id and (l.pub_id is null or id=l.pub_id) and (l.service_group is null or service_group=l.service_group);
 if p.id is null then raise exception 'Publisher is outside this link' using errcode='42501';end if;
 y=(p_report->>'service_year')::integer;m=(p_report->>'month')::integer;
 insert into public.reports(id,cong_id,pub_id,service_year,month,shared_in_ministry,studies,hours,comments,is_ap)
 values(p.id||'_'||y||'_'||m,l.cong_id,p.id,y,m,coalesce((p_report->>'shared_in_ministry')::boolean,false),coalesce((p_report->>'studies')::integer,0),coalesce((p_report->>'hours')::numeric,0),left(p_report->>'comments',2000),coalesce((p_report->>'is_ap')::boolean,false))
 on conflict(pub_id,service_year,month) do update set shared_in_ministry=excluded.shared_in_ministry,studies=excluded.studies,hours=excluded.hours,comments=excluded.comments,is_ap=excluded.is_ap;
 return true;
 end $function$;
commit;
