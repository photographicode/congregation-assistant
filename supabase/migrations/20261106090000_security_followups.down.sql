-- Rolls back only the parts that change behaviour. Restored rate limits and revoked grants are kept.
drop function if exists ca_private.security_selfcheck();
drop trigger if exists report_link_scope on public.ca_public_links;
create trigger report_link_scope before insert on public.ca_public_links for each row execute function ca_private.report_link_scope();
