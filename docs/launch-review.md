# Congregation Assistant: launch review — 5 October 2026

This is a working release review, not a promise that every device or security threat has been tested. Software: congregation-assistant. Website: Congregation-Assistant_Public.

## Decision on JW.org / WOL content

Automatic collection: **FALSE / disabled**. [JW.org Terms of Use](https://www.jw.org/en/terms-of-use/) prohibit commercial redistribution of its content, distributing tools built to scrape it, and including its text in applications outside the stated exceptions. The exception for certain freely distributed, noncommercial downloads does not establish permission for this paid software. A competitor's importer does not grant us permission. This is a terms-based implementation decision; whether a particular short title attracts copyright is a separate legal question.

Bundled weekly workbook titles have been removed. No scraper has been added. Obtain explicit written permission before adding an automated commercial feed. Do not advertise manual copying as a licensing workaround. S-140 is a user-supplied reference for a locally implemented presentation; its supplied file is not redistributed. Existing embedded S-3/S-88 form templates also need redistribution permission verified, or replacement with independently designed exports, before paid launch.

## Repairs in this release

| Finding | Repair / evidence |
|---|---|
| OCLM roster disconnected from publisher database | Limited server RPC returns names, IDs, gender and Elder/MS flags only. It does not expose phone, address, emergency contacts or reports. Existing scheduler identities and qualifications are retained. Removed roster members are archived for history. |
| Publisher view requires choosing a week | S-140-style published cards; one name search across all published weeks, including assistants and additional duties; songs, opening/concluding comments and auxiliary classroom shown. |
| Group overseer lacks bulk entry | Atomic own-group save RPC; mixed-group, cross-congregation and revoked-access writes rejected in rollback tests. |
| Congregation admin can change billing/trial fields | Column permissions restricted; privileged owner RPC handles controlled changes. This is not yet a payment gateway or automatic annual expiry. |
| Password-auth owner accepted by backend | Owner authorization now requires Google in trusted account metadata and an active owner grant. A password session cannot acquire owner rights, even with Google listed among linked providers. |
| Unchanged public schedules repeatedly download snapshots | Lightweight revision check; fetch full schedule only when revision changes. Withdrawn links clear displayed assignments. |
| Large workspaces silently lose rows | Ordered page loading; incomplete/duplicate page responses fail visibly instead of caching a partial result. |
| Normal UI exposes backend setup instructions | Removed role-setup note and SQL instructions from public-link errors. Operator setup stays in documentation. |
| Duplicate mobile settings/menu | Top shortcut becomes How to use; bottom Menu handles navigation/settings. |
| Missing reporting-period labels | Explicit accessible names for dashboard and attendance selectors. |
| Attendance controls overflow | Controls wrap; narrow statistics cards stack; verified again at original failing widths. |
| Weak contrast | Attendance save button, scheduler badge, navigation labels and light/dark-theme controls corrected. |
| Tiny website mockups | Large task screenshots with Desktop/Tablet/Phone selector; fictional demo data only. |

Final acceptance run 37350234721 passed 55 regression checks, three cloud-conflict checks, encrypted recovery checks, browser/PDF/database contracts and all 504 theme/viewport/text-mode accessibility cases with zero overflow or WCAG findings. Earlier failing layouts and contrast findings were repaired. Representative test coverage does not establish compatibility with every device.

## Verification scope and remaining tests

Representative Chromium/WebKit matrix: widths 320, 375, 390, 430, 768, 820, 1024, 1440 and 1920; seven themes; dashboard, publishers, attendance and OCLM. Browser acceptance also covers analytics, emergency exports, navigation, dialogs, 1,000-record pagination, rejected saves, retry/undo, public publishing, withdrawn schedules, role combinations and sign-out. PDF checks generate S-21, S-3, S-88 and multi-page emergency examples, checking page bounds and the tested S-3 header positions.

Automated accessibility checks do not prove that every button, settings dialog, native browser version, assistive technology or printer is correct. Still required: physical Android/iOS devices and tablets; TalkBack/VoiceOver/NVDA; 200% text zoom; non-Latin PDF fonts; long congregation/publisher names on all fields; real printer output; calendar timezone/DST edge cases; new privileged settings and request forms; larger concurrent workloads. Keep scope and failed cases in artifacts. Fix critical failures before release; prioritize usability findings before accepting payment.

## What pilot verification means

Use a small congregation without depending on the software as its sole record. Prove: Google login → correct roles → save records → assign/review/publish → independent live link → edit without changing publication → rejected save preserves data → logout/revocation blocks private access → restore a backup.

Real Google sign-in records are observed for all three nominated identities. Two-congregation/role isolation is tested using their real user IDs with trusted authenticated claims and rolled-back data; this is not an interactive browser test on behalf of those people. Browser acceptance uses isolated data and never writes real reports. Two real Google accounts in two test congregations, actual sender delivery and a real backup recovery rehearsal remain distinct launch gates. A successful simulated pilot is valuable evidence, but it cannot honestly be relabeled a completed real congregation pilot.

## Security in plain language

Google checks who you are. The database checks which congregation and job you may use on every protected request. Hiding a tab is not the security boundary. OCLM gets a limited list of names; a group overseer cannot edit another group. Public links share only the approved content and work for anyone who receives the link, so treat them as private invitations and withdraw/rotate leaked links. Private keys stay on the server; public configuration keys do not grant database access by themselves.

Traffic uses HTTPS; access restrictions are enforced on the server. This is not end-to-end encryption and no software can promise zero risk. Sign-out clears account sessions and cloud-record caches. OCLM device drafts remain on the device for recovery: use your own secured device, not a shared kiosk, and do not describe those drafts as encrypted. Exports and imported calendars need separate care. Enable Google two-step verification for administrators. Collect only needed data, document retention/deletion, and test restores.

The unused legacy configuration is archived and secure production is active. Shared draft conflict checks and publication/assignment history are implemented. Priority security/operations backlog: broader audit logging for grant/deletion changes; MFA policy for admins; provider rate limits/captcha if anonymous requests are introduced; dependency/CSP hardening and removing runtime CDN reliance; annual entitlement expiry/refunds; scheduled backups and restore drills; incident contacts and data-processing/privacy terms. Rotate the OAuth client secret previously shared in chat privately.

Supabase security advisors flag intentionally exposed security-definer RPCs. These need explicit grants, fixed search paths and role/token checks (not blanket suppression). Leaked-password protection is also reported disabled: [Supabase remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Secure-workspace users now use Google. The unused legacy backend is retired from software configuration; its former configuration is archived.

## Request, email and account workflow

1. Visitor uses **Request with Google** on the website. Google verifies their email.
2. They enter the congregation name and confirm authorization. The server saves one request per account and immediately shows a reference. The acknowledgment is queued once.
3. Owner reviews pending requests, checks authorization and assigns a congregation ID using the existing workspace-creation flow.
4. Provisioning the main-admin grant approves a matching request and queues a welcome message with workspace URL and guide.
5. Main Admin / Secretary approves Google accounts and combines Service/OCLM/Attendance responsibilities as needed. Assistants retain section/group restrictions.
6. Main admin may enable congregation email notices to an already verified main-admin address. Publication alerts and scheduled first-of-month service-report / weekly OCLM planning and scheduled attendance/form reminders contain tasks, not publisher records.

Delivery worker is deployed with JWT validation and an additional service-role check; ordinary users cannot run it. Its private outbox uses deduplication, concurrent claim leases, bounded retries and delivery receipts. Provider timeouts can still produce a duplicate email if the provider accepted a message before the acknowledgment was lost; do not claim exactly-once delivery. Failed jobs require monitoring. Sender activation and scheduling are pending; queued does not mean sent.

See [email activation](email-activation.md). Brevo's current [free plan](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) allows 300 sends/day. Our worker conservatively limits claims against a 250/day budget; upgrade sender service only when usage/delivery needs justify it. No paid provider was purchased.

## Payments and price

Recommend **one plan**, all core features, ₹1,499/year maximum, 30-day trial, no automatic trial charge. Avoid hiding essential security, backups or accessibility behind Premium. Explain the renewal date and include clear receipts, cancellation/refund terms and a support route.

Razorpay is not activated. Required implementation after merchant/KYC and private test credentials: create the ₹1,499 INR order on the server; verify captured payment/order/amount/currency; validate webhook HMAC over the raw body; handle duplicates/out-of-order events; set a server-owned annual expiry; send receipt and renewal reminders; handle refunds/disputes without trusting a browser-paid flag. [Razorpay webhook requirements](https://razorpay.com/docs/webhooks/validate-test/) and [current pricing](https://razorpay.com/pricing/) should inform the real fee/tax budget. Browser redirects are not proof of payment. Do not accept paid customers until entitlement and recovery gates pass.

## Capacity and when to pay Supabase

Measured secure project before this release: about 12 MB database; one congregation, two Auth users, no production publishers/reports. This is not a capacity benchmark.

[Current Supabase pricing](https://supabase.com/pricing/): Free has 500 MB database, shared compute, 5 GB uncached egress, 1 GB storage, 50,000 MAU and no automatic backups; inactivity can pause it. Pro starts at $25/month and includes 8 GB DB, 250 GB egress and daily backups retained seven days. Upgrade **before paid production with real records**, primarily for recovery and operational continuity.

No honest tested congregation ceiling exists yet. Use conservative initial batches of 5–10 congregations and measure database growth, egress, p95 request latency and errors before expanding. Estimate capacity from the smallest resource budget: remaining DB / measured bytes per congregation; remaining monthly egress / measured traffic per congregation; concurrency benchmark. Keep at least 30% headroom. A high MAU allowance does not mean the shared database supports that many congregations. Public polling/download traffic can become the limit before storage.

For budgeting, divide actual monthly hosting + email + domain + support costs by net monthly revenue per congregation (₹1,499/12 before fees/taxes). Use current exchange rates and merchant charges; do not promise profit from gross revenue alone.

## Competitive priorities

See [competitor review](competitor-review.md). Organized is a substantial free alternative with a modern UI, roles, offline access and many workflows; claims that all competitors have poor UX are unsupported. NW Scheduler/NW Publisher, Hourglass, TerritoryHelper and specialized tools serve different workflows.

Our immediate value: clear role-specific tools, simple setup, easy name search, hierarchy of additional duties, useful recovery messages, readable mobile controls and responsive help. Shared OCLM drafts, availability and conflict warnings are now implemented. Next product work: assignment acknowledgment, weekend public-talk workflow, multilingual accessible exports, operational monitoring and real restoration drills. Territory mapping is a later dedicated scope. Avoid adding every competitor feature before reliability is proven.

## Paid-launch gates

- Independent permission or replacement for distributed copyrighted form assets/content.
- One authoritative secure production deployment (now verified); unused legacy retirement documented, with no record migration required.
- Two real congregation/account checks and small real congregation pilot.
- Actual email acknowledgments, welcome/reminder delivery and failure monitoring.
- Tested annual entitlement, captured-payment webhooks, receipts and refunds.
- Backups and an actual restored-workspace check; documented retention/deletion/incident response.
- Physical-device/accessibility review and final release artifacts passing.

Do not quote a precise completion percentage from these findings. Core workflows are substantially implemented; earning readiness remains blocked by the concrete gates above.

## Secure shared-workspace release (5 October 2026)

Owner confirmed the legacy project is unused. Retain its former configuration in `archive/` and Git history; no legacy database export was available through this connection. Secure production targets `ejosykrxjvwrhxfnputo`. Verified Google provider sign-ins exist for all three pilot identities. Two separately approved pilot congregations are provisioned; server role checks allow each main administrator only its own pilot and deny the other. Owner remains SuperAdmin only. Actual browser workspace selection and logout by the testers remain the pilot acceptance step.

Shared scheduling now uses congregation-scoped private drafts, optimistic revision checks, assistant access, per-week publishing, immutable publication versions and rollback. The old whole-device publication RPC and direct authenticated publication writes are revoked. Keep a recovery copy when a draft conflict occurs; do not force an overwrite. Qualifications have explicit exceptions, away periods prevent suggestions, and completion is deliberately recorded rather than inferred from a date. Reviewed monthly JSON programs support varied parts and durations; no scraping or copyrighted workbook library is included. Public S-140 schedules use per-week program/duty metadata and name search.

Ordinary publisher accounts are bound to one same-congregation publisher ID, have no roster/report-table browsing rights, and use narrow personal-home and own-report RPCs. Main admin Home identifies next tasks. Larger-text mode is included in the expanded 504-case accessibility matrix. Encrypted workspace exports use AES-GCM with PBKDF2-SHA256 (600,000 iterations); the password is never sent to the server. Restore is one transaction, checks an intervening-change fingerprint, validates congregation ownership and retains billing, account grants and stable live tokens. Existing server publication history is retained with a new restoration version; backup files also include history for operator recovery. Browser-local reminder preferences are device settings and are not a full database backup. Disaster recovery of the entire Supabase project still requires operator backups (Pro before paid personal-record use) and a real operational restore rehearsal.

Private Web Push queues/workers are prepared for published assignment changes/cancellations, role reminders and owner notices. VAPID private configuration, private worker scheduling and real closed-app delivery remain activation requirements. Transactional email likewise requires a verified private sender and scheduler. Neither is advertised as delivered while unconfigured. No service-role credential, signing key or OAuth client secret is public. Browser notifications are opt-in and best effort, with generic text.

Paid launch remains gated by the actual congregation pilot, operational backup monitoring/recovery, official-form redistribution permissions, and server-verified Razorpay merchant/webhook setup. Preserve the ₹1,499 annual ceiling and avoid a security feature paywall. Do not equate automated fixture tests or Google-provider sign-ins with completed end-to-end human pilot acceptance.
