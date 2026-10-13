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
