-- Apply to the configured new-project schema. No records are deleted or migrated.
begin;
create index if not exists ca_public_links_cong_idx on public.ca_public_links(cong_id);
create index if not exists ca_public_links_publisher_idx on public.ca_public_links(pub_id,cong_id);
create index if not exists publishers_cong_idx on public.publishers(cong_id);
create index if not exists publishers_family_idx on public.publishers(family_head_id,cong_id);
create index if not exists reports_cong_period_idx on public.reports(cong_id,service_year,month);
create index if not exists reports_publisher_cong_idx on public.reports(pub_id,cong_id);
create index if not exists wipe_requests_cong_idx on public.wipe_requests(cong_id);
create index if not exists congregation_access_email_idx on public.congregation_access(email,cong_id) where active;
alter policy superadmins_self on public.ca_superadmins using((select public.ca_google_identity()) and email=lower((select auth.jwt())->>'email'));
alter policy access_read on public.congregation_access using(public.ca_is_congregation_admin(cong_id) or (select public.ca_google_identity()) and active and email=lower((select auth.jwt())->>'email'));
-- The existing SELECT policies already include administrators; write policies
-- are split by operation to avoid evaluating duplicate SELECT policies.
drop policy if exists congregations_super on public.congregations;
create policy congregations_insert on public.congregations for insert to authenticated with check((select public.ca_is_superadmin()));
create policy congregations_update on public.congregations for update to authenticated using((select public.ca_is_superadmin())) with check((select public.ca_is_superadmin()));
create policy congregations_delete on public.congregations for delete to authenticated using((select public.ca_is_superadmin()));
drop policy if exists access_manage on public.congregation_access;
create policy access_insert on public.congregation_access for insert to authenticated with check(public.ca_is_congregation_admin(cong_id));
create policy access_update on public.congregation_access for update to authenticated using(public.ca_is_congregation_admin(cong_id)) with check(public.ca_is_congregation_admin(cong_id));
create policy access_delete on public.congregation_access for delete to authenticated using(public.ca_is_congregation_admin(cong_id));
commit;
