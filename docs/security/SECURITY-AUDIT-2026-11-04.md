# Security audit — 4 Nov 2026

Two ECC security reviewers read the repository: one covered the database and edge functions, the other the app, the build and the workflows. Separately, the live site and the Supabase API were probed without signing in, using read-only requests only. No Critical or High issues were found.

## Checked live

- Anonymous reads were tried on every table: all are refused (401) or return nothing because of row-level security. The API schema listing is hidden.
- Supabase Auth: email confirmation is required and anonymous sign-in is off. The Email provider is still on, although the app signs in with Google only (`MAGIC_LINK_ENABLED=false`).
- The site is served by GitHub Pages. HTTP redirects to HTTPS. Pages ignores `_headers`, so the only protection is in the page itself:
  - The meta CSP and `no-referrer` are present.
  - The app refuses to run inside another site's frame.
  - There is no HSTS and no `nosniff` header. Pages cannot send them.

## Fixed in this change

`supabase/migrations/20261104120000_security_hardening.sql`, with a down file next to it:

1. **Owner check pinned to Google sign-in.** `apply-migrations.sh` skips `drop_legacy_auth.sql` by default. Older patch files (`fresh-project.sql`, `superadmin-password.sql`) also accept an email-and-password owner sign-in. The migration re-states the Google-only check.
2. **Workspace requests limited per address.** A request is limited to 3 per hour from one IP address. Before this, one script could fill the global cap of 20 per hour and block real congregations from applying.
3. **`get_public_attendance` closed to anonymous callers.** The app no longer uses it, and it returned a whole month of attendance without a rate limit.

## Owner actions

1. Back up the database, then run the migration in the Supabase SQL editor.
2. Supabase → Authentication → Sign In / Providers → turn off **Email**. Google is the only sign-in the app uses.
3. Optional: point the domain through Cloudflare, so the headers in `hosting/worker.mjs` (HSTS, `frame-ancestors`, `nosniff`) reach the live site.

## Open (product decisions)

- **Report links last one year and can cover the whole congregation.** A leaked congregation-wide link exposes all publisher names, and lets anyone overwrite the last three months of reports. Options: a shorter expiry (90 days) or requiring a group or publisher scope.
- **Every role can read the full congregation record.** Publishers can read the congregation's email, notes and billing fields (`congregations_read`). The fix is a reduced view or RPC for non-admin roles.
- **`collaborative-departments.sql` drops the `cleaning` role from the role check** if it runs after `independent-noticeboard.sql`. This is a data-integrity bug, not an exploit.
- **Rate-limit rows are stored even for invalid tokens.** They are purged after 2 days.

## Checked clean

- No secrets are committed: the app holds only the publishable key, and the gitleaks and trufflehog scans run in CI.
- Every security-definer function sets `search_path`, and anonymous callers can run only the token-gated RPCs.
- The edge functions require the service key. Mail has no header injection and push has no server-side request forgery.
- The app has no XSS sinks.
- CSV export guards against formulas.
- Sign-in redirects stay on the site's own origin.
- Sign-out clears local data. The service worker caches no signed-in responses.
- Demo modes use stub data only.
- `npm audit` reports 0 production vulnerabilities.
- Workflows pin actions to commit SHAs and do not use `pull_request_target`.

## Not verified

- The live function definitions and grants. They need a signed-in owner, or the SQL editor: `select prosrc from pg_proc where proname='ca_is_superadmin'`.
- The migration has not been run against a database. There is no local Postgres, and CI does not apply `supabase/migrations`.
