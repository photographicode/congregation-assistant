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

Historical pre-NEXT blocker: 22 raw-gradient text combinations failed. Superseded by NEXT §I: panels/composited stops and actual rendered text pairs now pass without changing thresholds or supplied palette tokens; see the final NEXT checks below. Full WP-02 acceptance is still incomplete.

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

Added bounded, throttled official-publication discovery, ETag caching, a repository-variable kill switch, the previous publication-file parser (now removed) and public normalized metadata outputs. Only discovered official links are followed; source URLs are not fabricated. Weekly/manual/source-change CI runs the job. English is the only currently supported parser language; other languages fail explicitly until fixtures are verified. One week-range test passes; real-source verification was absent at that historical release. The static status is false, so app/site must keep Add parts fallback until real CI metadata exists. No automatic-import success is claimed at this checkpoint.

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

## Verified deployment result — 17 October 2026

Both repositories are merged and published:

- Source PR #41: https://github.com/photographicode/congregation-assistant/pull/41
- Public snapshot PR #18: https://github.com/photographicode/Congregation-Assistant_Public/pull/18
- App source commit: `b39726aaa0678a239602a9fb3a5fc434ab6ff8b4` on source main.
- Public snapshot commit: `51a8b7d2bf183f4024aa20d173d247e0d30953fd` on public main.
- Primary public site: https://photographicode.github.io/Congregation-Assistant_Public/
- Primary app demo: https://photographicode.github.io/Congregation-Assistant_Public/app/?demo=admin
- Source mirror site: https://photographicode.github.io/congregation-assistant/
- Source mirror app demo: https://photographicode.github.io/congregation-assistant/app/?demo=admin

Public deployment and live verification succeeded in run https://github.com/photographicode/Congregation-Assistant_Public/actions/runs/39041017472 . Source deployment and live verification succeeded in run https://github.com/photographicode/congregation-assistant/actions/runs/39040915431 . Both live browser checks report the exact source commit above, a controlling service worker, correct manifest start/scope, zero browser errors, zero demo cloud requests and zero requests during assistant parsing/preview/cancel. The unrelated-app cache sentinel also survived activation.

The source workflow passed lint/TypeScript/unit/legacy checks, build, the 45-view responsive/assistant browser suite and S-89 contracts before uploading. Full V3 acceptance is not claimed: the expanded gaps and the older browser-harness/strict-gradient failures remain in CUTOVER-REPORT.md. Official-source CI returned HTTP 400, so Add parts remains the fallback. Real devices, WhatsApp, payments and approved-account OAuth callbacks remain unverified.

Production SFTS and confirmed-report functions are applied with authenticated-only execution. The proposed meeting-workflow migration remains unapplied following automatic approval review rejection; it was narrowed to preserve the existing department functions. New automatic attendant activation and group-overseer link-list activation are withheld. Existing administrator group-link creation and existing protected attendance links remain available. Production metadata also confirms the SFTS restore default for older backups is present.

No custom-domain CNAME is published. Follow GITHUB-PAGES-DNS.md after owner DNS confirmation. Both projects still show GitHub's automatic branch-publishing runs alongside the new artifact workflows; select GitHub Actions as the Pages publishing source in repository settings before future main updates to avoid competing publishing paths. The available connector can deploy artifacts but exposes no Pages-administration mutation tool. These final result notes are pushed to the resume branch without starting another production deployment.

### Production activation after reduced review

The original automatic-review rejection is resolved. The reduced migration, preserving both existing department functions, was accepted and applied. Metadata verifies all four new helpers are authenticated-only with empty search_path. Re-enabled current attendant attendance, own-group link controls, real meeting settings and atomic setup/calendar saving. Added scoped SFTS status fields to non-admin People reads and SFTS Home totals/table/annual logs. Current labels use actual saved meeting dates when present and explicitly say week-of when only a historical week is known. Older blocked-state paragraphs above are historical; no migration approval remains pending.

The activation candidate also fixes an orphaned outbox lease after reload: an acquired exclusive Web Lock can reclaim a prior document’s lease immediately; browsers without Web Locks still respect the durable lease timeout. Revision checks remain unchanged, including lost-acknowledgment conflict handling. Added deterministic unit and real-browser coverage for abandoned-lease recovery and retained two-tab single-write tests. Assistant selection also clears incompatible student/assistant pairings when the student changes.

