# V3 progress

V3-ORDERS.md is authoritative. The supplied CSS is used verbatim as packages/ui/themes.css. Existing frozen tag v1-final is reused; it must never be moved. A checked package requires its complete acceptance scope, not merely a route or a demo.

- [x] **WP-00** Baseline: tag `v1-final`; generate golden PDFs from V1 into `tests/golden/v1/`; generate V1 action inventory (`docs/PARITY.md`); create `docs/V3-PROGRESS.md`.
- [x] **WP-01** Tooling: monorepo layout, Vite/TS strict, ESLint (a11y, no-emoji, no-hex-in-components), Vitest, Playwright, `scripts/contrast-check.mjs`, `scripts/layout-detector.ts`, `scripts/check-no-legacy.mjs`.
- [ ] **WP-02** Design system: `themes.css`, tokens, fonts, icons, illustrations, all components (§5), Dialog.
- [ ] **WP-03** App shell: navigation + hubs + breakpoints (§3), global search/command palette, Experience Styles (§6), theme gallery, adaptive layout runtime (Layout Doctor), i18n scaffold.
- [ ] **WP-04** `Store` interface + `PlainStore` + typed repositories + Zod schemas + local IndexedDB mirror + sync (Plain) — port V1 data logic.
- [ ] **WP-05** Auth + membership + roles + invites + Links Hub (Google / magic link / one-link; **no passwords**); activity log; support-access removed (no operator access path).
- [ ] **WP-06** Home dashboards per role (§6) with real + demo data; greeting/clock.
- [ ] **WP-07** People: publishers list **with S-21 button (§4)**, inspector, add/edit (email field + household prompt), groups table + dropdowns, households, emergency list family-wise.
- [ ] **WP-08** Reports cycle (§7.2) + Accuracy Guard + S-1 summary + pioneer logs + chase queue.
- [ ] **WP-09** PDF Studio (§7.5) + CO Visit Pack + **golden parity tests**.
- [ ] **WP-10** Attendance.
- [ ] **WP-11** Midweek + S-140/S-89 + schedule import job (§7.4).
- [ ] **WP-12** Weekend + visiting speakers + Watchtower import.
- [ ] **WP-13** Duties + field service groups/meetings.
- [ ] **WP-14** Messages: WhatsApp Smart Share, reminders, announcements.
- [ ] **WP-15** Import Center (+ optional OCR).
- [ ] **WP-16** Setup wizard + first-run Experience picker.
- [ ] **WP-17** Public pages (report, attendance, noticeboard, weekend) with abuse throttling.
- [ ] **WP-18** Billing + entitlements + Razorpay edge functions + Plan page + invoices (§8).
- [ ] **WP-19** Trial-end flow: Export pack + Delete + Receipt (§10) with round-trip test.
- [ ] **WP-20** SuperAdmin dashboard (§11).
- [ ] **WP-21** Publisher portal (Calm default): Next / Schedule / Report (+ household switcher) / Me.
- [ ] **WP-22** `VaultStore` + Vault UI (recovery sheet, key holders, Shamir, devices, migration, sealed inbox) + §9.7 tests. Flip `VAULT_DEFAULT` for new workspaces only when green.
- [ ] **WP-23** PWA hardening + install UI + offline + optional APK workflow (skips without secrets).
- [ ] **WP-24** Website V3 (§12), legal pages from the real data map, trust badges from CI (`trust-metrics.json`).
- [ ] **WP-25** Hosting/CI/CD: Cloudflare Pages deploy for `congregationassistant.com` (site) and `app.congregationassistant.com` (app), headers/CSP/redirects, `security.txt`, config-driven URLs, DNS preflight script, post-deploy verification.
- [ ] **WP-26** QA program and reports (below).
- [ ] **WP-27** Parity sign-off → delete V1, bridge, `staging/`, `public-site-preview/`, `archive/`, legacy auth and tables migration (write, don't auto-apply); final deploy.

## Evidence

- WP-00: reused immutable v1-final at 76978c4fbe56658b8b856cb7218b5c4a212cd1f0. Re-executed the real frozen generators for all 17 PDFs and four dashboard fixtures; regenerated 104 expanded requested actions against the reference. npm run check: 83 passed plus TypeScript. Baseline PDFs are reference artifacts, not V3 shipped assets.
- WP-01: removed the src/v2 tree by relocating native screens to features; extracted shared core repositories and PDF engine to workspace packages. Added strict lint (a11y/hooks/no emoji/no component hex), Vitest, gradient/alpha contrast sampler and kept layout/bundle detectors. Check passed: 3 Vitest + 83 existing unit tests and strict app/package TypeScript. Existing proven ports remain the baseline for the subsequent Store refactor.

### WP-02 — supplied theme integration

Implemented the exact owner-supplied themes.css (SHA-256 in docs/qa/supplied-themes.sha256), nine-card gallery, intensity slider, system paper/forest mapping, compatible tokens, OFL self-hosted fonts, adaptive Dialog, and shared component library. Profile allowlist/intensity validation tested with nine themes and applied without changing authorization/revision checks. Component behavior/axe passes; PDF font substitution passes all 17 existing parity thresholds.

BLOCKED: supplied Lagoon Glass and Aurora raw gradient canvases fail required text contrast (22 combinations across tones); no supplied colors were changed and no threshold was relaxed. Panels pass, and application text is backed by panels. Full raw-gradient contrast release gate remains red in docs/qa/contrast-report.json. Exact CSS preservation takes priority over silently replacing the supplied palette.

Still required for full WP-02 acceptance: complete responsive visual matrix and Indic serif assets. Proceed to independent WP-03 shell work without marking this package complete.

- WP-02 partial verification: lint/typecheck, 4 Vitest checks and 68 updated nine-theme unit checks pass. Shared interactive component acceptance has zero axe findings. Theme screens at 390/1440: selected navigation was corrected to use the supplied link token rather than yellow accent fill in Neo Brutal. The source stylesheet remains byte-identical; no new palette colors were introduced.

- The nine actual Home theme views pass axe at phone width and capture at phone/desktop with no browser errors or demo cloud requests. The separate strict raw-gradient release gate intentionally remains failing. New V3 CI preserves that failure and publishes evidence.

### WP-03 — navigation and experience foundation

Implemented seven canonical role-filtered sections and labeled tool hubs, scoped publisher/action/theme search, phone five-slot tabs and quick actions, 72px tablet rail, 264px desktop sidebar, and wide 360px inspector container. Hubs reuse loaded publisher/group counts rather than making additional content queries. Home preview cards render the same shared KPI/greeting presenter as Home; Calm discloses its additional tools. Existing adaptive accessibility runtime observes text/viewport changes and preferences. English-first i18n keys cover the new shell.

Owner navigation is limited to billing/health console and appearance settings; removed the console's tenant-account management UI. This is a UI boundary only: the complete backend operator-access removal and audit remain WP-05/WP-20 work.

Verification: lint/strict TypeScript, 7 Vitest and 68 existing unit checks pass. Targeted shell checks cover 15 hub views across 390px, 200% text, 600px, 1024px and 1440px, with zero layout/axe/browser errors and zero demo cloud requests. Search and quick publisher entry work. App entry gzip remains below 200 KiB; corrected complete website transfer accounting passes at 202,917 bytes (200 KiB cap), using an OFL static Newsreader face on the website.

BLOCKED for complete WP-03 acceptance: functional selected-record master/detail and inspector depend on WP-07; unavailable future feature tiles remain explicitly disabled. Full feature/role/theme matrices remain WP-26. Keep this package unchecked and continue with the independent Store foundation.

### WP-04 — Plain Store and offline draft foundation

Added packages/core/store.ts and a PlainStore adapter using idb 8.0.4 (ISC). All native screen data calls now go through Store; only the adapter imports the SDK data API. Authentication remains separate. Typed repositories validate mirrored results with Zod. Mirrors are isolated by account, workspace, role scope, and exact projection; membership/owner metadata has a narrow account-only allowlist. Public/credential-bearing RPC responses remain transient. Cached share-link token fields are blanked. Logout closes in-flight stores and clears all of that account’s role mirrors.

Implemented durable local Midweek save/outbox with expected server revisions, background sync, Web Locks plus IndexedDB leases for concurrent tabs, explicit pending status, conflict/permission stops, local recovery download and an atomic reviewed replacement with the shared draft. Publishing waits for successful synchronization. Invalid responses cannot enter the mirror. In-flight pre-save pulls cannot overwrite queued changes. Lost acknowledgements stop safely on revision conflict rather than repeat a successful mutation.

Actual browser acceptance found and fixed two shell defects: query-string navigation was bypassing the service worker, and the workspace lazy chunk was absent from shell precache. Navigation now falls back to the canonical cached shell; query URLs, API responses and auth responses are never cached. Large PDF/crypto assets remain on demand. Root membership/plan metadata can load from validated cache when offline; fresh reads do not fall back on permission errors.

Evidence: tests/v3/plain-store.test.ts (including cold offline read, role/account isolation, stale pulls, durable queue, duplicate sync, lost acknowledgements, denial, recovery, cleanup and transient public operations); docs/qa/v3-store-browser.json uses real Chromium IndexedDB/Web Locks. docs/qa/v3-offline-app.json exercises the real signed-in UI with synthetic auth and fully intercepted backend responses: offline deep-link reload, local draft reload, one reconnect write and no browser errors. No real account or congregation records were used.

Full WP-04 remains unchecked: the remaining V1 mutation contracts have not yet been ported to revision-protected offline commands, and several RPC-backed features remain network-only. They fail explicitly and preserve the current form entries; they are not advertised as offline writes. Do not treat this adapter foundation as full V1 data-logic parity. Full authenticated/multi-device authorization acceptance remains part of WP-05/WP-26.

- WP-04 checkpoint verification: npm run check passes lint/strict TypeScript, 23 Vitest tests and 68 existing unit checks; npm test and build/bundle checks pass. Real-browser Store, signed-in synthetic offline flow, 15 shell views and all nine theme views pass. Supplied CSS SHA-256 remains unchanged. This is a review checkpoint, not a V3 parity sign-off.

## V3 resume — 17 October 2026

Working on `v3/resume` under the owner's explicit authorization to merge and publish both GitHub repositories. The supplied reference document is excluded from Git. Initial checkpoint: `npm run check` passes lint, TypeScript, 32 Vitest and 68 legacy unit tests. New S-21/SFTS, meeting/slip PDF, department, attendance, local-command and group-link work is implemented but remains subject to the acceptance gaps below; this is not full V3 parity sign-off.

Resume safety and release work is in progress. Do not claim automatic official-publication import until a real CI fetch succeeds. Domain CNAME remains withheld until DNS confirmation. Existing nine-theme raw-gradient contrast failures remain explicit.

### Requested feature checkpoint

Implemented all eight S-21 group selectors and publisher-row downloads; conditional SFTS profile/filter/report totals; reviewed workbook imports; oldest/never-used meeting suggestions and fill-empty assignment; scoped S-140 palette and independently drawn S-89 PDFs for both names; departmental request/admin-approval workflows; current-meeting attendance; scoped group reporting links; first-run setup entry; browser-only report command parser with confirmation. Additive database migrations pass local tenant/role/backup/CAS fixtures. These are checkpoints, not assertions that every expanded resume requirement is complete. In particular multi-group ZIP, all classrooms, slip delivery tracking, meeting-window/offline attendance, CI source ingestion and all assistant intents still require work.

### Resume filters and assignment review

S-21 now supports live per-filter counts, union/de-duplication, 1–12-month missing-report and explicit-no-activity choices, merged/ZIP output, preview before download and visible row entry with year/print/share options. Fairness ties use overall assignment age, then count in the preceding 12 months, then name. Fill-empty proposals require Accept and support Undo. S-89 uses native file sharing where supported and an explicit manual-attachment fallback. Attendance refetch preserves an in-progress count and resets it safely when the server meeting changes.

`npm run check` passes. Fixed a pre-existing timing-dependent Store test by waiting for the actual transport start instead of a zero-millisecond timer; assertions remain unchanged. The on-device panel now preloads authorized records before opening, so parsing, preview and cancel perform no backend reads; confirmation alone writes the structured report with a stale-preview guard.

### Official-source CI import

Added bounded, throttled official-publication discovery, ETag caching, a repository-variable kill switch, independently written EPUB parsing and public normalized metadata outputs. Only discovered official links are followed; source URLs are not fabricated. Weekly/manual/source-change CI runs the job. English is the only currently supported parser language; other languages fail explicitly until fixtures are verified. One week-range test passes; the two real EPUB acceptance tests skip clearly because private fixtures are absent. The static status is false, so app/site must keep Add parts fallback until real CI metadata exists. No automatic-import success is claimed at this checkpoint.

Production database: `v3_publisher_sfts` and `v3_local_command_report` were applied and metadata-verified: authenticated execution only, anon denied, empty search_path. Automatic approval review rejected the combined `v3_meeting_workflows` migration for its production shared-function blast radius. No workaround was attempted; local tests are green, production rollout is blocked. Existing setup save is preserved. New attendance context and group-list RPCs must not be represented as enabled in production.

First official-publication CI run (39039306671) reached the source but returned HTTP 400. No week metadata was committed; Add parts fallback remains visible. This is an observed CI failure, not just the local sandbox limitation.

### Website and Pages artifact

Added twelve honest feature cards, lazy interactive fictional S-21/assistant/OCLM/slip demos, a dated Updates entry, in-app What's new sheet and trust-page processing/permission explanations. The sample assistant uses the same deterministic parser. Existing moving-grid hero, theme gallery and reduced-motion tour are retained. Website CSS is minified to keep the existing 200 KiB initial-transfer cap; no theme colors or thresholds changed.

Pages packaging builds configured project-relative paths, root website plus `/app/`, PWA scope/start URL, a root app SPA fallback and source-commit metadata. No CNAME is emitted. Cloudflare workflows remain available separately. New source-import status is false and the app offers reviewed local imports.

Verification so far: `npm run check`, `npm test`, build and no-legacy bundle checks pass. All 17 existing PDF golden parity/contract fixtures and eight Indic-script checks pass. New S-89 fixtures cover two copies, three classroom settings, long names and Indic names. Browser checks are being completed before merge; expanded resume requirements remain listed separately rather than marked complete.

The latest resume pool rule supersedes the earlier Cleaning exemption: all three departments now show request/admin-approval UI and restrict assignment choices to approved people, matching the existing production backend. The unapplied migration was narrowed to remove the two department-function replacements entirely; it remains unapplied after automatic review rejection.

### Resume acceptance checkpoint

`npm run check` passes (36 native unit tests and 68 existing unit tests); `npm test`, production build and bundle safety pass. The new browser evidence `docs/qa/v3-resume-browser.json` has 45 views with zero layout failures, zero browser errors and zero demo cloud calls. Parsing/preview/cancel made zero requests and wrote no prompt history. Offline reload/reconnect passes. Fixed shell chrome observation when lazy navigation appears and capped the brand icon in the 72px rail at 200% text; no detector threshold was relaxed. Local SQL tests pass with approval required for Cleaning as well as AV/Attendant. Production metadata confirms the separate department draft functions retain approval checks for all departments.

Full-ref history scan after fetching branches/tags: 1,825 source blobs and 263 public-repo blobs, no recognized credentials. The old cutover browser harness fails its obsolete greeting selector; full parity remains unchecked. See CUTOVER-REPORT.md for expanded resume gaps. This release is explicitly a public V3 checkpoint, not a declaration that all work packages are complete.

Source PR #41 merged to main at `674e3f1d055752434e38229e564b285fcba00e36`. Public-repository artifact is built from that commit with its own project-relative URL. Local packaged-site verification passes: root site, `/app/`, actual controlling service worker, matching version/deployment commit, correct manifest scope/start URL, zero browser errors, zero demo cloud calls and zero assistant parsing/preview/cancel requests. Automated post-deploy verification is included in the Pages workflows.

A final two-repository hosting check identified an origin-wide cache deletion in the existing worker. Scoped app-shell/PDF cache names and cleanup to BASE_URL so installing either Pages app cannot delete the other app’s offline assets. Packaged/live verification now seeds an unrelated app cache and requires it to survive worker activation.
