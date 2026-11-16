-- Territory naming landmarks, 2026-11-16 (owner request): when the cards are finished, the naming link shows each
-- territory's current locality name and card landmarks, so the congregation can rename them and add notes.
-- The owner chooses, per link, whether they may also move, add or remove landmarks (on by default, as before).
-- Needs 20261116110000_territory_naming.sql. Safe to re-run. Down path: 20261116130000_territory_naming_landmarks.down.sql.

alter table ca_private.territory_naming add column if not exists landmarks_editable boolean not null default true;

-- The 3-argument version is replaced; a 4-argument one with a default would make old calls ambiguous.
drop function if exists public.create_territory_naming(uuid,text,jsonb);
-- Owner: publish the split territories for naming. Each may carry its current locality and landmarks [{name,lng,lat}].
create or replace function public.create_territory_naming(p_request uuid,p_congregation text,p_territories jsonb,p_landmarks_editable boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;r ca_private.territory_requests;link text;edit boolean=coalesce(p_landmarks_editable,true);
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if jsonb_typeof(p_territories)<>'array' or jsonb_array_length(p_territories) not between 1 and 1000
  or exists(select 1 from jsonb_array_elements(p_territories) t where length(coalesce(t->>'number',''))not between 1 and 20 or t->'geometry'->>'type' not in('Polygon','MultiPolygon')) then
  raise exception 'Send between 1 and 1,000 numbered territories with outlines';
 end if;
 if exists(select 1 from jsonb_array_elements(p_territories) t where length(coalesce(t->>'locality',''))>150
   or jsonb_typeof(coalesce(t->'points','[]'))<>'array' or jsonb_array_length(coalesce(t->'points','[]'))>12
   or exists(select 1 from jsonb_array_elements(coalesce(t->'points','[]')) p where length(trim(coalesce(p->>'name','')))not between 1 and 80
    or jsonb_typeof(p->'lng')<>'number' or jsonb_typeof(p->'lat')<>'number')) then
  raise exception 'Each territory may carry a locality (up to 150 characters) and up to 12 named landmarks';
 end if;
 if p_request is not null then select * into r from ca_private.territory_requests where id=p_request; if r.id is null then raise exception 'Request not found. Refresh the list.'; end if; end if;
 insert into ca_private.territory_naming(request_id,congregation,territories,landmarks_editable) values(p_request,left(trim(coalesce(nullif(p_congregation,''),r.congregation_name,'Congregation')),150),p_territories,edit) returning * into n;
 link='https://territory.congregationassistant.com/?territory-names#token='||n.token;
 if r.id is not null then
  insert into ca_private.mail_outbox(dedupe,email,subject,body) values('territory-naming:'||n.id,r.contact_email,'Please name your territories · '||r.congregation_name,
   'Dear '||r.contact_name||','||chr(10)||chr(10)||
   'Your congregation boundary is now split into '||jsonb_array_length(p_territories)||' territories. You know the area best, so please give each one its locality name.'||chr(10)||chr(10)||
   'Open this link (it works on a phone or a computer):'||chr(10)||link||chr(10)||chr(10)||
   'For each territory:'||chr(10)||
   '1. Look at its outline on the map.'||chr(10)||
   '2. Write the locality name people use for that area.'||chr(10)||
   case when edit then '3. Tap the map to mark the main junctions or landmarks, and name them (up to 12).'
    else '3. Check the names of the marked junctions or landmarks, and correct them if needed.' end||chr(10)||
   '4. Add a note if anything else should be known, press Submit, and go on to the next one.'||chr(10)||chr(10)||
   'Everything saves as you type, so you can stop and come back to the same link at any time. When every territory is submitted, we make the cards and the full map.'||chr(10)||chr(10)||
   'Please keep the link within the congregation.'||chr(10)||chr(10)||
   'Follow your request: https://territory.congregationassistant.com/?territory-track#token='||r.track_token||chr(10)||chr(10)||
   'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com')
  on conflict(dedupe) do nothing;
  update ca_private.territory_requests set stage=greatest(stage,1),status=case when status in('new','declined') then 'in_progress' else status end,updated_at=now() where id=r.id;
 end if;
 return jsonb_build_object('id',n.id,'token',n.token,'link',link,'emailed',r.id is not null);
end $$;

-- Owner: allow or stop moving, adding and removing landmarks on one link. Renaming is always allowed.
create or replace function public.set_territory_naming_landmarks(p_id uuid,p_on boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 update ca_private.territory_naming set landmarks_editable=coalesce(p_on,true) where id=p_id;
 if not found then raise exception 'Naming link not found. Refresh the list.'; end if;
 return jsonb_build_object('landmarks_editable',coalesce(p_on,true));
end $$;

create or replace function public.territory_naming_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'token',n.token,'request_id',n.request_id,'congregation',n.congregation,'created_at',n.created_at,
   'total',jsonb_array_length(n.territories),'landmarks_editable',n.landmarks_editable,
   'submitted',(select count(*) from ca_private.territory_naming_entries e where e.naming_id=n.id and e.submitted_at is not null)) order by n.created_at desc),'[]'::jsonb)
  from ca_private.territory_naming n);
