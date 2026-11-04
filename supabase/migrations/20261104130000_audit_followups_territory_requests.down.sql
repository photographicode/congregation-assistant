-- Restores full congregation reads and removes the link-scope trigger and territory requests.
-- Territory requests are deleted with their table: export them from the Command centre first.
-- The role list and rate-limit order are left as they are; the earlier versions were bugs.
grant select on public.congregations to authenticated;
drop function if exists public.ca_owner_congregations();
drop trigger if exists report_link_scope on public.ca_public_links;
drop function if exists ca_private.report_link_scope();
drop function if exists public.submit_territory_request(text,text,text,text,text,text);
drop function if exists public.get_territory_requests();
drop function if exists public.update_territory_request(uuid,text,text);
drop table if exists ca_private.territory_requests;
