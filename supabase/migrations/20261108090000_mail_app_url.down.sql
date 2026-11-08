-- Restores the previous APP_URL (a subdomain with no DNS record; mail links will not open).
do $$
begin
 if to_regclass('ca_private.public_app_config') is not null then
  update ca_private.public_app_config
  set values=values||'{"APP_URL":"https://app.congregationassistant.com"}'::jsonb
  where singleton;
 end if;
end $$;
