# Owner actions

## Launch hardening — 2026-10-23
- Supabase connection rejected metadata/advisor reads with permission denied. Restore project-scoped audit access; run the password-column and RLS queries before approving a production migration.
- Obtain and verify an encrypted full-data snapshot before executing the existing legacy-auth drop migration. Its down path restores structure only. Count populated legacy values without exporting them, then rotate/revoke affected sessions if any exist.
- Confirm removal of the retired `owner-password-session` function after the production audit; remote undeployment remains not verified.
- GitHub Pages → Source → GitHub Actions. The connected app cannot change this administration setting (403); branch publishing can overwrite the native app.
- Turnstile/application delivery endpoint, Cloudflare hosting/headers, DNS activation, support mailbox, real-device tests and independent penetration testing remain unverified. The contact page currently opens an email draft; it is not a server-delivered form.

## Close-blockers production evidence
Run [OWNER-DB-AUDIT.sql](OWNER-DB-AUDIT.sql) in the production SQL Editor and provide results for `docs/qa/PROD-DB-AUDIT.md`. The connected account cannot read even system metadata. Query 7 is conditional; do not export password values. Provider settings, backups/PITR and JWT expiry remain not verified. No production mutation is part of this deployment.
