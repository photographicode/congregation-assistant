-- Permission-only change. Production: reconcile OWNER-DB-AUDIT results and verify
-- an encrypted full snapshot first. No FORCE RLS, policy change or customer-row mutation.
-- The sole intended authenticated policy is superadmins_self (SELECT).
revoke insert,update,delete on public.ca_superadmins from authenticated;
