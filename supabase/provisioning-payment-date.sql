-- Preserve the optional payment date entered by Superadmin.
create or replace function public.provision_congregation(p_cong jsonb,p_admin_email text) returns jsonb language plpgsql security definer set search_path='' as $$
 declare c public.congregations;
 begin
 if not public.ca_is_superadmin() then raise exception 'Superadmin access required' using errcode='42501';end if;
 if p_admin_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Administrator email required';end if;
 insert into public.congregations(id,name,trial_days,payment_date,email,notes,feature_attendance,feature_emergency_contacts,feature_oclm)
 values(p_cong->>'id',p_cong->>'name',coalesce((p_cong->>'trial_days')::integer,30),nullif(p_cong->>'payment_date','')::date,lower(trim(p_admin_email)),p_cong->>'notes',coalesce((p_cong->>'feature_attendance')::boolean,true),coalesce((p_cong->>'feature_emergency_contacts')::boolean,true),coalesce((p_cong->>'feature_oclm')::boolean,true)) returning * into c;
 insert into public.congregation_access(cong_id,email,role) values(c.id,lower(trim(p_admin_email)),'admin');
 return to_jsonb(c);
 end $$;