end $$;

create or replace function public.territory_naming_get(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;
begin
 perform ca_private.rate_guard('territory_naming_get',p_token,60,300,60);
 select * into n from ca_private.territory_naming where token=p_token and length(coalesce(p_token,''))>=32;
 if n.id is null then raise exception 'This naming link is not valid. Check the link in your email.'; end if;
 return jsonb_build_object('congregation',n.congregation,'territories',n.territories,'landmarks_editable',n.landmarks_editable,
  'entries',(select coalesce(jsonb_agg(jsonb_build_object('number',number,'locality',locality,'points',points,'note',note,'submitted',submitted_at is not null)),'[]'::jsonb) from ca_private.territory_naming_entries where naming_id=n.id));
end $$;

create or replace function public.territory_naming_save(p_token text,p_number text,p_locality text,p_points jsonb,p_note text,p_submit boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;loc text=trim(coalesce(p_locality,''));pts jsonb=coalesce(p_points,'[]');orig jsonb;
begin
 perform ca_private.rate_guard('territory_naming_save',p_token,600,1200,3600);
 select * into n from ca_private.territory_naming where token=p_token and length(coalesce(p_token,''))>=32;
 if n.id is null then raise exception 'This naming link is not valid. Check the link in your email.'; end if;
 select coalesce(t->'points','[]') into orig from jsonb_array_elements(n.territories) t where t->>'number'=p_number limit 1;
 if orig is null then raise exception 'Territory % is not in this list',p_number; end if;
 if length(loc)>150 or length(coalesce(p_note,''))>1000 then raise exception 'Keep the name under 150 and the note under 1000 characters'; end if;
 if jsonb_typeof(pts)<>'array' or jsonb_array_length(pts)>12
  or exists(select 1 from jsonb_array_elements(pts) p where length(trim(coalesce(p->>'name','')))not between 1 and 80
   or jsonb_typeof(p->'lng')<>'number' or jsonb_typeof(p->'lat')<>'number' or (p->>'lat')::float8 not between -90 and 90 or (p->>'lng')::float8 not between -180 and 180) then
  raise exception 'Each marked place needs a name (up to 80 characters); up to 12 places';
 end if;
 -- Locked landmarks: the same places in the same order; only their names may change.
 if not n.landmarks_editable and (jsonb_array_length(pts)<>jsonb_array_length(orig) or exists(
   select 1 from jsonb_array_elements(pts) with ordinality a(p,i) join jsonb_array_elements(orig) with ordinality b(o,j) on i=j
   where (a.p->>'lng')::float8<>(b.o->>'lng')::float8 or (a.p->>'lat')::float8<>(b.o->>'lat')::float8)) then
  raise exception 'Landmarks can be renamed on this link, but not moved, added or removed';
 end if;
 if p_submit and length(loc)<2 then raise exception 'Write the locality name before submitting'; end if;
 insert into ca_private.territory_naming_entries(naming_id,number,locality,points,note,submitted_at,updated_at)
 values(n.id,p_number,loc,pts,trim(coalesce(p_note,'')),case when p_submit then now() end,now())
 on conflict(naming_id,number) do update set locality=excluded.locality,points=excluded.points,note=excluded.note,
  submitted_at=case when p_submit then now() else ca_private.territory_naming_entries.submitted_at end,updated_at=now();
 return jsonb_build_object('saved',true,'submitted',p_submit);
end $$;

revoke all on function public.create_territory_naming(uuid,text,jsonb,boolean),public.set_territory_naming_landmarks(uuid,boolean),public.territory_naming_list(),
 public.territory_naming_get(text),public.territory_naming_save(text,text,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.create_territory_naming(uuid,text,jsonb,boolean),public.set_territory_naming_landmarks(uuid,boolean),public.territory_naming_list() to authenticated;
grant execute on function public.territory_naming_get(text),public.territory_naming_save(text,text,text,jsonb,text,boolean) to anon,authenticated;