Activation verification: 38 native unit tests plus 68 existing unit tests pass; real IndexedDB/Web Locks tests now include abandoned-lease recovery, two-tab single writes, conflict and reviewed recovery. Two consecutive signed-in offline reload/reconnect runs pass. The expanded 60-view matrix (including Home) passes, with zero demo cloud calls, zero browser errors, zero assistant parsing requests and no prompt-history writes. Existing nine-theme CSS SHA-256 remains unchanged. The activation is being published as the next checkpoint, with the expanded-scope limitations retained.

## Latest activation deployment — verified live

Source app commit: `d05f8c42fd919bc35e3c6852386099f51306fb17` on main. Public snapshot: `fda8955015f45b25f8375cc3df3ef06278db6dc3` on public main.

- Source run: https://github.com/photographicode/congregation-assistant/actions/runs/39042914333 — build, deployment and live browser verification all succeeded.
- Public run: https://github.com/photographicode/Congregation-Assistant_Public/actions/runs/39042981424 — artifact verification, deployment and live browser verification all succeeded.
- Website: https://photographicode.github.io/Congregation-Assistant_Public/
- App demo: https://photographicode.github.io/Congregation-Assistant_Public/app/?demo=admin
- Source mirror: https://photographicode.github.io/congregation-assistant/app/?demo=admin

Both live checks report the exact source commit above, controlling service workers, matching manifest scopes/start URLs, preservation of unrelated app caches, zero browser errors, zero demo cloud calls and zero assistant parsing/preview/cancel requests. The source CI also passes the 38 native + 68 existing unit tests, production builds, 60 responsive views, real Store/Web Locks tests, native offline reconnect and S-89 contracts. Earlier 17 PDF golden parity/contract and eight Indic-script checks remain passing evidence; the PDF engine/templates were not changed by activation.

The narrowed production migration is applied and activated; no migration approval remains pending. All three department pools retain administrator approval. Full V3 scope is still incomplete as listed in CUTOVER-REPORT.md. Real publication ingestion is unverified after HTTP 400, the original raw-gradient contrast failures remain documented, and real OAuth/WhatsApp/payments/devices require their separate acceptance. Custom-domain CNAME remains withheld under the owner's DNS-confirmation requirement. These result notes are kept on the resume branch to avoid restarting an unchanged deployment.

Final safety pass removed obsolete project fallbacks from the retained root/staging shells; their defaults now use the current publishable configuration. Existing root acceptance checks remain green. The live checker now captures console errors as well as page exceptions. Opening an explicit all-S-21 command also clears any prior publisher-search filter, so a stale search cannot silently narrow the requested export.

Trust-route smoke coverage now includes `/security/` with console-error capture. Fixed deep-page configuration asset resolution, emitted an explicit unverified metrics placeholder instead of a missing-file request, and kept CI-only verified timestamps. Updated the hosting-provider map and policy date. The gold PDF section text now uses the same requested dark gold-bar foreground as the schedule view.

## V3 next orders — 18 October 2026

The two owner uploads are byte-identical; `V3-NEXT-ORDERS.md` supersedes conflicting preview/import instructions. Work follows A→J. Prior unfinished packages remain unchecked.

### A — direct PDF downloads

Publisher rows, search S-21 actions, missing-report rows and Download Center now save directly; emergency contacts and existing meeting/slip buttons also save directly. PDF generation runs in a module worker with cancellation; ZIP batches reuse one engine. Download Center remembers merged/ZIP preference. Accuracy notices are non-blocking and link to Reports; no preview iframe/dialog remains. Print/Share remain separate options. iOS falls back to a blob tab only when the anchor download property is unavailable.

Evidence: strict TypeScript, lint, production build pass. `scripts/check-direct-downloads.cjs` observes 14 real download events at 390/1440 px (publisher row, S-21 merged/ZIP, S-3, S-88, emergency and weekend), all under 1,806 ms, no dialog/preview. The existing PDF engine/templates are unchanged. CO Visit Pack remains disabled because its complete generator is not shipped; it is not advertised as a completed download path. Expanded slip/roster and text-parity checks follow in final acceptance.

