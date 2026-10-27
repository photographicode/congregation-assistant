# V4 additive production schema verification

Verified 2026-10-26 using the connected Supabase project `ejosykrxjvwrhxfnputo` (Congregation Assistant). The owner authorized V4 implementation and deployment and confirmed existing records are fictional. No records were erased.

Before applying the migration, metadata confirmed the two V4 tables and contact trigger did not exist. The additive migration creates new private tables, five scoped APIs and a contact-update trigger; it does not replace existing RPCs or rewrite existing rows. Existing schema was inspected, and the migration and rollback/reapply passed isolated lifecycle/role tests twice before production application. This is not a full-data backup or a full production audit.

The migration application returned success. A fresh production metadata read confirmed:

- `ca_private.v4_announcements` and `ca_private.v4_contact_notifications`: RLS enabled, no SELECT privilege for anon or authenticated.
- All five `ca_v4_*` APIs: empty search_path, authenticated execution granted, anonymous execution denied. Function bodies enforce signed-in Google identity and explicit active congregation membership; writes/inbox require the Main Admin role.
- Exactly one enabled `v4_publisher_contact_changed` trigger exists.

The isolated role matrix passed 1776/1776 cases across 111 functions and 16 actors. V4 tests additionally exercise successful publishing/archiving, publisher reads, cross-tenant denial, revoked membership, contact no-op/stale changes, one notification per actual contact edit, and time away without approval.

Advisor output remains nonzero: private RLS tables without policies (intentional no-direct-grant design), generic reviewed SECURITY DEFINER RPC warnings, and leaked-password-protection configuration. New private tables have no client grants; their role-checked RPCs follow the existing repository contract. This report does not describe the whole database as independently audited or warning-free.
