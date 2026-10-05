\set ON_ERROR_STOP on
select test.assert((select count(*)>=2 from public.congregations),'restored synthetic congregation records');
select test.assert((select count(*)>=2 from public.publishers),'restored synthetic publisher records');
select test.assert((select relrowsecurity from pg_class where oid='public.publishers'::regclass),'restore retains publisher RLS');
set request.jwt.claims='{"email":"scheduler-a@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
select test.assert((select count(*)=0 from public.publishers),'restored OCLM cannot read private publisher rows');
select test.assert(jsonb_array_length(public.get_oclm_roster('a'))>=1,'restored limited OCLM roster works');
reset role;
