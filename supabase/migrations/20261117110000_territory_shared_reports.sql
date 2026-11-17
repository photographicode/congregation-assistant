-- Shared territory cards, 2026-11-17 (owner request): a shared card shows every open issue and every language find.
-- Language finds stay on the card after an admin marks them resolved: a house where a language is spoken stays one.
-- Needs 20261116090000_territory_viewer_language.sql. Safe to re-run.
-- Down path: run 20261116090000_territory_viewer_language.sql again (it restores open reports only).

create or replace function public.tm_public_territory(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.tm_territories;w public.tm_workspaces;
begin
 perform ca_private.rate_guard('tm_public_territory',p_token,120,300,60);
 select * into t from public.tm_territories where share_token=p_token;
 if t.id is null then raise exception 'This territory link is not valid any more. Ask the territory servant for a new one.'; end if;
 select * into w from public.tm_workspaces where id=t.workspace_id;
 return jsonb_build_object('id',t.id,'number',t.number,'name',t.name,'notes',t.notes,'image',t.image,'map_url',t.map_url,
  'workspace',w.name,'report_mode',w.report_mode,'languages',to_jsonb(w.languages),
  'reports',(select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'language',language,'household',household,'details',details,'lat',lat,'lng',lng,'created_at',created_at) order by created_at desc),'[]'::jsonb) from public.tm_reports where territory_id=t.id and (resolved_at is null or kind='language')));
end $$;
