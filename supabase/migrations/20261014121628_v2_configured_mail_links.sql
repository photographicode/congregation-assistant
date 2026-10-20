-- Public URL/email configuration only; no SMTP or service credentials.
create table if not exists ca_private.public_app_config(singleton boolean primary key default true check(singleton),values jsonb not null);
alter table ca_private.public_app_config enable row level security;
revoke all on ca_private.public_app_config from public,anon,authenticated;
insert into ca_private.public_app_config(singleton,values) values(true,'{"APP_URL": "https://app.congregationassistant.com", "PUBLIC_SITE_URL": "https://congregationassistant.com", "SUPPORT_EMAIL": "support@congregationassistant.com", "SECURITY_EMAIL": "security@congregationassistant.com", "BASE_URL": "/"}'::jsonb) on conflict(singleton) do update set values=excluded.values;
create or replace function ca_private.app_link(p_key text) returns text language sql stable security definer set search_path='' as $$select values->>p_key from ca_private.public_app_config where singleton$$;
revoke all on function ca_private.app_link(text) from public,anon,authenticated;
do $$declare definition text;item record;begin
 for item in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where(n.nspname='public' and p.proname in('request_congregation_trial','review_workspace_application')) or(n.nspname='ca_private' and p.proname='approve_requested_workspace') loop
  definition=pg_get_functiondef(item.oid);
  definition=replace(definition,'https://photographicode.github.io/congregation-assistant/app/','''||ca_private.app_link(''APP_URL'')||''');
  definition=replace(definition,'https://photographicode.github.io/congregation-assistant/','''||ca_private.app_link(''APP_URL'')||''');
  definition=replace(definition,'https://photographicode.github.io/congregation-assistant/how-to-use.html','''||ca_private.app_link(''PUBLIC_SITE_URL'')||''/help/');
  definition=replace(definition,'congregationassistant0@gmail.com','''||ca_private.app_link(''SUPPORT_EMAIL'')||''');
  definition=replace(definition,'assign department overseers in Settings','assign overseers in Access & Links');
  definition=replace(definition,'Your congregation Gmail administrator','Your congregation administrator');
  if definition like '%photographicode.github.io%' then raise exception 'A legacy mail URL remains; review its template';end if;execute definition;
 end loop;
end $$;
