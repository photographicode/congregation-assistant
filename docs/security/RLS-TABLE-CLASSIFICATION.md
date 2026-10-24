# Exposed-table access classification

24 October 2026. This is the repository/isolated PostgreSQL contract, **not production evidence**. Production remains unverified until owner audit results arrive. `scripts/check-rls.sql` verifies enabled RLS, non-bypassing client roles, zero anonymous table privileges, authenticated CRUD grants backed by operation-specific policies, and no client privileges on internal-schema tables.

| Public tables | Intended authenticated policy / use |
|---|---|
| ca_superadmins | SELECT own approved owner identity only; direct INSERT/UPDATE/DELETE revoked. |
| congregations | Scoped workspace read; owner-only provisioning/update/delete policies. |
| congregation_access | Admin management; an authenticated user can read their own active membership. |
| publishers, reports | Scoped field-service management; exact-group read policy for group overseers. |
| meeting_attendance | Attendance-role/admin management within one congregation. |
| wipe_requests | Congregation administrator management. |
| ca_public_links | Administrator management; anonymous consumers use scoped RPCs, never table reads. |
| ca_oclm_publications | OCLM-role management; public consumers use the publication RPC. |
| ca_oclm_workspaces, ca_oclm_assignment_events, ca_oclm_publication_history | OCLM-role scoped SELECT; writes through authorized definer RPCs. |
| ca_meeting_settings, ca_meeting_calendar, ca_memorial_attendance | Scoped attendance-role policies. |
| service_groups | Scoped SELECT policy; mutations through group-management RPCs. |

These sixteen public tables are intentionally exposed through tested scoped policies. Internal queues, pool/workspace helpers, private action records and migration ledger live in `ca_private`, `ca_ap_private`, `ca_migrations` or `private`; direct client table privileges are prohibited. The catalog gate rejects new unprotected tables or grants; a policy's existence alone is not proof of tenant isolation, so the existing cross-tenant/role acceptance SQL remains required.

FORCE RLS is not enabled by this change. Isolated definer/table owner is postgres with BYPASSRLS; production owner bypass flags cannot be inferred from that fixture. FORCE does not replace RPC authorization or grant review.

Observed/fixed: `ca_superadmins` had authenticated write grants with only a SELECT policy. `20261023184449_revoke_unintended_owner_table_writes.sql` revokes those three grants; down restores their structure. Up ran twice successfully, down restored the exact failing gate, and the corrected fresh schema plus full existing database acceptance suite and current catalog gates are tested separately. No row mutation is part of this permission migration. Production execution is deferred until the owner's audit and verified encrypted snapshot.
