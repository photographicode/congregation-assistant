-- Territory manager, 2026-11-16 (owner request):
-- 1. Two kinds of access only: admin (changes everything) and viewer (looks only). Existing managers become viewers.
-- 2. Each workspace chooses what publishers may report from a shared card: issues only, or issues and language finds.
--    Language finds pick from a list of languages the admin keeps.
-- 3. Territory outlines (GeoJSON from the generator's KML), so a report with a GPS location goes to the territory that holds it.
-- Needs 20261111090000_territory_manager.sql and 20261112100000_territory_hardening.sql. Safe to re-run.
-- Down path: 20261116090000_territory_viewer_language.down.sql.

-- 1. Roles ------------------------------------------------------------------------------------------
alter table public.tm_members drop constraint if exists tm_members_role_check;
update public.tm_members set role='viewer' where role='manager';
alter table public.tm_members add constraint tm_members_role_check check(role in('admin','viewer'));

-- Reading needs any access; every change needs an admin (viewers look only).
create or replace function ca_private.tm_need_read(p_ws uuid) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if ca_private.tm_role(p_ws) is null then raise exception 'You do not have access to this territory workspace' using errcode='42501'; end if;
end $$;
create or replace function ca_private.tm_need(p_ws uuid,p_admin boolean default false) returns void language plpgsql stable security definer set search_path='' as $$
declare r text=ca_private.tm_role(p_ws);
begin
 if r is null then raise exception 'You do not have access to this territory workspace' using errcode='42501'; end if;
 if r<>'admin' then raise exception 'Only a workspace admin can change this. Viewers can look only.' using errcode='42501'; end if;
end $$;

create or replace function public.tm_territory_image(p_id uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need_read(ca_private.tm_workspace_of(p_id));
 return (select image from public.tm_territories where id=p_id);
end $$;

-- Quota: 100 people per workspace. The last admin cannot be removed or demoted. 'manager' from an older app means viewer.
create or replace function public.tm_set_member(p_ws uuid,p_email text,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare e text=lower(trim(p_email));r text=case when p_role='manager' then 'viewer' else p_role end;
begin
 perform ca_private.tm_need(p_ws,true);
 if not ca_private.tm_valid_email(e) then raise exception 'Enter a valid Google account email'; end if;
 if r is not null and r not in('admin','viewer') then raise exception 'Choose admin or viewer'; end if;
 perform 1 from public.tm_workspaces where id=p_ws for update;
 if r is not null and not exists(select 1 from public.tm_members where workspace_id=p_ws and email=e)
  and (select count(*) from public.tm_members where workspace_id=p_ws)>=100 then
  raise exception 'This workspace has 100 people already. Remove someone first.';
 end if;
 if coalesce(r,'')<>'admin' and exists(select 1 from public.tm_members where workspace_id=p_ws and email=e and role='admin')
  and (select count(*) from public.tm_members where workspace_id=p_ws and role='admin')<=1 then
  raise exception 'Keep at least one admin. Add another admin first.';
 end if;
 if r is null then delete from public.tm_members where workspace_id=p_ws and email=e;
 else insert into public.tm_members(workspace_id,email,role) values(p_ws,e,r) on conflict(workspace_id,email) do update set role=excluded.role;
 end if;
end $$;

-- 2. Report mode and languages ---------------------------------------------------------------------
alter table public.tm_workspaces add column if not exists report_mode text not null default 'issues' check(report_mode in('issues','issues_language'));
alter table public.tm_workspaces add column if not exists languages text[] not null default '{}' check(cardinality(languages)<=30);
alter table public.tm_reports add column if not exists kind text not null default 'issue' check(kind in('issue','language'));
alter table public.tm_reports add column if not exists language text check(language is null or length(language) between 1 and 40);

create or replace function public.tm_save_report_settings(p_ws uuid,p_mode text,p_languages text[]) returns void language plpgsql security definer set search_path='' as $$
declare langs text[];
begin
 perform ca_private.tm_need(p_ws,true);
 if p_mode not in('issues','issues_language') then raise exception 'Choose issues only, or issues and language search'; end if;
 select coalesce(array_agg(l order by first),'{}') into langs from (select trim(x) l,min(o) first from unnest(coalesce(p_languages,'{}')) with ordinality u(x,o) where trim(x)<>'' group by trim(x)) s;
 if cardinality(langs)>30 or exists(select 1 from unnest(langs) l where length(l)>40) then raise exception 'Keep up to 30 languages, each up to 40 characters'; end if;
 if p_mode='issues_language' and cardinality(langs)=0 then raise exception 'Add at least one language for language search'; end if;
 update public.tm_workspaces set report_mode=p_mode,languages=langs where id=p_ws;
end $$;

-- 3. Outlines and point-in-territory -----------------------------------------------------------------
alter table public.tm_territories add column if not exists boundary jsonb check(boundary is null or (boundary->>'type' in('Polygon','MultiPolygon') and length(boundary::text)<=300000));

-- Even-odd ray test for one ring of [lng,lat] points.
create or replace function ca_private.tm_ring_has(p_ring jsonb,p_x double precision,p_y double precision) returns boolean language plpgsql immutable set search_path='' as $$
declare n int=jsonb_array_length(p_ring);j int=n-1;inside boolean=false;xi double precision;yi double precision;xj double precision;yj double precision;
begin
 for i in 0..n-1 loop
  xi=(p_ring->i->>0)::double precision;yi=(p_ring->i->>1)::double precision;xj=(p_ring->j->>0)::double precision;yj=(p_ring->j->>1)::double precision;
  if (yi>p_y)<>(yj>p_y) and p_x<(xj-xi)*(p_y-yi)/(yj-yi)+xi then inside=not inside; end if;
  j=i;
 end loop;
 return inside;
end $$;
-- Inside an outer ring and in none of its holes.
create or replace function ca_private.tm_contains(p_g jsonb,p_lng double precision,p_lat double precision) returns boolean language plpgsql immutable set search_path='' as $$
declare poly jsonb;
begin
 for poly in select value from jsonb_array_elements(case when p_g->>'type'='Polygon' then jsonb_build_array(p_g->'coordinates') else p_g->'coordinates' end) loop
  if ca_private.tm_ring_has(poly->0,p_lng,p_lat) and not exists(select 1 from jsonb_array_elements(poly) with ordinality h(ring,k) where k>1 and ca_private.tm_ring_has(h.ring,p_lng,p_lat)) then return true; end if;
 end loop;
 return false;
end $$;

-- p_items: [{number, boundary}] matched by territory number. Returns how many matched and the numbers that did not.
create or replace function public.tm_save_boundaries(p_ws uuid,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb;matched int=0;missing text[]='{}';n text;
begin
 perform ca_private.tm_need(p_ws,true);
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>1000 then raise exception 'Send up to 1,000 outlines'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  n=trim(item->>'number');
  if item->'boundary'->>'type' not in('Polygon','MultiPolygon') or length((item->'boundary')::text)>300000 then raise exception 'The outline for territory % is not a polygon or is too detailed',n; end if;
  update public.tm_territories set boundary=jsonb_build_object('type',item->'boundary'->>'type','coordinates',item->'boundary'->'coordinates'),updated_at=now() where workspace_id=p_ws and number=n;
  if found then matched=matched+1; else missing=missing||n; end if;
 end loop;
 return jsonb_build_object('matched',matched,'missing',to_jsonb(missing));
end $$;

-- Reads with the new fields ----------------------------------------------------------------------------
create or replace function public.tm_workspace_data(p_ws uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform ca_private.tm_need_read(p_ws);
 return jsonb_build_object(
  'workspace',(select jsonb_build_object('id',id,'name',name,'due_days',due_days,'recent_days',recent_days,'report_token',report_token,'report_mode',report_mode,'languages',to_jsonb(languages)) from public.tm_workspaces where id=p_ws),
  'role',ca_private.tm_role(p_ws),
  'members',(select coalesce(jsonb_agg(jsonb_build_object('email',email,'role',role) order by role,email),'[]'::jsonb) from public.tm_members where workspace_id=p_ws),
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name,'notes',notes,'thumb',thumb,'has_image',image is not null,'has_boundary',boundary is not null,'map_url',map_url,'share_token',share_token,'updated_at',updated_at)),'[]'::jsonb) from public.tm_territories where workspace_id=p_ws),
  'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'territory_id',a.territory_id,'publisher',a.publisher,'taken_on',a.taken_on,'due_on',a.due_on,'returned_on',a.returned_on) order by a.taken_on desc),'[]'::jsonb) from public.tm_assignments a join public.tm_territories t on t.id=a.territory_id where t.workspace_id=p_ws),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'territory_id',r.territory_id,'kind',r.kind,'language',r.language,'household',r.household,'details',r.details,'reporter',r.reporter,'lat',r.lat,'lng',r.lng,'accuracy',r.accuracy,'created_at',r.created_at,'resolved_at',r.resolved_at) order by r.created_at desc),'[]'::jsonb) from public.tm_reports r join public.tm_territories t on t.id=r.territory_id where t.workspace_id=p_ws)
 );
end $$;

create or replace function public.tm_public_form(p_token text) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w public.tm_workspaces;
begin
 perform ca_private.rate_guard('tm_public_form',p_token,120,300,60);
 select * into w from public.tm_workspaces where report_token=p_token;
 if w.id is null then raise exception 'This link is not valid any more. Ask the territory servant for a new one.'; end if;
 return jsonb_build_object('workspace',w.name,'report_mode',w.report_mode,'languages',to_jsonb(w.languages),
  'territories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'name',name) order by number),'[]'::jsonb) from public.tm_territories where workspace_id=w.id));
end $$;

create or replace function public.tm_public_territory(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tm_territories;w public.tm_workspaces;
begin
 perform ca_private.rate_guard('tm_public_territory',p_token,120,300,60);
 select * into t from public.tm_territories where share_token=p_token;
 if t.id is null then raise exception 'This territory link is not valid any more. Ask the territory servant for a new one.'; end if;
 select * into w from public.tm_workspaces where id=t.workspace_id;
 return jsonb_build_object('id',t.id,'number',t.number,'name',t.name,'notes',t.notes,'image',t.image,'map_url',t.map_url,
  'workspace',w.name,'report_mode',w.report_mode,'languages',to_jsonb(w.languages),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'language',language,'household',household,'details',details,'lat',lat,'lng',lng,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.tm_reports where territory_id=t.id and resolved_at is null));
end $$;

-- A report from a shared card or the workspace link. With a GPS location inside a territory outline it goes to that territory,
-- whichever card it was sent from. p_kind 'language' needs the workspace's language mode and one of its languages.
create or replace function public.tm_submit_report_v2(p_token text,p_territory uuid,p_kind text,p_language text,p_household text,p_details text,p_reporter text,p_lat double precision,p_lng double precision,p_accuracy real,p_website text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare home uuid;ws public.tm_workspaces;t uuid;d text=trim(coalesce(p_details,''));lang text=nullif(trim(coalesce(p_language,'')),'');
begin
 if coalesce(p_website,'')<>'' then raise exception 'Report could not be sent'; end if;
 perform ca_private.rate_guard('tm_submit_report',p_token,30,20,3600);
 select id into home from public.tm_territories where share_token=p_token;
 if home is not null then select w.* into ws from public.tm_workspaces w join public.tm_territories tt on tt.workspace_id=w.id where tt.id=home;
 else
  select * into ws from public.tm_workspaces where report_token=p_token;
  if ws.id is not null and p_territory is not null then select id into home from public.tm_territories where id=p_territory and workspace_id=ws.id; end if;
 end if;
 if ws.id is null then raise exception 'This link is not valid any more. Ask the territory servant for a new one.'; end if;
 if (p_lat is null)<>(p_lng is null) then raise exception 'Location is incomplete. Get the location again.'; end if;
 if p_lat is not null then
  select id into t from public.tm_territories where workspace_id=ws.id and boundary is not null and ca_private.tm_contains(boundary,p_lng,p_lat) order by id=home desc limit 1;
 end if;
 t=coalesce(t,home);
 if t is null then raise exception 'Choose the territory, or get your location while you are inside it.'; end if;
 if coalesce(p_kind,'issue')='language' then
  if ws.report_mode<>'issues_language' then raise exception 'Language search is not turned on for this congregation.'; end if;
  if lang is null or not lang=any(ws.languages) then raise exception 'Choose a language from the list.'; end if;
  if d='' then d='Speaks '||lang; end if;
 elsif coalesce(p_kind,'issue')<>'issue' then raise exception 'Choose an issue or a language';
 else lang=null;
 end if;
 if length(d) not between 3 and 2000 or length(coalesce(p_household,''))>150 or length(coalesce(p_reporter,''))>120 then
  raise exception 'Describe it in 3 to 2000 characters';
 end if;
 if (select count(*) from public.tm_reports where territory_id=t and resolved_at is null)>=300 then
  raise exception 'This territory has many open reports. Ask the territory servant to review them first.';
 end if;
 insert into public.tm_reports(territory_id,kind,language,household,details,reporter,lat,lng,accuracy)
 values(t,coalesce(p_kind,'issue'),lang,trim(coalesce(p_household,'')),d,trim(coalesce(p_reporter,'')),p_lat,p_lng,p_accuracy);
 return (select jsonb_build_object('received',true,'number',number,'name',name,'moved',t is distinct from home) from public.tm_territories where id=t);
end $$;

revoke all on function ca_private.tm_need_read(uuid),ca_private.tm_ring_has(jsonb,double precision,double precision),ca_private.tm_contains(jsonb,double precision,double precision) from public,anon,authenticated;
revoke all on function public.tm_save_report_settings(uuid,text,text[]),public.tm_save_boundaries(uuid,jsonb),
 public.tm_submit_report_v2(text,uuid,text,text,text,text,text,double precision,double precision,real,text) from public,anon,authenticated;
grant execute on function public.tm_save_report_settings(uuid,text,text[]),public.tm_save_boundaries(uuid,jsonb) to authenticated;
grant execute on function public.tm_submit_report_v2(text,uuid,text,text,text,text,text,double precision,double precision,real,text) to anon,authenticated;
