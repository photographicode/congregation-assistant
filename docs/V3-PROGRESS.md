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
