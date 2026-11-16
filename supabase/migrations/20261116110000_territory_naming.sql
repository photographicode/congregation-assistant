-- Territory naming, 2026-11-16 (owner request): after the generator splits a boundary, the congregation gets one link
-- with all its territories. For each one they write the locality name and mark junctions or landmarks on the map,
-- one territory at a time; drafts save as they type. The owner then pulls the names back into the generator.
-- Needs 20261116100000_territory_request_tracking.sql (requests, track_token) and onboarding-mail.sql. Safe to re-run.
-- Down path: 20261116110000_territory_naming.down.sql.

create table if not exists ca_private.territory_naming(
 id uuid primary key default gen_random_uuid(),
 request_id uuid references ca_private.territory_requests(id) on delete set null,
 token text not null unique default replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''),
 congregation text not null check(length(congregation) between 1 and 150),
 -- [{number, geometry}] with GeoJSON Polygon/MultiPolygon geometry, as the generator split them.
 territories jsonb not null check(jsonb_typeof(territories)='array' and jsonb_array_length(territories) between 1 and 1000 and length(territories::text)<=8000000),
 created_at timestamptz not null default now()
);
create table if not exists ca_private.territory_naming_entries(
 naming_id uuid not null references ca_private.territory_naming(id) on delete cascade,
 number text not null check(length(number) between 1 and 20),
 locality text not null default '' check(length(locality)<=150),
 -- [{name, lng, lat}] junctions or landmarks, at most 12.
 points jsonb not null default '[]' check(jsonb_typeof(points)='array' and jsonb_array_length(points)<=12),
 note text not null default '' check(length(note)<=1000),
 submitted_at timestamptz,
 updated_at timestamptz not null default now(),
 primary key(naming_id,number)
);
alter table ca_private.territory_naming enable row level security;
alter table ca_private.territory_naming_entries enable row level security;
revoke all on ca_private.territory_naming,ca_private.territory_naming_entries from public,anon,authenticated;

create or replace function ca_private.is_territory_owner() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.ca_is_superadmin(),false) or coalesce(ca_private.tm_is_superadmin(),false)
$$;

-- Owner: publish the split territories for naming. With a request, its contact is emailed the link.
create or replace function public.create_territory_naming(p_request uuid,p_congregation text,p_territories jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;r ca_private.territory_requests;link text;
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 if jsonb_typeof(p_territories)<>'array' or jsonb_array_length(p_territories) not between 1 and 1000
  or exists(select 1 from jsonb_array_elements(p_territories) t where length(coalesce(t->>'number',''))not between 1 and 20 or t->'geometry'->>'type' not in('Polygon','MultiPolygon')) then
  raise exception 'Send between 1 and 1,000 numbered territories with outlines';
 end if;
 if p_request is not null then select * into r from ca_private.territory_requests where id=p_request; if r.id is null then raise exception 'Request not found. Refresh the list.'; end if; end if;
 insert into ca_private.territory_naming(request_id,congregation,territories) values(p_request,left(trim(coalesce(nullif(p_congregation,''),r.congregation_name,'Congregation')),150),p_territories) returning * into n;
 link='https://territory.congregationassistant.com/?territory-names#token='||n.token;
 if r.id is not null then
  insert into ca_private.mail_outbox(dedupe,email,subject,body) values('territory-naming:'||n.id,r.contact_email,'Please name your territories · '||r.congregation_name,
   'Dear '||r.contact_name||','||chr(10)||chr(10)||
   'Your congregation boundary is now split into '||jsonb_array_length(p_territories)||' territories. You know the area best, so please give each one its locality name.'||chr(10)||chr(10)||
   'Open this link (it works on a phone or a computer):'||chr(10)||link||chr(10)||chr(10)||
   'For each territory:'||chr(10)||
   '1. Look at its outline on the map.'||chr(10)||
   '2. Write the locality name people use for that area.'||chr(10)||
   '3. Tap the map to mark the main junctions or landmarks, and name them (up to 12).'||chr(10)||
   '4. Press Submit, and go on to the next one.'||chr(10)||chr(10)||
   'Everything saves as you type, so you can stop and come back to the same link at any time. When every territory is submitted, we make the cards and the full map.'||chr(10)||chr(10)||
   'Please keep the link within the congregation.'||chr(10)||chr(10)||
   'Follow your request: https://territory.congregationassistant.com/?territory-track#token='||r.track_token||chr(10)||chr(10)||
   'Warm regards,'||chr(10)||'Congregation Assistant · Territories'||chr(10)||'support@congregationassistant.com')
  on conflict(dedupe) do nothing;
  -- Naming is part of drawing the territories.
  update ca_private.territory_requests set stage=greatest(stage,1),status=case when status in('new','declined') then 'in_progress' else status end,updated_at=now() where id=r.id;
 end if;
 return jsonb_build_object('id',n.id,'token',n.token,'link',link,'emailed',r.id is not null);
end $$;

-- Owner: every naming link with how far it has got.
create or replace function public.territory_naming_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'token',n.token,'request_id',n.request_id,'congregation',n.congregation,'created_at',n.created_at,
   'total',jsonb_array_length(n.territories),
   'submitted',(select count(*) from ca_private.territory_naming_entries e where e.naming_id=n.id and e.submitted_at is not null)) order by n.created_at desc),'[]'::jsonb)
  from ca_private.territory_naming n);
