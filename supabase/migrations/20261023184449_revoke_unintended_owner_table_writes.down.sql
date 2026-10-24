-- Restore the previous grants only; RLS still denies writes without a policy.
grant insert,update,delete on public.ca_superadmins to authenticated;
