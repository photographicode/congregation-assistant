# Database rollout

The latest user instruction permits SQL updates because the app is unreleased. Inspection nevertheless found 4 congregations and 116 publishers; they are preserved. V2 uses text congregation/publisher IDs to match the deployed schema. The README's illustrative UUID foreign keys would fail against it.

1. Review `supabase/v2-groups-dry-run.sql`: existing group spelling is trimmed, collapsed and case-folded. No publisher is deleted. Existing `service_group` is retained.
2. Apply `supabase/migrations/20261013112323_v2_foundation.sql` transactionally. It creates managed groups, weekend drafts/publications/history, setup progress and import batches; adds publisher `group_id` and weekend role; no plaintext columns are nulled.
3. Run `scripts/check-v2-contract.sql`. Synthetic fixture writes are enclosed in a rollback. Verify row counts and advisors afterwards.
4. Frontend probes `ca_v2_capabilities`. Missing migration yields Update pending; Private remains false regardless.

For a new environment, inject `DATABASE_URL` into your shell from a secret manager, then run `scripts/apply-migrations.sh` for the group dry-run and `scripts/apply-migrations.sh --apply` to apply unapplied files. The script tracks its own ledger; reconcile it with Supabase migration history before reapplying a migration already installed via MCP. No database credentials are committed.

Rollback: retain the frontend's legacy route, export new V2 data, and manually review the `.down.sql` file. It drops only V2-owned data after weekend roles are reassigned. Do not run it without the export. Production destruction is never automatic.

Security: private tables have RLS and no client grants. Reviewed SECURITY DEFINER wrappers use an empty search path, fully qualified tables and server-verified role checks. Only the hashed-token public weekend projection permits anon execute; contact data and private notes never enter its snapshot. Per-token reads are limited to 60/minute. Existing anonymous RPCs still need their broader abuse audit.

Subsequent additive migration `v2_request_preferences` adds versioned congregation settings and server-persisted new request choices. Private selections are interest only. `ca_v2_people` exposes existing login metadata only to verified main administrators. Request-choice fixtures were verified in a rollback transaction. The apply script reconciles existing Supabase migration names before applying a file, preventing reapplication of MCP-installed migrations.

Weekend session exchange and login-revision migrations have also been applied and verified with synthetic rollback tests. Sessions contain no contacts/notes, expire after 12 hours and store only SHA-256 token hashes server-side. Login updates compare the editor's expected list inside the atomic transaction, preventing a stale profile save from silently reversing a newer access change.

## Proposed V2 cutover authentication removal (not applied)

Generated with Supabase CLI 2.120.0: `20261013192548_drop_legacy_auth.sql` and `.down.sql`.

UP requires a reviewed cutover and `SET LOCAL ca.allow_legacy_auth_drop = 'on'`. It removes:

- `congregations.admin_password`: no native password creation/sign-in flow uses it.
- `public.group_access`: shared-password group access is replaced by approved account grants; this table is not native role storage.
- `public.ca_owner_bootstrap_matches(text)`, `public.ca_consume_owner_bootstrap()` and `ca_private.owner_bootstrap`: retire the owner password-bootstrap path.

It also enforces approved Google-only `ca_is_superadmin`, using protected app_metadata and server approval. It never relies on user_metadata. There is no CASCADE; unexpected dependencies stop rollout. DOWN restores empty structures only, with no client grants or password data/authentication restored. It is a schema fallback, not restoration of deleted credentials.

The existing owner script skips this migration with plain `--apply`. Explicit destructive selection is `scripts/apply-migrations.sh --apply --include-destructive`, after all cutover gates pass. No production SQL was applied in this run. The UP/DOWN migration and approved-Google authorization passed in an isolated PostgreSQL 17 fixture, alongside the existing baseline and V2 SQL contracts. Staging/provider acceptance and advisors remain required. Do not run it merely because the front-end build passes.