end $$;

-- Owner: the names and points, for the generator.
create or replace function public.territory_naming_results(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not ca_private.is_territory_owner() then raise exception 'SuperAdmin access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('number',number,'locality',locality,'points',points,'note',note,'submitted',submitted_at is not null) order by number),'[]'::jsonb)
  from ca_private.territory_naming_entries where naming_id=p_id);
end $$;

-- The congregation's link: the outlines and what they have written so far.
create or replace function public.territory_naming_get(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;
begin
 perform ca_private.rate_guard('territory_naming_get',p_token,60,300,60);
 select * into n from ca_private.territory_naming where token=p_token and length(coalesce(p_token,''))>=32;
 if n.id is null then raise exception 'This naming link is not valid. Check the link in your email.'; end if;
 return jsonb_build_object('congregation',n.congregation,'territories',n.territories,
  'entries',(select coalesce(jsonb_agg(jsonb_build_object('number',number,'locality',locality,'points',points,'note',note,'submitted',submitted_at is not null)),'[]'::jsonb) from ca_private.territory_naming_entries where naming_id=n.id));
end $$;

-- Saves one territory's draft (p_submit false) or submits it (true). Submitted ones can still be corrected.
create or replace function public.territory_naming_save(p_token text,p_number text,p_locality text,p_points jsonb,p_note text,p_submit boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare n ca_private.territory_naming;loc text=trim(coalesce(p_locality,''));
begin
 perform ca_private.rate_guard('territory_naming_save',p_token,600,1200,3600);
 select * into n from ca_private.territory_naming where token=p_token and length(coalesce(p_token,''))>=32;
 if n.id is null then raise exception 'This naming link is not valid. Check the link in your email.'; end if;
 if not exists(select 1 from jsonb_array_elements(n.territories) t where t->>'number'=p_number) then raise exception 'Territory % is not in this list',p_number; end if;
 if length(loc)>150 or length(coalesce(p_note,''))>1000 then raise exception 'Keep the name under 150 and the note under 1000 characters'; end if;
 if jsonb_typeof(coalesce(p_points,'[]'))<>'array' or jsonb_array_length(coalesce(p_points,'[]'))>12
  or exists(select 1 from jsonb_array_elements(coalesce(p_points,'[]')) p where length(trim(coalesce(p->>'name','')))not between 1 and 80
   or jsonb_typeof(p->'lng')<>'number' or jsonb_typeof(p->'lat')<>'number' or (p->>'lat')::float8 not between -90 and 90 or (p->>'lng')::float8 not between -180 and 180) then
  raise exception 'Each marked place needs a name (up to 80 characters); up to 12 places';
 end if;
 if p_submit and length(loc)<2 then raise exception 'Write the locality name before submitting'; end if;
 insert into ca_private.territory_naming_entries(naming_id,number,locality,points,note,submitted_at,updated_at)
 values(n.id,p_number,loc,coalesce(p_points,'[]'),trim(coalesce(p_note,'')),case when p_submit then now() end,now())
 on conflict(naming_id,number) do update set locality=excluded.locality,points=excluded.points,note=excluded.note,
  submitted_at=case when p_submit then now() else ca_private.territory_naming_entries.submitted_at end,updated_at=now();
 return jsonb_build_object('saved',true,'submitted',p_submit);
end $$;

revoke all on function ca_private.is_territory_owner() from public,anon,authenticated;
revoke all on function public.create_territory_naming(uuid,text,jsonb),public.territory_naming_list(),public.territory_naming_results(uuid),
 public.territory_naming_get(text),public.territory_naming_save(text,text,text,jsonb,text,boolean) from public,anon,authenticated;
grant execute on function public.create_territory_naming(uuid,text,jsonb),public.territory_naming_list(),public.territory_naming_results(uuid) to authenticated;
grant execute on function public.territory_naming_get(text),public.territory_naming_save(text,text,text,jsonb,text,boolean) to anon,authenticated;
