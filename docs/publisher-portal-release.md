# Publisher Home release

One main app address, approved Google sign-in, and a publisher Home. The administrator chooses an existing publisher and verifies their Google email with the person before approval. Shared accounts are inappropriate: one account in a congregation maps to one publisher. Existing public links remain compatible; they are not required for the new Home.

## Access and data

New publisher APIs derive the publisher ID from a fresh active congregation membership and a confirmed Google identity. The browser never supplies the target publisher ID. Direct publisher/report tables stay restricted by existing RLS. The only congregation-wide data provided is the already published notice-board projection, with names and duties; private drafts and contact records are not included. Contact edits have a five-field allowlist. Appointments, identity, groups, administrative access and sign-in email cannot be self-edited.

Away periods update only that publisher's scheduler availability under the existing OCLM revision lock. Existing assignments, titles, exceptions and publication/history remain unchanged. Saving a stale revision fails and retains the user's entries. Published commitments need direct communication with the overseer. Personal reminder entries save in a private RLS-enabled table through scoped APIs. Backup exports include them; older backups keep reminders for retained publishers.

An attendant form is available only for a currently approved publisher with an independently published attendant assignment in the current congregation week and a meeting today. It accepts one server-resolved date/count, not arbitrary months or attendance history. Removed approval/assignment or publisher access removes this permission. Existing main-admin/attendance workflows remain available to their roles.

## Delivery and installation: prepared, not activated

Google OAuth must be enabled with the existing exact HTTPS redirects. Confirm that Google's Audience allows intended users (not only a testing list), and review brand/consent settings. No shared congregation/publisher passcodes are required in the new flow. Passwordless email and phone OTP need configured senders/SMS providers; none were activated, and no billing was added.

Background push cannot work on every browser/version. iOS/iPadOS requires a supported version and a Home Screen web app with permission. Android support varies by browser, permission, system settings and battery/data restrictions. Browser fallback remains usable. Calendar exports contain generic reminders, not names, custom reminder text, contacts or private links. They preserve congregation time zones through UTC dates; the person must import them into a calendar and allow calendar notifications. Personal titles are shown only inside the signed-in app.

The VAPID private/public key pair, subject, secure worker invocation/schedule and actual multi-device delivery tests are still required. A worker producer is prepared for personal and upcoming published-assignment/duty notifications and checks current grants/transfer status. It does not activate a job, create a subscription or send any message. No notification delivery or complete E2EE is claimed.

## Rollout

1. Run the isolated PostgreSQL permission/recovery tests and Chromium/WebKit publisher/mobile checks; require release acceptance to pass.
2. Apply exactly `supabase/publisher-portal.sql` through a reviewed atomic migration. It creates a private preferences table and narrowly scoped APIs, extends recovery functions, and grants no new direct access to existing private tables. Existing records, links and publication history are not migrated. A private function-definition/row-fingerprint snapshot and before/after preservation guard are included in the deployment artifact.
3. Deploy public app assets through existing GitHub Pages. Deploy the prepared push worker only after its matching queue function exists; missing private configuration leaves it inactive.
4. Verify exact root/staging assets and repeat isolated browser tests against hosting.
5. Administrator pilot: verify a publisher's email, approve access, sign in on two devices, submit/correct a report, set away dates, edit contacts and record an assigned meeting count. Remove access and check server denial. Human Realme/iPhone and older/younger acceptance remain necessary.

Sources: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google), [Apple Web Push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [MDN installation support](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
