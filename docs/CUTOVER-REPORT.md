# V3 resume checkpoint — 17 October 2026

The owner authorized public GitHub deployment to both repositories. This checkpoint publishes the native app and updated site for inspection; it is **not full V3 parity sign-off**. The prior report below is historical. Both repositories are now public; the frozen `v1-final` tag is preserved. The supplied S-140 reference is ignored and no S-89 source image is committed.

Verified locally: lint/strict TypeScript and unit suites; existing legacy checks; production builds and bundle safety; 17 existing golden PDF parity/contract fixtures; eight Indic scripts; S-89 long/Indic names and three settings/two copies; 60 requested-screen layout views at 320/390/768/1024/1440 × 100/130/200%; zero assistant parsing/preview/cancel requests, no prompt-history writes; real Chromium offline deep-link/draft reload with exactly one reconnect write. Local SQL fixtures verify role/tenant boundaries, SFTS restore, report stale-preview protection and approved pools for all departments. The old cutover browser harness still assumes the prior navigation/greeting structure and fails its initial selector; the new V3 matrix is separate evidence, not a claim that this old harness passed.

Production: SFTS, confirmed-report and the reduced meeting-workflow helpers are now applied. Automatic review initially rejected the broad migration; removing the department-function replacements produced an accepted, narrower rollout. Existing department approval enforcement is unchanged. New attendance, scoped-group and setup helpers have authenticated-only execution and an empty search_path, verified from production metadata. The attendant form, group-overseer link controls and setup/calendar connection are enabled. No destructive migration or history rewrite was performed.

Official-source import: GitHub CI run 39039306671 returned HTTP 400. No real week has been published; app/site retain Add parts fallback and reviewed local-file import. The real mwb/w fixture tests skip explicitly until private EPUB fixtures are supplied. Real official-publication parser fidelity therefore remains unverified. The nine supplied themes are unchanged; strict raw-gradient contrast still reports 22 Lagoon/Aurora combinations. All four OCLM contrast combinations pass.

Expanded resume work still open: SFTS type/free-label; editable per-part rules and all three classroom/counselor workflows; range/shuffle assignment; complete S-140 reference layout including songs and two-week imposition; S-89 bulk queue/status/acknowledgment/reminders and hosted one-time links; duty monthly limits and group cleaning rota; attendance meeting windows/date fallback/audit/offline writes; group QR/rotate/revoke and real Turnstile acceptance; all additional assistant intents, ambiguity/Undo beyond report/export; Starter/Complete entitlement rollout and verified alternative comparison. These are not advertised as shipped functionality.

Physical-device, real WhatsApp, real Razorpay, OAuth callback acceptance and custom-domain DNS are unverified. GitHub Pages cannot set the Cloudflare HTTP headers. CNAME is withheld until DNS confirmation. Deployment run results and live URLs are recorded in V3-PROGRESS.md.

---

## Historical checkpoint report

# Native V2 revival report — 15 October 2026

**Release blocked.** Existing main/V1 remains deployable and is not replaced by this branch. The frozen reference is `v1-final` at `76978c4fbe56658b8b856cb7218b5c4a212cd1f0`. No V1 source is deleted before native parity proof. The owner-only Sites candidate is separate from the public release; the repository remains private.

## Review candidate

[Open admin review](https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=admin), [publisher review](https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=publisher), [owner console](https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=owner), [website](https://congregation-assistant-review.cherryshore32.chatgpt.site/site/). The owning ChatGPT account is required. Demo records are fictional and browser tests reject all Supabase requests. A dedicated interactive virtual-screen tool is unavailable; local Chromium screenshots and the hosted review provide inspection.

## Implemented scope

- Native reports/attendance and midweek replace V1 hand-offs in the candidate. People include household/emergency/spiritual/appointment fields. Groups/weekend/setup use additive server contracts.
- Own-account/congregation-scoped appearance profiles, revision-checked explicit saves and administrator-controlled congregation/publisher defaults. SQL isolation/concurrency and fictional browser controls pass; real cross-device login acceptance remains open.
- Real Home repositories, congregation-timezone previous month, KPI drill-down, searchable submission status, direct bulk launch and user-initiated reminder sharing. Calm/Balanced/Lively and fine-tuning, theme gallery, eight reusable SVG scenes, safe reduced-motion behavior and grouped tool shortcuts.
- Native report bulk selection, identity/month-reviewed CSV import, formula-safe CSV export and service-year/pioneer logs. Assigned-group saving uses the established group RPC. Real group isolation/concurrency acceptance remains open.
- Emergency Contacts search/households/phone links/contact CSV and direct PDF selection. Native owner directory/create/edit/billing, request review, mail queue health and account grants; deletion/notices/module toggles are not complete.
- Real original PDF templates for S-21/S-3/S-88 plus emergency and schedule formats. Seventeen V1 golden fixtures and eight Indian scripts tested. Exact template hashes, selectable text and page geometry match; deliberate embedded Latin font differences require the documented visual tolerance and owner review. No pixel-identical claim.
- Account sessions, subscription lock and expired-admin export tested against isolated PostgreSQL. Native records archive includes V2 metadata but is distinct from the legacy recovery/restore format.
- Separate app/site artifacts, trust pages, strict Worker headers, Cloudflare deployment scripts and DNS/mail preflight. Actual custom-domain deployment is not complete.

## Evidence and limits

The current suite has 83 unit checks including fourteen theme contrast sets, plus TypeScript/build/bundle checks. Six desktop/phone dashboard cases pass for styles, filter drill-down, bulk launch, persistence, axe and zero demo cloud calls. Owner browser cases and report bulk/CSV/year/group-demo tests pass. A targeted 32-screen layout run passed; the complete expanded matrix, physical devices, CPU/FPS and Lighthouse gates remain open. See dated JSON evidence in `docs/review-evidence`; CI configuration is not evidence of a completed CI run.

The brief says 109 handlers but explicitly names 104 actions after expanding slash-grouped names. The frozen-tag inventory reports those 104; nine measured desktop actions pass in at most two clicks, five password actions are intentionally replaced, and 90 still need acceptance. This does not meet whole-product reachability. All `v2.screen.*` release flags remain false until complete acceptance.

Thirteen ordered additive migrations are in `supabase/ALL-V2.sql`, tested twice on an isolated baseline. The full rollback file is deliberately guarded: complete shared-function reversal is not implemented. Existing individual historical downs are not a safe complete rollback. Production destructive legacy-auth deletion was not applied. Previously tested additive migrations were applied to the connected Supabase project; the combined file does not need to be blindly reapplied.

## Remaining work and external dependencies

`docs/PARITY.md` is authoritative for native gaps: AP mapping/revoke, complete scheduler/public history/rollback, attendance calendar/attendants, announcements, reminders/push, wipe/transfer, complete restore, experience widgets, full publisher portal and security/device/performance acceptance. E2EE claims and optional official-content import remain disabled.

Cloudflare/GoDaddy/Titan credentials and actual assigned DNS/DKIM values are unavailable. No nameservers, MX/SPF/DKIM/DMARC or OAuth configuration were changed. No transactional test email was sent. Deployment scripts report a successful skip when Cloudflare secrets are missing; that is not a deployment. Repository source is pushed on `v2/cutover`; no cutover PR is opened/merged while repository release gates fail.

Four dashboard-counter fixtures were captured by executing the original frozen V1 renderDashboard with synthetic snapshots; native counters match all four, including pioneer precedence, zero/missing reports and inferred legacy participation.
