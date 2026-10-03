# New project connection review — 3 October 2026

Project: `ejosykrxjvwrhxfnputo`, Mumbai (`ap-south-1`), free plan.

- Supabase management connection confirms `ACTIVE_HEALTHY`, PostgreSQL 17.11, ten application tables with RLS, and the active owner `photographicode@gmail.com`.
- Public API verification returned 200 for the schedule RPC with a nonexistent token. Anonymous direct congregation-table access returned 401.
- Google provider settings returned 200 with Google **disabled**. Supabase account login and application Google OAuth are separate configurations.
- No congregation or authentication-user records existed at audit time. Real Google sign-in, the first workspace, and migration of existing records remain unverified.
- `app-config.js` still uses the original backend. `new-project-public.json` contains only the new public URL and publishable key for readiness checks; it does not activate the project.

## Changes applied to this project

The `index_tenant_queries_and_remove_duplicate_select_policies` and `cache_jwt_claims_in_membership_policies` migrations add indexes, cache JWT lookups in policies, and split administrator write policies so SELECT rules are evaluated once. `database-performance.sql` is the reviewed patch source for an existing fresh-project schema. `fresh-project.sql` includes the equivalent definitions for future empty projects; do not rerun it here.

Live SQL contract tests used a transaction that rolled back all synthetic records. They verified owner provisioning, 30-day trials, tenant isolation, role restrictions, stable schedule tokens and updates, public payload filtering, public submissions, revocation, and expiry. Separate owner-policy checks verified an approved owner and denied an unapproved account. These simulate trusted JWT claims in SQL and do not prove Google OAuth works. A subsequent query confirmed zero congregation records remained.

The performance advisor no longer reports missing foreign-key indexes, repeated JWT policy evaluation, or overlapping SELECT policies. It reports unused indexes in this empty project; retain these indexes until actual workload data justifies changing them.

The `preserve_payment_date_when_provisioning` migration fixes a dropped payment-date field in the creation form. Live rollback and isolated contract tests check that the entered date is retained.

## Intentional public functions

The security advisor warns about SECURITY DEFINER functions executable by anonymous or authenticated callers. The narrow public-link RPCs require scoped tokens and keep private-table access revoked. Administrator RPCs check server-side role memberships; the internal token resolver has no public execute grant. These are deliberate privileged interfaces, not a clean security-advisor result. Review future changes against the tested authorization contracts.

Advisor references: [anonymous privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated privileged functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Website deployment

The application and redesigned preview can be deployed through the connected app repository. GitHub rejects writes to `Congregation-Assistant_Public` with HTTP 403, so its original landing page has not been replaced. Enable that repository in the GitHub integration before publishing its prepared redesign.

Enable the Google provider with callback `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`, verify redirect URLs and real owner sign-in, back up current data, then activate the new public configuration in a reviewed deployment. Never publish service-role keys, database passwords, or Google client secrets.
