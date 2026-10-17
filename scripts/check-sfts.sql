\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('sfts-test','Synthetic SFTS','active'),('sfts-other','Other synthetic','active');
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000911','sfts-admin@example.invalid',now()),('00000000-0000-4000-8000-000000000912','sfts-field@example.invalid',now());
insert into public.congregation_access(cong_id,email,role,active) values('sfts-test','sfts-admin@example.invalid','admin',true),('sfts-test','sfts-field@example.invalid','field_service',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000911","email":"sfts-admin@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select public.ca_v3_save_person('sfts-test','{"id":"sfts-person","name":"Synthetic servant","group":"","email":"","gender":"Male","expected_login":[],"isSFTS":true}',false);
do $$begin
 if not (select is_sfts from public.publishers where id='sfts-person') then raise exception 'SFTS not saved';end if;
 if not (public.ca_v2_people('sfts-test')->0->>'is_sfts')::boolean then raise exception 'SFTS not in read projection';end if;
 begin perform public.ca_v3_save_person('sfts-other','{"id":"forbidden","name":"No access","isSFTS":true}',false);raise exception 'Cross-tenant write';exception when insufficient_privilege then null;end;
 begin perform public.ca_v3_save_person('sfts-test','{"id":"invalid","name":"Invalid flag","isSFTS":"true"}',false);raise exception 'String flag accepted';exception when invalid_parameter_value then null;end;
 if exists(select 1 from public.publishers where id='invalid') then raise exception 'Invalid write not atomic';end if;
 if has_function_privilege('anon','public.ca_v3_save_person(text,jsonb,boolean)','execute') then raise exception 'Anonymous execute grant';end if;
end $$;
select public.ca_v3_save_person('sfts-test','{"id":"sfts-person","name":"Updated synthetic","group":"","email":"","expected_login":[]}',false);
do $$begin if not (select is_sfts from public.publishers where id='sfts-person') then raise exception 'Partial update erased SFTS';end if;end $$;
do $$declare saved jsonb;fingerprint text;begin saved=public.export_congregation_workspace('sfts-test');update public.publishers set is_sfts=false where id='sfts-person';fingerprint=public.export_congregation_workspace('sfts-test')->>'fingerprint';perform public.restore_congregation_workspace('sfts-test',fingerprint,saved->'data');if not (select is_sfts from public.publishers where id='sfts-person') then raise exception 'Backup round trip lost SFTS';end if;end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000912","email":"sfts-field@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
do $$begin begin perform public.ca_v3_save_person('sfts-test','{"id":"forbidden","name":"No access","isSFTS":true}',false);raise exception 'Non-admin write';exception when insufficient_privilege then null;end;end $$;
rollback;
select 'PASS SFTS save, read, partial preservation, validation, role and tenant boundaries';
