# Security audit — 6 Nov 2026

Four review agents read the code in parallel: payments and edge functions, database, frontend, and silent failures. The live project was probed with anonymous, read-only requests. No form was submitted and no live data was changed.

## Live state on 6 Nov

- Anonymous reads of `congregations`, `congregation_access`, `publishers`, `reports` and `ca_public_links` are refused (401).
- None of the 4–6 Nov migrations has been run yet. Their functions do not exist on the live database.
- The Razorpay edge functions are not deployed (404). `transactional-mail` refuses calls without the service key (403).
- `npm audit --omit=dev`: 0 vulnerabilities. No secrets found in tracked files.

## Fixed in this change

### Payments (edge functions and payment screen)

| Finding | Fix |
| --- | --- |
| If saving a new payment link failed, the link stayed live. A payment made through Razorpay's emailed link was then never matched to a congregation. | `razorpay-link` cancels the link when it cannot be saved, and logs the link if the cancel also fails. |
| Paid events for an unknown link, or with an unexpected shape, were acknowledged without a trace. | `razorpay-webhook` logs both with the link and payment ids. |
| `razorpay-verify` told the payer "it will update automatically" for a link the database did not know. | It now returns 409 and asks the payer to email support with the payment reference. |
| The signed return from Razorpay was removed from the page before the check finished. A failed check could not be retried. | The return waits in the tab (`sessionStorage`) until the check succeeds. A **Check payment again** button retries it. |
| Database error text could reach the browser for permission and rate-limit errors. | Fixed messages. A missing account email is refused clearly. |
| The server accepted any `https://` payment page address. | Only `rzp.io` and `*.razorpay.com`, the same rule the browser applies. |
| The webhook read the whole request before checking its size. | Requests over 100 KB are refused from the `Content-Length` header first (413). |

### Database (migration `20261106090000_security_followups.sql`)

| Finding | Fix |
| --- | --- |
| Re-running an older root `.sql` file replaced a rate-limited public function with its unlimited original. Re-running the rate-limit migration did not repair it. | The migration re-wraps any of the eight rate-limited functions whose body has lost its rate check. It is safe to run again after any older file. |
| `get_public_attendance`, `submit_public_attendance` and `ca_v2_public_weekend` were still callable without a rate limit. Each `ca_v2_public_weekend` call left a row that was never cleaned up. | Execute is revoked from everyone; the app does not call them. Rows older than two days are deleted. |
| A scoped report link could be widened to the whole congregation by an update. | The trigger also runs on update. It blocks widening. Older congregation-wide links can still be updated until they are replaced. |
| There was no quick way to tell whether the live database had drifted back. | `select * from ca_private.security_selfcheck();` lists problems. No rows means all is well. |
| `supabase/superadmin-password.sql` re-opened password sign-in for the owner if anyone ran it again. | The file now refuses to run. |

### App

| Finding | Fix |
| --- | --- |
| Signing out cleared edits that had not reached the server yet, without warning. | Sign-out sends queued edits first. If any remain, it asks before deleting them from the device. |
| Source links (`sourceUrl`) from meeting data were rendered without a scheme check. A stored `javascript:` value would have run. | Only `https:` links are rendered (`apps/web/src/features/safe-url.ts`). |

### How the fixes were checked

- **PGlite (in-memory Postgres):** loaded `fresh-project.sql` and the 3–6 Nov migrations. Then:
  - A public function was overwritten the way an old file does it. The self-check reported it.
  - The new migration restored the rate limit and the function still answered. Running it twice changed nothing.
  - Widening a scoped report link was refused, and a legacy congregation-wide link could still be updated.
  - The down file restored the insert-only trigger and removed the self-check.
- **App:** `npm run check` (lint, types, unit tests), the strict-type and lint ratchets, the CSS audit and the build all pass.

## Still open

| Area | Issue | Risk |
| --- | --- | --- |
| Rate limits | `ca_private.client_ip()` trusts the first `X-Forwarded-For` entry when `cf-connecting-ip` is missing. A client could then pick its own address and avoid the per-address limits. Whether Supabase always sets `cf-connecting-ip` is **unverified**. | Medium |
| Rate limits | When a wrapped function raises (for example "Invalid link"), the whole transaction rolls back, including the rate-limit counter. Failed token guesses are not counted. Tokens are random UUIDs or 64 hex characters, so guessing stays impractical. | Medium |
| Sign-in | `ca_google_identity()` in `fresh-project.sql` and `google-access.sql` accepts `providers ? 'google'`; `publisher-home.sql` accepts only `provider='google'`. If a password account is later linked to Google, the looser check may let the password session in. Turning off the Email provider in Supabase closes this. | Low, until Email sign-in is off |
| Headers | GitHub Pages cannot send HTTP headers. The meta CSP keeps `style-src 'unsafe-inline'` and cannot set `frame-ancestors`. Clickjacking is blocked only by the app's JavaScript frame guard. | Low |
| Offline edits | The plain store treats every error other than conflict or permission as "retry later". A permanent error retries forever and blocks later edits to that record. | Medium (data, not security) |
| Mail | `transactional-mail` retries failed sends with no logged status and no retry cap. A successful send with an unreadable reply is sent again. | Low |
| App | `capabilities()` turns every error into "database update required", which hides network or permission problems. | Low |
| Owner console | Before `20261104130000` runs, the console falls back to reading the `congregations` table directly. Remove the fallback once the migration is live. | Low |

## Owner actions, in order

1. Back up the database.
2. In the Supabase SQL editor, run these in order:
   1. `supabase/migrations/20261104120000_security_hardening.sql`
   2. `supabase/migrations/20261104130000_audit_followups_territory_requests.sql`
   3. `supabase/migrations/20261105090000_razorpay_payments.sql`
   4. `supabase/migrations/20261106090000_security_followups.sql`
3. Run `select * from ca_private.security_selfcheck();`. No rows means the checks pass. Run it again whenever you run an older `.sql` file.
4. In Supabase, go to **Authentication → Sign In / Providers** and turn off **Email**.
5. Razorpay stays off until you follow `docs/billing/RAZORPAY-SETUP.md`.
