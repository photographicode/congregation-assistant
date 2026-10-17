\set ON_ERROR_STOP on
begin;
insert into public.congregations(id,name,status) values('extended-a','Fictional A','active'),('extended-b','Fictional B','active');
insert into public.congregation_access(cong_id,email,role,active) values('extended-a','extended@example.invalid','admin',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","email":"extended@example.invalid","role":"authenticated","app_metadata":{"provider":"google"}}',true);
select public.ca_v2_save_person('extended-a','{"id":"extended-head","name":"Fictional Head","email":"","gender":"Male","dob":"1980-02-29","baptized":"2000-01-01","isElder":true,"isRP":true,"emergencyName":"Fictional Contact","emergencyPhone":"+910000000000","hope":"Other Sheep"}');
select public.ca_v2_save_person('extended-a','{"id":"extended-member","name":"Fictional Member","email":"","gender":"Female","familyHeadId":"extended-head","spiritualStatus":"Unbaptised"}');
select test.assert((select is_elder and is_rp and dob='1980-02-29' and emergency_name='Fictional Contact' from public.publishers where id='extended-head'),'Extended record saved');
select test.assert((public.ca_v2_people('extended-a')->0) ? 'emergencyName','Extended record read contract');
do $$begin
 begin perform public.ca_v2_save_person('extended-a','{"id":"extended-invalid","name":"Must roll back","email":"","dob":"bad-date"}');raise exception 'Invalid date accepted';exception when invalid_datetime_format then null;end;
 if exists(select 1 from public.publishers where id='extended-invalid') then raise exception 'Failed date left a publisher';end if;
 begin perform public.ca_v2_save_person('extended-a','{"id":"extended-head","name":"Must roll back","email":"","familyHeadId":"extended-member"}');raise exception 'Household cycle accepted';exception when invalid_parameter_value then null;end;
 begin perform public.ca_v2_save_person('extended-b','{"id":"extended-cross","name":"Other tenant","email":""}');raise exception 'Other tenant accepted';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'Extended person contract: fields, date rollback, household cycle and tenant scope passed';
