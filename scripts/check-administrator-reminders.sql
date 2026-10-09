\set ON_ERROR_STOP on
\i supabase/administrator-reminders.sql
begin;
reset role;
insert into auth.users(id,email,email_confirmed_at) values('55555555-5555-4555-8555-555555555555','admin-a@example.com',now()) on conflict(id) do update set email_confirmed_at=excluded.email_confirmed_at;
insert into public.publishers(id,cong_id,name) values('reminder-pub','a','Fictional Reminder Publisher'),('reminder-no-login','a','Fictional Unapproved Publisher');
insert into public.congregation_access(cong_id,email,role,publisher_id,active) values('a','reminder@example.com','publisher','reminder-pub',true);
set request.jwt.claims='{"sub":"55555555-5555-4555-8555-555555555555","email":"admin-a@example.com","app_metadata":{"provider":"google"}}';
set role authenticated;
select test.assert(public.send_congregation_reminder('a','reminder-pub','test-1','Prepare for meeting','2026-10-20','09:00')->>'recipients'='1','approved publisher receives reminder');
select test.assert(public.send_congregation_reminder('a','reminder-pub','test-1','Prepare for meeting','2026-10-20','09:00')->>'recipients'='1','safe duplicate retry');
do $$begin begin perform public.send_congregation_reminder('a','reminder-pub','test-1','Changed title','2026-10-20','09:00');raise exception 'Duplicate changed payload accepted';exception when raise_exception then if sqlerrm='Duplicate changed payload accepted' then raise;end if;end;end$$;
do $$begin begin perform public.send_congregation_reminder('b',null,'cross-tenant','Cross tenant','2026-10-20','09:00');raise exception 'Cross tenant accepted';exception when insufficient_privilege then null;end;end$$;
do $$begin begin perform public.send_congregation_reminder('a','reminder-no-login','unapproved','Unapproved','2026-10-20','09:00');raise exception 'Unapproved recipient accepted';exception when raise_exception then if sqlerrm='Unapproved recipient accepted' then raise;end if;end;end$$;
reset role;
select test.assert((select jsonb_array_length(reminders)=1 and revision=1 from ca_private.publisher_preferences where cong_id='a' and publisher_id='reminder-pub'),'duplicate retry preserves revision and avoids duplicate reminder');
select test.assert(not has_function_privilege('anon','public.send_congregation_reminder(text,text,text,text,text,text)','execute'),'anonymous reminder endpoint denied');
update public.publishers set transferred_at=now() where id='reminder-pub';
set role authenticated;
do $$begin begin perform public.send_congregation_reminder('a','reminder-pub','transferred','No transfer access','2026-10-20','09:00');raise exception 'Transferred recipient accepted';exception when raise_exception then if sqlerrm='Transferred recipient accepted' then raise;end if;end;end$$;
reset role;
rollback;
