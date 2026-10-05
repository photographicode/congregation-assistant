\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('shared-a','Shared A','active'),('shared-b','Shared B','active');
insert into public.congregation_access(cong_id,email,role) values('shared-a','scheduler-shared@example.com','oclm'),('shared-b','other-shared@example.com','oclm');
insert into public.congregation_access(cong_id,email,role,is_assistant) values('shared-a','assistant-shared@example.com','oclm',true);
insert into public.publishers(id,cong_id,name) values('shared-person','shared-a','Shared Person');
set request.jwt.claims='{"email":"scheduler-shared@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select public.save_oclm_workspace('shared-a',0,'{"personnel":[{"id":"person1","publisherId":"shared-person","name":"Shared Person","phone":"PRIVATE CONTACT","roles":["Prayer"],"exceptions":{"Chairman":false},"availability":[{"from":"2026-10-05","to":"2026-10-11","reason":"PRIVATE REASON"}]}],"assignments":{"2026-W41":{"OpeningPrayer":{"personId":"person1"},"OpeningSong":{"customTitle":"15"}},"2026-W42":{"OpeningPrayer":{"personId":"person1"}}},"additionalDuties":[]}');
select test.assert(public.get_oclm_workspace('shared-a')->>'revision'='1','first cloud draft revision');
select test.assert(public.get_oclm_workspace('shared-a')::text not like '%PRIVATE%','contact and away reasons never stored');
do $$begin begin perform public.save_oclm_workspace('shared-a',0,'{}');raise exception 'stale save accepted';exception when serialization_failure then null;end;end$$;
select public.publish_oclm_week('shared-a','2026-W41',1,0);
select public.publish_oclm_week('shared-a','2026-W42',1,1);
select test.assert(jsonb_array_length(public.get_oclm_workspace('shared-a')->'publication'->'snapshot'->'publishedWeeks')=2,'publishing a week preserves earlier weeks');
select test.assert(public.get_oclm_workspace('shared-a')->'publication'->'snapshot'->'assignments'->'2026-W41'->'OpeningSong'->>'customTitle'='15','song metadata retained');
do $$begin begin perform public.publish_oclm_week('shared-a','2026-W41',1,1);raise exception 'stale publish accepted';exception when serialization_failure then null;end;begin perform public.upsert_oclm_public_snapshot('shared-a','{}');raise exception 'legacy publish bypass';exception when insufficient_privilege then null;end;begin update public.ca_oclm_publications set snapshot='{}' where cong_id='shared-a';raise exception 'direct publish bypass';exception when insufficient_privilege then null;end;end$$;
select public.rollback_oclm_publication('shared-a',2,1);
select test.assert(jsonb_array_length(public.get_oclm_workspace('shared-a')->'publication'->'snapshot'->'publishedWeeks')=1,'rollback restores earlier snapshot');
select test.assert(jsonb_array_length(public.get_oclm_publication_history('shared-a'))=3,'rollback is a new immutable version');
set request.jwt.claims='{"email":"assistant-shared@example.com","app_metadata":{"provider":"google"}}';
select test.assert(public.get_oclm_workspace('shared-a')->>'revision'='1','assistant reads shared workspace');
select public.save_oclm_workspace('shared-a',1,public.get_oclm_workspace('shared-a')->'draft');
set request.jwt.claims='{"email":"other-shared@example.com","app_metadata":{"provider":"google"}}';
do $$begin begin perform public.get_oclm_workspace('shared-a');raise exception 'cross congregation read';exception when insufficient_privilege then null;end;begin perform public.publish_oclm_week('shared-a','2026-W41',2,3);raise exception 'cross congregation publish';exception when insufficient_privilege then null;end;end$$;
reset role;
select test.assert((select count(*)>=1 from public.ca_oclm_assignment_events where cong_id='shared-a'),'assignment lifecycle events recorded');
rollback;
\echo PASS shared drafts, assistants, private fields, stale saves, per-week publishing, immutable history, rollback and congregation isolation