### B — WOL pipeline replacement (real CI pending)

Removed the publication-file reader and user upload controls. Added bounded, throttled WOL HTML discovery using owner anchors, source navigation, issue/year indexes and Meetings; ETag/Last-Modified cache, retry/backoff, kill switch and failure artifacts. Five synthetic structural/date/parser tests pass offline, with no copied source pages. App reads ISO-date JSON automatically, retains source attribution/songs, and limits manual entry to administrators. The four real anchor pages and Watchtower mapping must be verified before claiming automatic source import; other languages remain unverified.

### C — Home group links and launch suggestions

Group links appear directly after the greeting, with scoped server counts, Copy/QR/Share/Open/Create and Copy all for WhatsApp; reused at setup completion. New submission timestamps are captured on writes; existing records show no timestamp rather than an invented date. The new read RPC enforces account, congregation and exact-group access and returns no report contents. Local SQL fixtures verify group/department boundaries, the real link token and aggregate submission counts/timestamps.

Suggestions choose three eligible cards using weighted randomness, retain the last five opening histories locally, allow urgent reminders to recur, and support Dismiss/Snooze. Only existing tools are suggested; unavailable CO packs are excluded. Unit tests inject the RNG. Synthetic signed-in browser checks pass own-group card, QR, fresh launch suggestions and dismiss. Strict TypeScript/lint/build pass. Expanded urgent sources (next-week gaps, Accuracy Guard and plan events), feature-use weighting and translated suggestions remain open; this is a tested Home increment, not full C acceptance.

B integration: GitHub run 39066390346 passed all four anchor weeks and committed 59 English weeks, including 2027 discovery, at b0f64c6. Reviewed normalized output exposed an overly broad header removal: reading/date headings were discarded while parts/songs parsed. Fixed the selector and added a synthetic nested-header regression. Watchtower's title was discovered but its weekly dates were null; source navigation logging and week-page discovery now verify that mapping independently. No raw pages are committed.

### D — weekend talk history

Published normal-week schedules now populate a separate private talk-history table; existing published snapshots seed it without exposing drafts/notes. Date-number CSV/paste backfill is idempotent and restricted to approved weekend schedulers. Rescheduled/exception dates without an actual meeting date are excluded. Heads-up compares whole calendar months, shows the speaker’s matching history, reserves height, and uses configurable 12-month warning/24-month notice thresholds. Talk finder orders previously used talks least-recently first and fills the editable title.

Evidence: four deterministic unit tests cover never/recent/old/same-speaker/year-boundary cases; 390/1440 browser checks pass last-given, never-given, backfill and stable status height. Rollback-only local database fixtures pass publish/update history, duplicate imports and cross-role/tenant denial. The additive production migration applied successfully. No real records were fetched into tests. Thresholds are device preferences; congregation-wide threshold settings and true rescheduled dates remain open.

### E — browser-first installation

The entry module now captures beforeinstallprompt before Settings loads. Install uses a captured event immediately, waits at most five seconds for a delayed event, then shows platform-specific inline-SVG instructions. iOS skips the wait. appinstalled/standalone hide the button and show the installed message. No window application singleton is used. Four fake-timer/controller unit tests pass; actual Chromium phone/desktop checks cover captured, delayed, absent events and the installed state.

### F — alignment audit, first systematic pass

Added geometry auditing with selector/coordinate reports for near-miss edges, row heights/radii, icon centers, alignment, spacing-grid deviations, overflow/clipping, control size and single-word final lines. First 12-view affected-screen sample (390/1440, Paper, 100%) fell from 30 findings to 1 after shared spacing/control/fieldset/text-wrap fixes. Full matrix and state coverage remain required; no contact sheets are rendered and no zero-finding claim is made. New Row/Field/Section primitives share these rules. The old website is 367 bytes above its initial payload cap after shared CSS growth; H must restore the cap before release.

### G — requested font families and licensed script coverage

