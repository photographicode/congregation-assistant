\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('experience-a','Fictional Experience','active'),('experience-b','Other Fictional Experience','active');
insert into auth.users(id,email,email_confirmed_at) values('00000000-0000-4000-8000-000000000801','experience-admin@example.invalid',now()),('00000000-0000-4000-8000-000000000802','experience-member@example.invalid',now());
insert into public.congregation_access(cong_id,email,role,active) values('experience-a','experience-admin@example.invalid','admin',true),('experience-a','experience-member@example.invalid','field_service',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000801","email":"experience-admin@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select test.assert(public.ca_v2_get_experience('experience-a')->>'publisherStyle'='calm','Publisher default Calm');
select public.ca_v2_set_experience_defaults('experience-a','lively','balanced');
create temporary table experience_fixture as select '{"style":"lively","navigation":"classic","density":"compact","motion":"full","colorIntensity":"vivid","charts":true,"background":"ambient","theme":"glass-lagoon","tone":"standard","size":"M","weight":"regular","solid":false,"auto":true,"fit":"auto","clock":"locale"}'::jsonb preferences;
select test.assert(public.ca_v2_save_experience('experience-a',(select preferences from experience_fixture),0)=1,'First profile revision');
select test.assert(public.ca_v2_get_experience('experience-a')->'preferences'->>'style'='lively','Saved own profile');
do $$begin
 begin perform public.ca_v2_save_experience('experience-a',(select preferences from experience_fixture),0);raise exception 'Stale revision accepted';exception when serialization_failure then null;end;
 begin perform public.ca_v2_save_experience('experience-a',(select preferences||'{"role":"admin"}'::jsonb from experience_fixture),1);raise exception 'Role injection accepted';exception when raise_exception then if sqlerrm='Role injection accepted' then raise;end if;end;
 begin perform public.ca_v2_get_experience('experience-b');raise exception 'Other tenant accepted';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000802","email":"experience-member@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select test.assert(public.ca_v2_get_experience('experience-a')->'preferences'='null'::jsonb,'Another member cannot read admin profile');
select test.assert(public.ca_v2_get_experience('experience-a')->>'adminStyle'='lively','Member sees congregation default');
do $$begin
 begin perform public.ca_v2_set_experience_defaults('experience-a','calm','calm');raise exception 'Member changed defaults';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{}',true);
do $$begin begin perform public.ca_v2_get_experience('experience-a');raise exception 'Anonymous profile access';exception when insufficient_privilege then null;end;end $$;
rollback;
select 'PASS experience own-account isolation, tenant scope, defaults permissions, revision conflict and role-injection rejection';
