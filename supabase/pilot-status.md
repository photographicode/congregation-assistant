# Pilot verification — 4 October 2026

The pilot is not ready for congregation use yet. No staging deployment or actual Google sign-in was verified in this session.

## Verified

- The connected new project `ejosykrxjvwrhxfnputo` is ACTIVE_HEALTHY.
- A live publishing defect rejected valid week keys because the deployed regular expression was overescaped. Migration `preserve_valid_published_week_keys` replaces it with explicit digit classes. `fix-published-week-filter.sql` records the replacement and the fresh schema uses the same filter.
- `scripts/check-staging-contract.sql` passed on the live new project, using simulated Google JWT claims and two synthetic congregations. It covers tenant isolation, cross-tenant writes and publishing, field-service and attendance restrictions, owner provisioning, payment-date retention, stable updated public snapshots, privacy filtering, public submissions, revoked links, disabled memberships, provider rejection, and trial expiry.
- All SQL fixtures rolled back. A subsequent query confirmed zero congregations, auth users, and schedule publications, and removal of the test helper schema.
- The checked-out app passes **34** command-line regression checks, including publishing failure recovery and absence of a shared browser Superadmin password. The reported 42 checks were not reproduced here.

## Staging artifact

Run `node scripts/prepare-staging.cjs`. The deployment includes the generated files at the separate `/staging/` path. Its deployment still requires verification. Its `app-config.js` selects the new backend and `secureBackend: true`; the main app configuration remains on the legacy backend. `verification-manifest.json` records file hashes and explicitly marks deployment and OAuth unverified. No privileged keys are included.

After choosing the staging URL, add its exact URL to Supabase Authentication redirect URLs. Follow `google-sign-in.md` to configure the Google provider and callback. The database connector cannot configure OAuth or perform an interactive Google account sign-in. Current provider state could not be rechecked from this executor because its HTTP proxy was unreachable; the last recorded state was disabled.

Use two Google test accounts assigned to separate test congregations. Check direct API reads and insert/update/delete attempts with each actual JWT, then disabled membership and an unapproved account. Run scheduling → review → publish → open live token link, republish at the same link, and a rejected publish that preserves the previous publication. Verify mobile and desktop readability, obvious actions, visible errors, expired-session recovery, and reload behavior.

## Public repository connection

Target: https://github.com/photographicode/Congregation-Assistant_Public

The earlier branch creation attempt returned **403 Resource not accessible by integration**. After the connection was updated, actual branch creation and commit writes succeeded on 4 October. The public redesign is tracked in pull request #1.

In GitHub Settings → Applications → Installed GitHub Apps, configure the app used by this ChatGPT/Codex GitHub connection. Include `Congregation-Assistant_Public` in its repository selection and grant the required repository Contents read/write permission if supported. Reconnect the GitHub connection if it remains read-only. Then verify branch creation and publish the prepared `public-site-preview` files through a reviewed pull request. That preview already points to the application's GitHub Pages URL. Do not advertise the pilot as ready until actual authentication and deployment checks pass.

## Remaining release gates

- Local browser acceptance failed at HTTP server startup with `EPERM`; no desktop/mobile result is claimed. Outbound HTTP also failed because the configured proxy was unreachable. Live frontend asset hashes were not checked.
- Basic/Standard/Premium are not defined or enforced in the reviewed schema. Current authorization checks membership roles and trial/active status; feature flags do not establish paid-tier enforcement. Define the tier feature mapping and verify server-side denials before Razorpay integration. The annual price remains ₹1,499.
- The security advisor still warns about deliberately callable privileged RPCs. The rollback suite checks several authorization boundaries; it is not a clean security audit. References: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.
- Complete the small congregation pilot and resolve critical issues before paid launch. Legacy backend authorization remains unaudited.

The authorized publication includes the safe-area adjustment for mobile notifications and browser assertions for notification overlap and duplicate public preview tabs. Real-account OAuth remains a separate acceptance gate.

## Role reminders and scoped group overseers — 5 October 2026

Secure backend adds `group_overseer` with a required exact group name. Live rollback tests verified other-group/other-congregation denial, report/attendance link scope, denied edits and immediate revocation. The permission helper's authenticated SECURITY DEFINER advisor warning is intentional: it checks the current Google identity, active membership, congregation status and exact group, returns only a boolean, uses an empty search path, and denies anonymous execution. Other prior public-link advisor warnings remain under the existing narrow token contracts.

Personal reminder settings are local to an account/congregation/device. Reminders are opt-in; weekly OCLM prompts target three weeks ahead, attendance/form-sharing days and times are configurable, and service reports/form sharing repeat on the 1st. Calendar export supports closed-app alerts after import and permission checks. Automatic server push and messages remain unconfigured. This does not verify OAuth or turn the legacy backend into the secure pilot.