Added the exact per-theme display/body/accent family map as overrides, preserving supplied theme colors. All 13 Latin families and new Noto Serif/Odia/Urdu packages have verified OFL files retained beside the fonts. Latin subsets are 65,492–110,948 bytes per active theme, below 150 KiB. CSS uses swap and measured Liberation/Arial-compatible fallback size/ascent/descent overrides; script faces use unicode ranges and Indic typography has 1.75 line height/no letter spacing. Root theme is applied before first text paint; preloads track only the active theme, and the service worker no longer precaches all font families.

Evidence: nine-theme browser checks pass computed display/body families and requested preloads; license manifest is in docs/qa/font-licenses.json. An initial request trace found the default Inter face loading before some selected themes; early root activation fixes that and must be checked in the next artifact. Indic contact sheets/CLS/full alignment remain required; no visual sign-off is claimed while F has findings. Website payload accounting is being replaced with actual B/W active assets in H rather than increasing its cap.

B app acceptance: the signed-in synthetic browser now renders a real CI-normalized WOL week automatically, including reading, songs and all eight parts, with no user upload/acceptance step. Loading source data waits for the saved workspace so it cannot replace a not-yet-loaded draft. Public JSON caches independently for offline use. Dated Watchtower metadata from run 39067075012 is integrated into weekend display, PDF data and published links. English-only status is explicit; further language discovery and complete archive/exception-week coverage remain open.

G follow-up: the next built artifact confirms exactly the active theme’s two or three Latin font requests in all nine themes. Applying a system-font fallback while no theme attribute exists removed the initial stray Inter request. The font test now enforces this request allowlist as well as computed families and preloads.

### H — static black-and-white website

Replaced the advertised interactive demos and nine-theme selector with a B/W light/dark site, Instrument Serif/Inter/JetBrains type, native-name language menu, 13 static language routes, reduced-motion animations and the requested core/legal pages. Initial gzip payload is 120,230 bytes (200 KiB cap); script is 3,244 bytes (30 KB cap). Content and contact email fallback work without JavaScript. Responsive browser checks pass four widths, six script locales, Urdu RTL, no advertised QA-demo URLs, zero external requests and zero browser errors. Claims linter gates automatic source, encryption and offer copy.

The founding/Starter/Founders prices are configured but their public offers stay hidden because entitlements/slots are not verified. English is reviewed; twelve machine-drafted locales translate navigation/hero and deliberately fall back to English for missing sections, with a feedback link. Remaining translations, actual optimized mockups/OG assets, sticky story/typing visuals, Lighthouse and the full website alignment matrix remain open. These omissions are not advertised as completed capabilities.

### Final NEXT implementation checks — 18 October 2026

A: 26 real downloads now pass at 390/1440 px, maximum 1,257 ms, without preview dialogs. Added native department-roster exports, filtered emergency exports, S-89 student/assistant and S-140 coverage. Non-blocking notices count only closed months; Unicode filenames preserve Indic combining marks. Four focused filename/report-accuracy/roster checks pass; the PDF engine and original templates are unchanged. CO Visit Pack remains disabled.

B: positional song parsing preserves repeated numbers and missing fields as null (six synthetic structural tests pass). Public-data loading preserves saved meeting date/time and original weekend song choices. English four-anchor CI is verified; the new importer run and deployment results will be recorded below. Non-English WOL discovery, full historical Watchtower mapping and exceptional-week coverage remain open.

C: Group report links remain immediately below the greeting, including before setup entry. Rotation/revocation is confined to Links Hub and authenticated same-congregation/assigned-group SQL. The additive migration is applied; rollback-only isolation fixtures and signed-in browser rotation/revocation pass. Suggestion actions open the correct tool/month. Expanded urgent sources, complete used-feature weighting and localized suggestion strings remain open.

D/E: focused talk-history/backfill browser checks and install available/delayed/absent/installed branches pass at phone/desktop widths. Together with suggestions/accuracy/roster tests, 15 targeted native tests pass. Same-speaker narrative and month-boundary math have unit coverage; complete device acceptance remains open.

