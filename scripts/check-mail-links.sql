\set ON_ERROR_STOP on
begin;
update ca_private.public_app_config set values=values||'{"APP_URL":"https://qa-app.example.invalid","PUBLIC_SITE_URL":"https://qa-site.example.invalid","SUPPORT_EMAIL":"support@example.invalid"}'::jsonb;
insert into public.ca_superadmins(email,active) values('links-owner@example.invalid',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","email":"links-owner@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select public.submit_workspace_application('Fictional Contact','contact@example.invalid','fictional-links@gmail.com','Fictional Links','',true,'');
select public.review_workspace_application((select id from ca_private.workspace_applications where admin_email='fictional-links@gmail.com'),'fictional-links',true);
do $$declare body text;begin
 select m.body into body from ca_private.mail_outbox m where dedupe like 'application-welcome-admin:%' and email='fictional-links@gmail.com';
 if body not like '%https://qa-app.example.invalid%' or body not like '%https://qa-site.example.invalid/help/%' or body not like '%support@example.invalid%' or body like '%github.io%' then raise exception 'Configured welcome links not used';end if;
 if not exists(select 1 from ca_private.mail_outbox m2 where m2.email='contact@example.invalid' and m2.body like '%https://qa-app.example.invalid%' and m2.body not like '%github.io%') then raise exception 'Contact message did not use configured links';end if;
end $$;
rollback;
select 'Configured app/site/support mail links passed; no mail was delivered';
