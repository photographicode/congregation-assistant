\set ON_ERROR_STOP on
-- Migrate a legacy fixture, preserving its actual scheduler identity, token and independent publication.
set request.jwt.claims='{"sub":"10000000-0000-0000-0000-000000000002","email":"legacy-admin@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert(public.get_department_workspace('fictional-legacy-adoption','av')->'assignments'->'2026-W42'->'Duty_abcdefabcdefabcdefabcdefabcdefab_1'->>'publisherId'='fictional-legacy-person','Adoption maps the existing scheduler identity to its publisher');
select test.assert(public.get_department_workspace('fictional-legacy-adoption','av')->'assignments'->'2026-W42'->'Duty_abcdefabcdefabcdefabcdefabcdefab_1'->>'personId'='legacy-scheduler-id','Adoption preserves assignment identity');
select test.assert(public.get_department_workspace('fictional-legacy-adoption','av')->'duties'->0->>'id'='Duty_abcdefabcdefabcdefabcdefabcdefab','Adoption preserves duty IDs');
select test.assert(public.get_oclm_workspace('fictional-legacy-adoption')->>'revision'='19','Adoption preserves OCLM revision');
select test.assert(public.get_department_workspace('fictional-legacy-adoption','av')->'publicationVersions'->>'2026-W42'='4','Adoption preserves published department version');
select public.publish_department_week('fictional-legacy-adoption','av','2026-W42',(public.get_department_workspace('fictional-legacy-adoption','av')->>'revision')::bigint,4);
select test.assert(public.get_department_workspace('fictional-legacy-adoption','av')->>'token'='10000000-1111-2222-3333-000000000001','Adopted department preserves shared public token');
select test.assert((public.get_oclm_public_snapshot('10000000-1111-2222-3333-000000000001')->'snapshot'->'assignments'->'2026-W42')::text like '%legacy-scheduler-id%','Adopted assignment reaches same public board');
reset role;
select test.assert((select count(*)=2 from ca_private.department_publication_history where cong_id='fictional-legacy-adoption'),'Legacy and new publication history both retained');
delete from public.congregations where id='fictional-legacy-adoption';
\echo PASS additive legacy adoption preserves publisher mapping, IDs, OCLM revision, independent versions, history and public token