F: shared padding, control sizing, icon alignment and overflow fixes reduce the comparable 12-view sample from 30 findings to one. A separate 40-view narrow/200% sample has 48 text-widow findings, zero other findings and no route errors. **The alignment gate is not passed.** No contact sheets or mockups are rendered. See qa/ALIGNMENT-REPORT.md for comparable counts and scope.

G: all nine themes pass computed fonts/preloads and exactly their active two/three Latin requests. Added OFL-verified WOFF2 versions for eight existing Indic script faces; PDF TTFs remain unchanged. Latin payload remains below 150 KiB. Script screenshots/CLS acceptance remains open behind F.

H: final B/W site payload is 120,353 bytes gzipped; JS is 3,349 bytes. Four widths/six script locales/RTL/no-JS/zero third-party requests pass. Offer/mockup flags remain off. Twelve draft locales still fall back to English beyond navigation/hero; full copy translation and optimized mockups/OG/sticky-story remain open. No public claim says those are finished.

I: the superseding contrast gate passes **351 panel combinations across nine themes plus four OCLM combinations**, and **3,703 actual rendered text/background pairs in 108 views** with zero failures and no visible bare-canvas text in that sample. Thresholds remain text-1 ≥7:1 and other text ≥4.5:1. OCLM ink now stays legible inside dark app themes; greeting text sits on an opaque existing surface token. The prior raw-gradient-text blocker is superseded by the owner's NEXT instruction; WP-02 stays unchecked because full layout/component/script acceptance remains incomplete. The supplied themes.css is unchanged.

J: no complete V3 claim. Existing PARITY/remaining packages still apply. E2EE, full restore/export packs, final publisher/owner parity and physical-device/OAuth/WhatsApp/payment acceptance remain open. No migration approval is pending. DNS/custom-domain activation remains subject to the existing owner DNS-confirmation requirement.

Release follow-up: mobile Lighthouse 12.8.2 scores 100 in performance/accessibility/best-practices/SEO, zero CLS (qa/lighthouse-site.json). Source CI passed the whole lint/type/unit suite, then its existing 60-view shell check detected a 200%-text account-avatar overflow that the main-content alignment sample did not cover. The shared header now constrains that avatar to its button content box; the 60-view regression is rerun before republishing. The full F gate remains open.

Offline/source regression: cached automatic parts could change an earlier manually named assignment slot. Source refresh now preserves compatible persisted part IDs and chosen date/time using the latest local draft. An existing assigned Bible reader remains selected after a real normalized WOL program loads; three focused merge/ID-collision tests pass. Native offline draft reload/reconnect passes twice with exactly one write. The harness now selects the Bible Reading card explicitly because the first dropdown is now a Treasures assignment; it still asserts the exact saved Reading slot and one reconnect write. Newly added or incompatible source slots remain unassigned and require normal scheduling review.

Seventeen regenerated native PDF fixtures pass exact extracted text, page geometry and existing coordinate tolerances against frozen V1 goldens. Original template hashes and embedded fonts pass; no PDF images were rendered for this check (qa/next-pdf-text.json).

Both Pages deployment workflows now attempt to select Actions publishing with their scoped Pages write permission, to remove competing automatic branch builds. A permissions refusal leaves deployment available and reports the repository-setting task explicitly; the actual result is recorded after deployment.

## NEXT deployment — verified live

Source main `f0a0d67d437538bee6d319d70ebbc120031c3ad0` and public main `c2cd184462d5c25b07ddd1119c99fab140a73c32` are published and pass live verification. Source run 39073120817 and public run 39073165965 both succeed, including the exact source SHA, worker/cache isolation and zero-error/no-cloud-demo checks. Source CI also passes the complete suite, 60 regression views, 26 downloads (maximum 1,078 ms), automatic-source assignment preservation, offline recovery and 3,705 rendered contrast pairs. See qa/NEXT-RELEASE.md and qa/NEXT-DEPLOYMENT.json.

Both workflow attempts to select Actions publishing received HTTP 403; deployment proceeded successfully. Owner Pages settings remain required to prevent competing branch builds. No migration approval is pending. DNS/mail and remaining V3/NEXT acceptance remain open. These evidence-only result notes are pushed on v3/resume to preserve the verified production artifact without starting an unchanged deployment.
