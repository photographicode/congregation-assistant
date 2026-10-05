-- Billing state is operator/server controlled, never an ordinary admin preference.
revoke update on public.congregations from authenticated;
grant update(name,email,notes,wipe_requested_at,wipe_device_info) on public.congregations to authenticated;
create or replace function public.update_congregation_owner(p_cong_id text,p_changes jsonb) returns boolean language plpgsql security definer set search_path='' as $$
begin if not public.ca_is_superadmin() then raise exception 'Owner access required' using errcode='42501';end if;
if jsonb_typeof(p_changes) is distinct from 'object' then raise exception 'Invalid workspace update';end if;
if p_changes ? 'id' and p_changes->>'id'<>p_cong_id then raise exception 'Workspace ID is permanent. Create a new workspace for an ID change.';end if;
update public.congregations set name=coalesce(p_changes->>'name',name),status=coalesce(p_changes->>'status',status),trial_days=coalesce((p_changes->>'trial_days')::integer,trial_days),payment_date=case when p_changes ? 'payment_date' then (p_changes->>'payment_date')::date else payment_date end,feature_attendance=coalesce((p_changes->>'feature_attendance')::boolean,feature_attendance),feature_emergency_contacts=coalesce((p_changes->>'feature_emergency_contacts')::boolean,feature_emergency_contacts),feature_oclm=coalesce((p_changes->>'feature_oclm')::boolean,feature_oclm),email=case when p_changes ? 'email' then p_changes->>'email' else email end,notes=case when p_changes ? 'notes' then p_changes->>'notes' else notes end,created_at=case when p_changes ? 'created_at' then (p_changes->>'created_at')::timestamptz else created_at end where id=p_cong_id;
if not found then raise exception 'Workspace not found';end if;return true;end $$;
create or replace function public.get_oclm_public_revision(p_token text) returns timestamptz language sql stable security definer set search_path='' as $$select p.updated_at from public.ca_oclm_publications p join public.congregations c on c.id=p.cong_id where p.token::text=p_token and(c.status='active' or c.status='trial' and c.created_at+c.trial_days*interval '1 day'>now());$$;
revoke all on function public.update_congregation_owner(text,jsonb),public.get_oclm_public_revision(text) from public,anon,authenticated;
grant execute on function public.update_congregation_owner(text,jsonb) to authenticated;
grant execute on function public.get_oclm_public_revision(text) to anon,authenticated;
