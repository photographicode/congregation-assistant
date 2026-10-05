begin;
insert into public.congregations(id,name,status) values('billing-check-a','Billing A','trial');
insert into public.congregation_access(cong_id,email,role) values('billing-check-a','billing-admin@example.com','admin');
set request.jwt.claims='{"email":"billing-admin@example.com","app_metadata":{"provider":"google"}}';set role authenticated;
do $$begin begin update public.congregations set status='active' where id='billing-check-a';raise exception 'Administrator changed billing status';exception when insufficient_privilege then null;end;begin update public.congregations set trial_days=365 where id='billing-check-a';raise exception 'Administrator extended trial';exception when insufficient_privilege then null;end;begin perform public.update_congregation_owner('billing-check-a','{"status":"active"}');raise exception 'Administrator used owner update';exception when insufficient_privilege then null;end;end $$;
update public.congregations set name='Renamed Billing A' where id='billing-check-a';
reset role;rollback;
select 'PASS ordinary administrators cannot alter status, trial or owner billing API; profile edits remain allowed' as result;
