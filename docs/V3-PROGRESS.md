# V3 progress

V3-ORDERS.md is authoritative. The supplied CSS is used verbatim as packages/ui/themes.css. Existing frozen tag v1-final is reused; it must never be moved. A checked package requires its complete acceptance scope, not merely a route or a demo.

- [x] **WP-00** Baseline: tag `v1-final`; generate golden PDFs from V1 into `tests/golden/v1/`; generate V1 action inventory (`docs/PARITY.md`); create `docs/V3-PROGRESS.md`.
- [ ] **WP-01** Tooling: monorepo layout, Vite/TS strict, ESLint (a11y, no-emoji, no-hex-in-components), Vitest, Playwright, `scripts/contrast-check.mjs`, `scripts/layout-detector.ts`, `scripts/check-no-legacy.mjs`.
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
