# Production audit access — 24 October 2026 (Asia/Kolkata)

The connected Supabase tool rejected queries 1 (RLS metadata) and 2 (role bypass flags), the security advisor request and Edge Function listing with `You do not have permission to perform this action`. Repeating queries 3–6 through the same denied project permission cannot establish evidence; the conditional value count was not run. No SQL mutation or remote function deletion was attempted.

`OWNER-DB-AUDIT.sql` preserves all requested read-only queries. The owner can run them individually in the production dashboard and provide results. Do not create `PROD-DB-AUDIT.md` or mark production controls verified until actual results exist. Provider settings/backups/JWT expiry and the deployed retired function remain unverified. Remote deletion requires the owner's explicit confirmation under the new orders.
