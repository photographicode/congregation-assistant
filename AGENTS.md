# Current release authority

docs/V3-R1-SHIP-ORDERS.md supersedes earlier polish gates: ship R1 after its PDF, security, functional and HARD geometry gates; defer parity, pricing, visual lock, translations and domain activation to R2. Freeze i18n. At most one sampled audit of 300 views per batch, one spec at a time, no build/test races. No production reset; snapshot before migrations.

# Congregation Assistant

Latest authority: docs/V3-POLISH-ORDERS.md supersedes earlier briefs where they conflict. This is refinement/restoration only. Never reset production data; export a pre-migration snapshot and provide additive/down paths before any new production migration. Public website design is locked by site/DESIGN-LOCK.md. Run affected checks per item, commit/push focused work, and run the full suite once at the end in Actions. Merge and deploy both repositories only after all POLISH §8 gates pass. docs/POLISH-REPORT.md must retain honest incomplete items. Do not move v1-final, change the supplied themes.css, or claim a reduced test sample proves whole-product parity.

The owner's docs/V3-ORDERS.md supersedes V2 briefs. Follow its package order, supplied themes.css, acceptance gates and per-package check/commit/push protocol. Do not move the immutable v1-final tag. V3 source replaces apps/web/src/v2; PlainStore precedes gated VaultStore. Keep the nine supplied CSS themes authoritative. Native app source lives in apps/web/src/features, core/store logic in packages/core, PDF engine in packages/pdf, shared UI in packages/ui, and website in apps/site. Build only these trees; never copy legacy root scripts into deployment output.

Complete and verify native parity before deleting remaining legacy implementation. docs/PARITY.md must report real gaps; do not mark a capability complete because a demo, placeholder, link, or unverified backend call exists. Release is blocked until npm run check:release and all browser/database acceptance gates pass. Work on v2/cutover; ship one PR only when its gates pass.

Run npm test, npm run check, npm run build, npm run check:bundle and npm run test:browser. Prefer targeted checks after fixes. Run expanded matrices in nightly CI. Source and production publishing are separate from SQL: never automatically apply destructive production migrations. scripts/apply-migrations.sh skips destructive auth removal unless explicitly selected by the owner.

No real records or secrets in fixtures. No window-based application singletons, V1 iframes, inline handlers, pictographic icons or password authorization. Browser APIs such as window.visualViewport are allowed. Demo must never call Supabase. Do not enable E2EE claims until the complete device, migration, recovery, revocation and sentinel suites pass.

R1 geometry evidence is fingerprinted: the complete 37,044-view Actions matrix plus the 8,820-view final report delta. UI/font changes invalidate the retained proof and require the explicit refresh workflows. Do not relabel soft findings as fixed or waive current HARD/security/PDF/database gates. Full-row production export was rejected by review; only affected-function definitions were snapshotted, and no production row rewrite is authorized by the R1 schema migrations.

R1 deployed source commit 17128b8 and public commit 22fd986 are live-verified; see docs/qa/r1-live.json. No customer records were used for tests or rewritten by the AP migrations. The full-row export was rejected; do not describe the function-only backup as a full data backup. Before any future data-changing migration, obtain an approved full-data backup. Source Pages settings update returns 403; the owner must choose GitHub Actions to stop the competing branch publisher. Preserve the verified native artifact after documentation-only publishing changes.
