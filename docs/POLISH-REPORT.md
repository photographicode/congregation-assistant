# R1 release — deployed and verified

Both repositories are merged and published. Source release: [17128b8](https://github.com/photographicode/congregation-assistant/commit/17128b8b89d449644c3c448a06e825efc72f245e), [PR #52](https://github.com/photographicode/congregation-assistant/pull/52), [successful deployment/live check](https://github.com/photographicode/congregation-assistant/actions/runs/39168522590). Public release: [22fd986](https://github.com/photographicode/Congregation-Assistant_Public/commit/22fd9867eff98f4419a404be068e667e73e281d2), [PR #19](https://github.com/photographicode/Congregation-Assistant_Public/pull/19), [successful deployment/live check](https://github.com/photographicode/Congregation-Assistant_Public/actions/runs/39168535386). The public runtime is built from source 3013329; later source commits change release tests, evidence and migration scope without changing that runtime.

- [Public website](https://photographicode.github.io/Congregation-Assistant_Public/) · [app](https://photographicode.github.io/Congregation-Assistant_Public/app/) · [fictional review demo](https://photographicode.github.io/Congregation-Assistant_Public/app/?demo=admin).
- [Source website](https://photographicode.github.io/congregation-assistant/) · [app](https://photographicode.github.io/congregation-assistant/app/).

Live Chromium checks on both real URLs confirm expected version metadata, correct manifest/service-worker scope, a controlling worker, zero browser errors, zero assistant requests during review and zero demo backend requests. These ran in GitHub Actions: this managed workspace does not allow github.io egress. Evidence is [qa/r1-live.json](qa/r1-live.json).

Release checks: full matrix 37,044 views plus report delta 8,820 views, zero HARD findings/coverage errors; 36 and 12 soft findings respectively remain. The local 294-view sample has zero findings. Forty-nine PDF fixtures pass geometry/font checks; 17 reviewed Noto goldens pass selectable text, page count/geometry and 150-dpi pixel comparisons <=0.2%; 3,433 source-data retention assertions pass. These are sampled bounds/alignment checks, not a proof for every possible input. Original form-reference hashes, the immutable v1-final tag and supplied themes.css hash remain unchanged. PDF/UI contact sheets were reviewed within the image limit.

The two AP migrations are applied. Affected function definitions were snapshotted, encrypted and round-trip verified; freshness was checked before applying. No existing report/publisher rows were rewritten. Production metadata confirms audit RLS, no direct authenticated table read/write, no anonymous AP execution, and invoker public wrappers. Automatic approval review rejected the full production-row export because authorization for the sensitive payload/destination was not established; no full row-data snapshot was taken. The narrow function-only snapshot and committed rollback paths cover these additive, row-preserving changes.

**Owner publishing action remains:** select **GitHub Actions** under [source repository Settings → Pages](https://github.com/photographicode/congregation-assistant/settings/pages). The workflow token's settings update returned 403 and an older branch-based Pages workflow is still present. The verified native artifact has been published; this setting prevents future source-branch builds from replacing it. Public mirror branch contents already contain the same native site/app. No DNS, CNAME, OAuth dashboard or billing activation was performed.

Supabase advisors still report the existing public-function/password-policy warnings (13 anonymous definer functions, 95 authenticated definer functions, password-protection warning); these were not newly granted by R1. The audit table adds an expected [RLS-without-policy information notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy): it is private and deliberately has no direct client access. Three new FK-supporting audit indexes have expected [unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) before use. Existing [function-grant warnings](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password-policy warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remain documented rather than presented as a clean whole-project audit.

Not verified: real phones, physical printers, WhatsApp delivery, Razorpay, a real-user Google sign-in/report submission, or Letter-specific printer profiles. The prefixed isolated PDF test-server parent-data route remains open; the native-root PDF browser test and both packaged/live-site checks passed. No production record was used as a test fixture.

R2 order: **front-door cleanup → pricing config/page → website visual lock → domain switch → translation coverage → billing**. Additional known refinements remain in the historical notes below, including app-wide picker expansion, the third-classroom settings UI, wider same-day duty/weekend cautions and the soft layout findings.

## Owner redesign pass

Status: in progress.

- Done: additive design-system tokens and written component rules; existing supplied theme blocks remain unchanged.
- Done: additive tenth theme, **Noir Pop**, mirrors Sunset Pop structure with a monochrome ramp. This resolves the owner instruction by adding separate CSS and registering Noir Pop in the theme registry; no existing theme block was edited.
- Done: shared Select/Combobox foundation supports keyboard navigation, type-ahead search, focus return, mobile bottom-sheet presentation, two-line options and right-aligned metadata.
- Done: assignment recency now reports This week, Last week, N weeks ago or Never, preserves the exact date in secondary text and sorts longest gaps first.
- Partial: app-wide native select and disclosure replacement is being migrated screen by screen.
- Done: typed assistant capability registry covers publisher/report/attendance/meeting/AP/PDF/link operations and drives Home suggestions; current executable handlers remain report save/update, attendance, S-21 and export.
- Done: Congregation Bible Study has an additive reader flag, independent qualified reader assignment, auto-assignment, schedule rendering and PDF output. No database migration was required because reviewed programs are versioned JSON.
- Partial: publisher editing, meeting assignment, AP revoke and link creation are registered but their natural-language handlers are not yet wired.
- Not done yet: final screenshots and deployment for this owner pass.
- Open gate: the legacy cutover browser harness still expects the old report-save label/route sequence after the section-hub and restored report-form changes. Product build, TypeScript, lint, 101 unit/source tests, bundle isolation, and all 17 PDF goldens pass. Per the two-attempt rule, this harness is recorded open and the owner-redesign branch is not merged or deployed.

---

## Implementation and verification history

# Polish report

Authority: V3-POLISH-ORDERS.md. Refinement work is on `v3/resume`; production remains at the verified NEXT deployment. No polish merge/deployment has occurred.

## Section 1 — front door: partial

Verified generated website root → sole native app at `/app/`, configurable build BASE_URL, manifest id/start_url/scope, worker cache/scope, configured public/share links. Replaced stale parity claims with explicit capability acceptance and retained historical evidence. The standalone-build proof initially failed because its scratch checkout omitted hosting/data/build helper inputs. The harness now includes all native inputs and passes without any V1 root code. Missing restorations block legacy deletion. Repository Pages source setting remains an owner task after HTTP 403.

## Existing refinement evidence

Targeted browser tests pass report corrections/quarter hours/failure retention, AP stale/error/pending states, 12 modal lifecycles, picker keyboard/touch/visual viewport, protected QR dismissal, offline OCLM reload/reconnect with one write, S-140 print/PDF auxiliary visibility and S-89 regression. Latest four added AP/public schedule audit states pass at 390 px, paper, 100% text. This is not complete matrix acceptance.

The previous real nine-font audit measured 8,370 main views with 176 findings, plus 1,890 role views with zero findings. Repairs are under recheck. Earlier theme-reset audit results are invalid and are not release evidence. No contact sheets have been rendered.

## Still wrong / release blockers

Section 1 restorations/legacy cleanup; full V1 report/offline/duplicate flow, AP Undo/audit, app-wide pickers, 1/2/3 classrooms, cross-module load cautions, global overlay rules, enlarged font/viewport matrix, route-module split, translations/privacy markup, new billing/pricing contracts, website baseline lock, complete domain readiness, final CI and live verification. Existing production billing must not be advertised as the new plans before entitlements are implemented.

No new production migration will run without a pre-migration snapshot and additive/down review, as required by the latest orders. No production records were reset. The earlier refinement function migration predates these new orders and did not alter real report rows.

## F1 — publisher gender

One Gender group directly below Full name now offers Brother/Sister with canonical Male/Female values. New publishers have no default; required selection says “Choose Brother or Sister”. Saving also validates the value. Existing records retain their stored gender and unrelated details, including approved household email sharing.

Evidence: three duplicate-form lint-rule unit tests pass; repository form lint passes; TypeScript/build pass; `check-refinement.cjs` passes at 390/1440 with ten dialog cycles per width, no preselection, gender persistence, unchanged address/email, and new shared-email confirmation. The shared lint rule rejects duplicate state bindings in every form. The first browser run had an incorrect expected accessible name (“Gender *”); correcting the test to exclude its aria-hidden decoration resolves it without changing the product label.

## F2 — V1 report restoration: partial

Restored participation zeroing, pioneer-hour/AP inference for public submissions, group selection/filtering on unbound report links, read-only previous reporting month, themed 48 px controls, receipt check animation (respects reduced motion), Submit another and Done. Group-bound links keep group choice hidden. Opening a different token in the same tab resets the prior private form and loads the new context. Revocation deliberately retains data instead of repeating V1's destructive behavior.

Evidence: 12 table-driven V1 rule/boundary tests; targeted phone/desktop browser suite passes group filtering, regular-pioneer AP exclusion, inferred AP status, read-only month, Done, corrections, retained failures, duplicate-click prevention and private-field reset. The initial group test exposed an ambiguous implicit label; an explicit accessible label fixes it. Full offline report queue and duplicate-update consent are not implemented. No false pending/server-receipt claim was added.

## F7 — overlay repairs: partial

App and shared-component toasts dismiss at 5 s (8 s with Undo), pause while hovered/focused and always provide Close. The app mounts at most one notice. Offline/sync banners can be dismissed for 24 h. Update dismissal keys use the waiting worker's actual build version, including a compatibility lookup for old workers. Shared dialogs support guarded header swipe on phones and close after committed route navigation; sign-out clears shell overlay state. Existing dirty guards remain intact.

Evidence: overlay-audit.ts passes exact timer, hover/focus pause, mouse/keyboard/touch close, persisted banner dismissal, changed-state reappearance, guarded sheet swipe and route cleanup. Its composed browser checks pass 12 dialog patterns, 11 setup steps, custom picker visual viewport/keyboard/touch and protected QR lifecycle. Complete install/trial banner and auto-review-inline requirements remain open.

## Section 4 — language/privacy foundation: partial

Added local device language selection and unreviewed machine drafts for the requested Indian scripts (plus the existing Urdu locale). Missing keys fall back to English. Three tests verify draft metadata, fallback, local selection and translation exclusion. The entire app subtree inherits translate=no; the HTML declares google/notranslate. No translation widget or external translation request exists. Settings includes the ordered browser-translation note. Full UI string extraction/translation coverage and human review remain open; these are not complete translations.

## F8 — expanded font evidence: partial

The harness now independently changes Chromium's default font preference to 16/20/24/32 px and asserts the computed root size, separately from CSS text scaling. Widths include 820/1280 and landscape 844×390 / 667×375. The 1,120-view five-theme sample found four Settings note widows and no report/publisher findings. A nonbreaking final phrase preserves the exact visible note and repairs those four; the 280-view Settings rerun has zero findings/errors. This focused sample is not whole-app/site acceptance. No contact sheets were rendered.

## Sections 5–7: not complete

pricing.json records all ordered INR/USD/founder amounts, Lite/Complete lists, founding date, reverse-trial terms and expiry actions. Eight pricing tests pass boundary tiers, pay-for-two arithmetic, exact amounts, founding cutoff and honest null founder-count handling. It is explicitly not activated: server entitlements, live founder counts, Razorpay, invoices/approval letter and expiry flow are still missing. Existing public pricing was not changed to advertise unverified plans.

docs/SITE-DESIGN-LOCK.md records the deployed design reference and permitted edits. The website assets/layout are unchanged. The required screenshot baselines/pixel test remain open. OWNER-MANUAL.md records fallback hosts, intended domain/configuration, provider login and CNAME/snapshot requirements; it is not evidence of DNS/provider changes.

## Publishing

All work remains on v3/resume. Neither repository has received a polish deployment. Pages publishing now also requires the existing check:release parity gate, so successful reduced geometry checks cannot silently authorize a complete polish release. Full CI remains for the end, as ordered; no full-suite green claim is made.

## F9 follow-up

Extracted the publisher editor and its record type from Workspace into a lazy-loaded component (about 8 KiB of source moved; the rest of the route split is still open). Cancel now enters the same dirty confirmation as Close/Escape instead of opening a browser confirm. Publisher/dialog persistence tests pass after extraction. Named BASE_URL values also remove the existing JSX lint extractor warnings; the latest lint output is clean. These focused changes do not satisfy every F9 checklist item.

## Front-door automation repair

Removed the obsolete V2 root Pages publisher and its follow-up verifier. It could compete with the website-plus-app Pages artifact when older flags were eventually accepted. Its unique production-bundle check is retained in the current workflow. The current combined artifact workflow is now the only Actions Pages publisher in the source repository; the separate repository remains an intentional mirror. This does not change the unresolved GitHub Pages branch-publishing setting (HTTP 403). The optional Cloudflare Pages workflow now checks configuration before installing/building, so missing credentials skip cleanly instead of failing a product gate first. No hosting/DNS activation occurred.

## Section 7 — code-side domain readiness

Added SITE_URL plus explicit source/public Pages fallbacks and a pure URL/base resolver. CUSTOM_DOMAIN_READY defaults false. Four tests verify source and public-mirror scopes, confirmed custom root scopes and rejection of unsafe/conflicting URLs. Integration builds pass both fallback and local custom modes: fallback manifest id/start_url/scope are /congregation-assistant/app/ with no CNAME; the explicit local custom test uses root app scope, website /app redirect and the intended CNAME. Both builders restore public-config.json afterward. The custom artifact was tested locally, not committed to the snapshot or deployed; the owner repository switch was not set. OAuth/CORS origins and owner handover are documented.

No DNS, mail, OAuth dashboard or Cloudflare production setting was changed. The existing hosting remains active. Full product gates still block release, independently of this code-side readiness.

### Localized static UI coverage

Extracted 521 static JSX text/accessible-label occurrences across 30 app/shared-UI files into 479 stable English message keys, preserving TypeScript's JSX whitespace/entity normalization. English remains the fallback for unreviewed draft locales. No production/user data was read or sent to a translator; extraction uses source-code literals only. TypeScript and lint pass after extraction. Dynamic option arrays, template/error branches and full reviewed locale coverage remain open, so this is not a claim of complete localization.

## Final local refinement evidence (not phase sign-off)

The expanded before-repair sweep completed 12,474 views across 33 states, nine actual theme fonts, twelve widths plus two short-landscape viewports, and 100/130/200% text. It recorded 57 widows and zero coverage errors: three shared headings, 26 receipt-copy endings and 28 report-number/unit breaks. These are recorded in qa/polish-expanded-before.json.

The six affected states were rerun after repair: 2,268 views, zero findings and zero coverage errors (qa/polish-expanded-after-targeted.json). Headings now wrap without squeezing their title column; report values keep their units; the ordered receipt text is retained with a short “All set.” closing. This targeted rerun does not establish whole-phase geometry acceptance after the shared layout changes. No images were rendered.

The original 60-view regression found ten navigation-overlap states during resizing. ResizeObserver now synchronizes measured navigation/header heights before the deferred adaptation pass; toasts use the measured height and override the legacy pointer-events:none. The real app test now closes a toast by clicking it. The regression detector is unchanged; the harness waits for fonts and agreement between measured and rendered navigation height rather than relying on an arbitrary 80 ms sleep. The expanded alignment detector additionally reports navigation overlap. One earlier run was interrupted by a rebuild and is not counted; frozen artifact support now prevents that race.

The 60-view functional/layout regression passes after the navigation repair, with zero demo cloud requests and zero page errors. A stricter console check then found the test server's missing application/wasm MIME type; its streaming-compilation fallback messages are not waived. After correcting that mapping, the stricter 60-view run passes with zero console errors or warnings. The five duplicate-field lint tests include the original fallback-expression case; the two static-copy lint tests pass. Twenty-three focused Vitest tests pass. Native standalone-build and no-legacy-production-bundle checks pass. No full-suite/CI/deployment sign-off is claimed.

Further geometry checks found 318 navigation overlaps in a 720-view sample, all in short landscape. Removing duplicate wide-screen bottom navigation fixes that sample: 720 views, zero findings. Two short-screen tabs-preference tests verify the header More menu remains reachable. A final 324-view report-fieldset sample passes with zero findings. These scoped runs are not the final whole-app/site gate.

Report requests now carry a link scope: late submission or weekend-session responses cannot replace the currently opened link's receipt, history or session. Pending report fieldsets are frozen, and bulk saves share the synchronous duplicate-submit guard. The refinement browser checks cover these races. The owner-screen translation helper was shadowed by a row variable; it is fixed and protected by two lint tests. Body and portal content now explicitly opt out of translation.

### AP timestamp preservation — local only

The current report trigger changed submitted_at on AP-only updates. The additive migration 20261018152930_v3_polish_ap_review replaces that behavior: inserts and changed activity fields receive a new timestamp; AP-only changes and unchanged saves retain the original. Five synthetic trigger checks pass, including preservation of every field except is_ap on revoke. The encrypted local pre-migration pg_dump archive was decrypted and its restore catalog verified (618 entries). A rollback script restores the prior function without rewriting report rows. No production migration or record mutation occurred. Ten-second Undo, durable AP audit and the final admin/service-only review contract remain unfinished.

## R1 authority and AP completion checkpoint

The later V3-R1-SHIP-ORDERS.md splits shipping into R1/R2 and freezes further translation extraction. Parity/billing/domain work is no longer an R1 blocker; PDF acceptance remains required.

AP Review now uses the requested title/subtitle and Publisher/Hours/Studies/Admin action grid, with phone cards. Revoke and Undo use dedicated authorized RPCs. Audit events are private, append-only to clients, and Undo has a ten-second server deadline, same-actor restriction and intervening-write check. Original report fields including submitted_at are preserved. Admin and field-service review is enforced; group-only manual revoke is rejected. The rollback retains audit history. Local revoke/Undo/audit/expiry/stale/repeated/other-actor/anonymous/cross-congregation checks pass, as does the existing report/auxiliary SQL contract. Browser stale-error/recovery/pending-dismiss/Undo/expiry checks pass; role browser checks are being completed. TypeScript/lint pass. The previously started focused AP sweep completed 360 views with zero findings/coverage errors before the new ≤300-view limit was applied. No production AP migration has been applied.

Picker Home/End now passes alongside type-ahead, empty-result keyboard handling, touch, 200% text, short-screen and pinch-zoom checks. App-wide picker expansion remains R2 unless required for R1 OCLM counselors.

AP role-switch UI smoke remains open: two attempted harnesses did not reach the Reports heading for a group-only session. They are not counted as passed. The server contracts independently prove admin/service access and reject group-only, unapproved, anonymous and cross-congregation revocation. The working AP browser spec still covers revoke, Undo, expiry, pending dismissal and errors.

## R1 PDF and release evidence

All generated text now uses bundled static Noto Sans Regular/Bold or matching Indic Noto Sans, including Odia, embedded as subsets. The Arimo/Helvetica surrogate-width path is removed. Mixed-script runs measure and draw using the same shaped font; digits/punctuation use Latin Noto. Missing HarfBuzz glyphs abort the export. Supplied original templates and their recorded hashes are unchanged; derived -noto templates preserve vector artwork and retype reference-position text with Noto. Decorative dotted lines/checkboxes are vectors.

packages/pdf/layout.ts supplies measured cells with real font metrics, common baselines, padding, shrink/wrap/ellipsis and bounds checks. Existing output calls route through it. S-21 numeric baselines no longer vary by numeral shape, and official centered numeric columns are retained. Emergency rows no longer split: very long fields continue in full-details pages. This intentionally changes the emergency pagination from the old golden while retaining all source fields. S-89 can hide unused classroom choices; the app supplies its saved main/auxiliary setting. PDF fixtures also exercise three-classroom output.

49 PDF fixtures pass the numeric checks: all fonts embedded/subset Noto Sans, missing-glyph guards, page boundaries, shaped-run overlap, sampled S-21 column centres and paired-row baselines. Source-data retention checks preserve long names, remarks and addresses. Seventeen reviewed Noto golden fixtures pass text, page geometry/count and 150-dpi image diff <=0.2%. These replace the old pixel assumptions that depended on other fonts; the original-reference hash gate remains. The first contact sheet exposed oversized emergency rows, which are corrected. Tests do not establish a mathematical proof of every possible string/cell combination.

The final local R1 app sample passes 294 views with zero findings and zero coverage errors (r1-sampled-matrix.summary.json): changed report/schedule/picker/AP states, the ordered five widths plus short landscape, 100/200% text, three themes. Full Actions matrix remains separate. TypeScript/lint pass; report regression includes tab-local offline draft, no false receipt, no automatic reconnect send, explicit manual retry and duplicate-click protection. No translation extraction was added after the freeze.

R1 is not yet deployed at this checkpoint. Production database changes remain pending an encrypted snapshot and release gates. Real phones, printers, WhatsApp delivery and Razorpay are not verified.

## R2, in order

1. Front-door/legacy cleanup and remaining V1 restoration/parity.
2. Pricing config/page activation.
3. Public website visual-lock baselines/test.
4. Owner-controlled domain switch.
5. Translation coverage/review.
6. Billing and payment/invoice flows.

Further R2 refinement includes app-wide picker expansion/virtualization, persisted third-classroom UI, broader same-day duty/weekend workload cautions and remaining form/route-splitting work.

### First Actions feedback

The first release run exposed two test-infrastructure issues before sign-off: the adoption fixture's fixed 2026-W42 had expired in the congregation timezone, and Semgrep's MCP dependency crashed on Pydantic 2.14.1. The fixture now chooses the current congregation week; the unchanged adoption assertions pass in an isolated cloned database. Pydantic is pinned to compatible 2.13.4; the actual Semgrep scan passes 71 tracked targets with zero findings. Neither correction changes product authorization or bypasses a check. The required failed gates will be rerun with these fixes.

Further Actions checks reached the older report-save fixture: its synthetic JWT referenced no auth.users row, so the new audit foreign key correctly rejected it. Adding the corresponding synthetic user fixes the isolated contract without weakening the production FK. Full-history Gitleaks findings were reviewed and recorded as exact historical fingerprints (docs/security-historical-findings.md); the same history scan then reports zero unacknowledged leaks. The PDF schedule test also caught blank booklet padding pages: suppressing whitespace-only text left them without a content stream. Padding now uses a white vector page rather than a fake one-point space; the six layout/large-print preservation checks pass after correction. These fixes are included in the release rerun.

The UI contact sheet found two interaction details that numeric geometry did not cover: Enter report left the inline form below the current viewport, and a prior Save toast could temporarily cover the AP confirmation controls. Enter report now scrolls/focuses the form with measured header clearance; opening AP confirmation clears the prior transient notification. The focus check is added to the existing report regression. This is a post-contact-sheet refinement, so the final UI build must be reverified.

## Full Actions matrix completed

Run 39165554116 on fa661db completed all eight CSS/default-font shards: 37,044 views, zero HARD findings, zero coverage errors, 36 soft typography/spacing findings. Only summary JSON and job conclusions were read; artifact download was unavailable (HTTP 403). Details are recorded in qa/r1-full-matrix.json. The matrix covers 42 screen/state variants, nine fonts/themes, twelve widths plus short landscape, CSS 100/130/200% and independent browser defaults 16/20/24/32 px. Soft findings remain R2 work under the later R1 HARD-only gate.

To obey the credit limit, this complete matrix is retained rather than repeated after the narrow report focus/notification correction. check-r1-full-matrix fingerprints the other UI/runtime/font files and permits only the exact three documented report changes in Reports/theme-bridge. The current workflow reruns all report/bulk/receipt/AP states plus publisher/group entry at the complete geometry/font sizes. Other changes invalidate the proof. The full matrix remains available as an explicit refresh workflow. Current PDF, database, security and app checks still run on the final commit; earlier failed jobs are not relabeled green.

The full-row export was rejected by automatic approval review because authorization for that sensitive payload/destination was not established. No production rows were exported or changed. A narrower pre-migration snapshot contains only the three existing function definitions; additive/down paths preserve every report row and retain audit history. Production migration is still pending current release checks.

The final auxiliary SQL fixture had the same UTC/congregation-week rollover issue; it now derives its test week using the actual congregation timezone and the unchanged auxiliary privacy assertions pass locally.

The older PDF browser spec still expected a preview UI, which the owner explicitly removed. It now tests the direct Download flow, all eight selectable script samples, emergency offline regeneration, no preview/modal and demo isolation. In two local prefixed-app runs, those export assertions completed but the isolated app-only server lacked the parent project-level meetings/status.json and the zero-console assertion failed. That prefixed harness variant remains open per the two-attempt limit; no console-error waiver was added. The current native-root CI server includes dist/data and must independently pass this spec before release. The real packaged-site browser check already serves both app and parent data and passes with zero errors.

The final report-only matrix on 3013329 completed all eight shards: 8,820 additional views, zero HARD findings, zero coverage errors and 12 soft findings. Its exact UI/font fingerprint is recorded in qa/r1-report-delta.json. Subsequent changes are test-fixture/spec and documentation corrections; the release gate reuses this verified, identical UI rather than rerunning geometry. Both complete/full and report-only refresh workflows remain available, and either fingerprint gate fails on unmatched UI changes.

Two older auxiliary workflows used ambiguous selectors after native feature restoration: the V2 cutover harness matched all three illustrative greeting headings plus the live heading, and the V3 shell harness matched both publisher search and the S-21 shortcut. The shell spec now explicitly chooses the publisher result. The legacy cutover/V2 parity workflow remains manual/scheduled for R2 rather than duplicating the current 37,044-view R1 matrix and current native smoke suite on each PR. Its old selector is not counted as repaired or passed.

The production AP migration is narrowed to the affected report RPCs, timestamp function and new private audit APIs/table. An unrelated roster helper declaration/grant was removed from the migration/rollback, leaving that live roster API unchanged. The function-only snapshot therefore covers every pre-existing function being replaced.
# V3 final refinement candidate — 20 October 2026

The canonical repository is now `photographicode/congregation-assistant`; its generated website lives at `/` and its app at `/app/`. The branch removes the retired root V1 app, duplicate `v2/`, staging, preview, archive and experiment trees while preserving the immutable `v1-final` tag and `tests/golden/v1/`. CI is consolidated from 17 workflows to five. The old public repository is converted to a redirect only after the canonical deployment passes its live check.

The supplied dialog layer is imported byte-for-byte after the bridge. Computed checks across all nine themes confirm opaque dialog backgrounds, scrim alpha >= .40, visible borders/shadows/tone strips and text contrast >= 4.5:1. Aurora and Lagoon use fixed pseudo-layer artwork, solid tinted card/list surfaces and at most the top bar, bottom bar and hero as blur layers. The 10-view interaction audit covers all visible controls on Home, People, Reports, Midweek and Settings at 390/1024 px: 0 HARD and 0 soft findings.

PDF evidence: 14 V1 geometry fixtures pass with 0 failures; 49 S-21/S-88/S-3/S-89/S-140/Emergency and schedule fixtures pass with 0 HARD findings; 17 reviewed Noto goldens pass text/page/pixel parity; 3,433 source-data assertions and 200 randomized cell-layout runs pass. S-21 check marks are two-stroke vector paths centered from the box rectangle. One six-form contact sheet was reviewed.

The Main Admin Home assistant now supports exact-name commands such as “S-21 for Maria Thomas” with immediate local PDF download and “record midweek attendance 85” with current-meeting/date review before saving. Ambiguous publisher names require a choice. Parsing/review sends no command text, changes no browser storage and makes no request; non-admin roles have no assistant entry point.

Local bug-bash status: Sev1 0, Sev2 0. The final 180-view sample covers five widths, 100/200% text, Mono Light/Lagoon/Aurora and six touched screens with 0 findings and 0 coverage errors. The complete Actions matrix, three-browser smoke, database contracts and history security scanners remain required before merge/deployment. External limitations remain real phones, physical printers, WhatsApp attachment delivery, Razorpay and real-user Google sign-in.

---


## Measured S-21 and system-page release — 21 October 2026

The S-21 overlay now uses 33 stored vector-square bounds from the actual Noto template drawing operators, rather than hard-coded centres. All marks use a shared clipped, round-cap/join 0.9-point path. The rebuilt S-21 template uses original left coordinates for labels/months and original baselines. A rendered fictional dense fixture was visually reviewed. Original supplied template hashes and frozen V1 goldens are unchanged; corrected S-21 pixel references are separately retained in `tests/golden/s21-measured`.

Local evidence: 279 checked-square vector centre/containment checks, 14 dense-fixture checkbox raster checks at 400 dpi, 14 V1 geometry fixtures, 17 unchanged-original-template/font contracts, 3,433 source-data assertions, and 17 reviewed pixel/text/page baselines pass. Header left-coordinate spread <=0.2 pt; month left-coordinate spread <=0.25 pt. There are 11 registered themes after Noir Pop removal; saved `noir-pop` resolves to Eclipse. Contrast: 429 checks, zero failures.

SystemPage provides focused headings, error/status semantics, noindex and non-personal reference details. Eleven states are reachable by `?system=...`; the runtime connects global exceptions, HTTP 401/403/429/500/503, offline events/probes, constrained connections and storage/browser failures. Existing forms remain mounted beneath recoverable system failures. Static 404/offline/maintenance pages and no-JavaScript notices are packaged for the canonical website/app. The service worker precaches the offline fallback without silently activating updates. System checks pass 198 responsive views and 33 axe scans plus offline/no-JS/private-diagnostics checks. This is a sample, not a complete physical-device matrix.

Publisher editing now shares its save action with the UI and supports name, gender, DOB, baptism, group, contact, appointments/pioneer flags/SFTS and emergency fields. Parsing/preview is local; confirmation reloads the current field/login expectations before the existing atomic API. Publisher Undo rechecks the changed field. AP revoke/Undo use existing protected report APIs; group link create/rotate/revoke share UI actions; explicit-week meeting assignments validate the saved program, roster, qualification/availability and display duplicate-use cautions before saving an unpublished draft. No production migrations were performed. The admin browser spec passes direct S-21, attendance preview/save, publisher-preview zero-network/zero-storage and four non-admin denials. Local lint/type/unit checks: 26 files, 191 tests, plus 79 script tests.

Open scope: natural-language duty assignments/unassignments, general conversational plans/relative week resolution, universal assistant registry execution and `via assistant` audit tags, full lifecycle undo/restore parity, production-signed-in acceptance of the newly connected actions, and system-state recovery details (actual Lite/Subscribe backend lifecycle, precise server Retry-After, session-return integration, full slow-network/blocked-storage automation). Those are not claimed complete. No synthetic success replaces an unavailable backend feature.

The cutover harness now reaches and saves the restored form, then exposes a later publisher-route expectation; the PDF browser harness advances beyond the removed disclosure but its emergency download continuation remains open after two local attempts. These failures are not reclassified as passes. Full gates remain visible in Actions; existing owner-authorized deployment configuration still requires core CI and final-release validation. Real phones, printers, WhatsApp and Razorpay are not verified. Canonical/public live deployment results are recorded after publication.

## V3 quality sequence — 22 October 2026

The owner’s supplied QUALITY orders and CHECKLISTS are the current authority. The prior release override is revoked for this work: the canonical deployment once again depends on browser/PDF workflows, and new quality jobs are mandatory inside reusable CI. Production is not changed by this branch.

Foundation: native ESLint 9 bulk suppressions baseline existing debt; new violations and unused suppressions fail lint, and a separate check forbids suppression growth. Type-aware rules, strict a11y/hooks and component-size/complexity rules are enabled. Stricter unchecked-index/return/override/checked-JS diagnostics are a separate required CI gate pending source conversion; the default app tsconfig is not falsely described as fully migrated. Stylelint, architecture, cycles, unused-code, duplication, CSS targets and coverage thresholds are installed and required; installing them does not count as satisfying their findings.

Mechanical buttons: a ts-morph codemod added 205 explicit native types, identifying eight form-submit primaries. A second codemod moved 191 app buttons across 32 files onto the shared Button primitive with a button default that preserves explicit submit types. Existing lint/type/unit checks pass (191 Vitest tests and 79 script tests), and production build/bundle pass. Browser characterization and stricter acceptance remain required. This is not a completed Q2 claim.

Supply-chain preparation: 35 existing workflow action references are pinned to upstream-resolved commit SHAs. CODEOWNERS, PR checklist, CONTRIBUTING and Changesets preparation are present. No price/plan, production data or locked-website design changes. Full CSS/type/coverage/security/component-extraction targets remain open in docs/engineering/OPEN.md. The owner’s supplied D1–D7 counts remain the starting diagnosis; audit-script scopes are recorded separately rather than presented as artificial improvements.

Q2 continuation: 19 empty catch clauses and seven empty Promise rejection handlers now record sanitized, bounded, rate-limited diagnostics in device memory. Five property/unit tests prove message/stack exclusion, no storage/network, bounding and explicit fallback intent. Twenty-four direct preference calls now use a guarded compatibility facade; three tests cover blocked storage, memory fallback, legacy JSON and schema/version validation. The compatibility path preserves existing stored formats while typed keys/envelopes are available for further migration.

Startup configuration now validates HTTPS origins, local base paths, booleans, email addresses and public-only API key roles; seven tests include privileged-key rejection. Eleven literal timer delays use shared TIMING constants. Literal English strings were extracted without changing their values into `locales/en.json`; twelve draft catalogues load as local chunks with English fallback and a revision snapshot for subscribed views. Existing language/privacy tests pass. The default compiler and ratcheted lint pass after pruning obsolete debt; suppression count shrank from 681 to 655 before the final catalogue cleanup. No suppression count was enlarged.

The new coverage gate correctly fails: existing native tests cover 5.27% of the global included app/core/layout lines, 77.82% of core lines, and 43.33% of PDF-layout branches. Targets remain 70/85/95; no thresholds were lowered. These diagnostics are accepted work, not a completed Q1/Q2 or a release sign-off.

Quality characterization found and fixed a real picker activation bug: 40 native label wrappers around custom comboboxes became non-label field containers, so choosing an option no longer synthesizes a second trigger click. Thirty-three previously implicit custom-select labels are now explicit. The PDF browser contract advances through its actual downloads, eight-script shaping and offline generation, but the unchanged zero-console gate still rejects an intentional offline version HEAD probe; it is logged in OPEN rather than waived.

Source dependency analysis passes. Extracting shared Context out of the entrypoint and the unchanged plan schema into pure core removes all reported type/module cycles; Madge now reports zero. This changes no prices, entitlement behavior or provider settings. The native lint baseline shrank from 681 to 651. Production SBOM generation and its licence policy pass for 100 third-party components; four verified first-party workspace components retain the existing proprietary root LICENSE. A dedicated immutable-action security workflow now covers full-history secrets, Semgrep SARIF, public-repo CodeQL, npm audit, OSV and SBOM/licences. Its runtime results remain unverified until Actions run. Public-schema enabled/forced-RLS is a hard isolated-DB CI gate and refuses an empty database; no production migration has been applied.

### Quality batch: current-source evidence and layout foundation

- Release checks reject stale interaction/dialog proof using a source/policy fingerprint. CI uploads fresh UI evidence and deploy consumes the same workflow run's artifact. Dialog checks and the default refinement matrix use all 11 registered themes.
- Shared Page/PageHeader/Stack/Inline/Grid/Split/Toolbar/FormRow/TableShell primitives preserve forwarded attributes and classes; Field connects labels, hints and validation errors to controls. Two accessibility contract tests pass. Home begins adopting Stack/Inline/Card; this is not an all-screen migration or a completed styleguide.
- Existing checks passed: 207 Vitest tests and 82 script tests before the new Field/fingerprint tests. Field tests (2), fingerprint invalidation contract, and immutable workflow-ref/default-permission checks (47 references) also pass separately.
- Build passed. The unchanged PDF browser test now passes all download/shaping/offline/zero-error/demo-isolation assertions after suppressing unnecessary connectivity requests while already offline.
- The 30-view Home sample failed (749 HARD, 17 soft); narrow-table and privacy-note corrections are implemented pending next-batch characterization. Full geometry is not accepted. Strict types, legacy Stylelint/CSS targets, unused/duplication, coverage and database/security runtime gates still block merge/deploy.

The final local check for this batch passed 209 Vitest tests (30 files), 83 script contracts, default TypeScript and ESLint. The suppression baseline remains 651, down from 681. Deployment permissions now escalate Pages/OIDC only in the Pages job; other jobs default to contents-read. CI quality runs on the quality branch and checks bundle size after building.

### Quality feedback: Actions and responsive table correction

At b38411b, the 30-view Home sample reaches zero HARD findings, with 17 soft text-wrapping findings still open. See docs/qa/quality/home-layout.json; this remains a limited sample, not full-product acceptance.

Actions confirms architecture, cycles, duplication, lint-ratchet, Semgrep and CodeQL pass. Strict typing, CSS/style, unused, coverage and forced RLS fail as expected from the open work. The public-safety test fixture and a precisely scoped historical Gitleaks catalogue-key false positive were corrected without disabling scanner rules.

Vitest/coverage 4.1.12, Wrangler 4.151.3 and fflate 0.8.3 address fixable dependency advisories. The upgraded suite passes 209 Vitest tests and 83 script contracts; build passes; production npm audit reports zero vulnerabilities. The reproducible lockfile production SBOM passes the unchanged licence allow-list. OSV results for the upgraded lockfile are pending; the unfixed braces advisory is explicitly open. No release was merged or deployed.

### Focus cascade and final evidence refresh

The fresh interaction audit exposed invalid shared focus outlines: an undefined --ring token won the cascade, and two rules treated the complete --focus-ring shorthand as a color. Those rules now consume the theme-owned outline token correctly, without changing supplied themes or audit assertions. The rebuilt 10-view interaction audit passes 0 HARD / 0 soft findings; all 11 dialog themes pass and share the current source fingerprint. The final-release evidence subset passes, and the final direct-download/eight-script/offline/demo-isolation PDF browser contract passes again.

Actions on 42ade4c passes Gitleaks, Semgrep, CodeQL and policy checks. Its OSV artifact is reduced to one unfixed braces 3.0.3 advisory. No OSV exception was added. Six ADRs now record the stack, Store, Vault acceptance restriction, layout tokens, database authorization and deployment decisions. Evidence generation maps 96 checklist requirements conservatively: 5 verified, 17 partial, 74 open. Partial marks do not assert that the whole requirement is met.

Review: https://github.com/photographicode/congregation-assistant/pull/58 (draft). All changes remain on v3/quality. This phase is incomplete: Q3-wide CSS reduction, full Q4 library/styleguide and screen adoption, Q5 extraction, snapshot-backed Q6 hardening, remaining Q7 security controls and Q9 operational/legal evidence still require work. Production remains at the previously verified release; nothing from this quality branch was merged or deployed.

### PR #58 owner-authorized release — 2026-10-22

The owner explicitly overrides the previous all-quality-gates release hold and requests deployment of PR #58. The broader quality backlog remains open and is not relabelled complete. A one-time [owner-release-58] merge marker permits this release through deploy.yml; subsequent ordinary releases retain their existing gate dependencies. The override build still compiles/tests the application, generates fresh interaction/dialog evidence, checks the screenshot regression and PDF browser paths, and verifies the published commit. No database migration is included.

Fixed Monthly submissions search/filter collapse: search now precedes the filter group in shared Stack layout, and segmented buttons use content-based widths with a minimum readable width and normal word wrapping. This prevents the single-character columns and stretched search input shown in the owner's screenshot. The PDF browser contract passes. Layout/selection verification covers 320, 390, 600, 768, 1024 and 1440 pixels at 100/200% text; the full quality/security backlog and its known failures remain visible in CI.

The initial PR #58 release run 39750608262 built and verified successfully, but GitHub skipped Pages through its implicit skipped-ancestor status check. Publishing now explicitly requires always(), a successful build, main and the Pages target. This preserves the successful-build requirement while allowing the owner-authorized release exception to reach publication.


## V3 Launch Hardening — 2026-10-23 (in progress, no release claim)

Authority: [launch orders](V3-LAUNCH-HARDENING.md). No production records or schema changed. The previous PR 58 one-time gate exception is not reused.

| Item | Command / evidence | Result |
|---|---|---|
| Engineering rules | `AGENTS.md`, `docs/DECISIONS.md` | Verbatim rules recorded; prior decisions retained. |
| Legacy website | `scripts/build-marketing-site.mjs`, `apps/site/README.md` | Duplicate `site/`, HTML/Android/download templates and unused trust generator removed; help/install and downloadable text guide generated. Design lock preserved at `docs/SITE-DESIGN-LOCK.md`. |
| Built metadata and internal links | `node scripts/site-audit.mjs` | 196 pages, zero static failures after shared generator fixes. Covers titles/descriptions, locale alternates, canonical, image metadata, favicons, copyright, placeholders, links/anchors and button types; not proof of all owner criteria. |
| Responsive matrix | `node scripts/site-audit-browser.mjs` | First completed run: 1,464 views, 79 oversized marquee spans, zero document horizontal scroll failures. Constrained decorative strip; final run PASS: 1,464 views, zero failures. |
| Normal application checks | `npm run check` | PASS: lint, application TypeScript, 213 Vitest tests, 83 script tests at run time. Added artifact regression test separately passes. |
| New input limits | `npx vitest run tests/v3/input-limits.test.ts tests/v3/edge-origins.test.ts` | 5 pass. Shared Zod validation applied at publisher save/public report submit; visible fields bounded; studies 99/comments 500. Complete all-input/all-RPC coverage remains open. |
| Exposed artifact guard | `node scripts/check-published-files.mjs dist`; `node --test scripts/v2-tests/published-files.test.mjs` | Zero findings in current app output; regression rejects SQL/maps/private dirs, oversized files and secret patterns. Guard wired before Pages upload. |
| Full-history secrets | `work/gitleaks git --log-opts=--all --config .gitleaks.toml --redact ...` | 309 commits, 22.61 MB, zero findings. |
| Independent history scanner | `work/security/trufflehog git file://. --only-verified --fail --json` | 10,887 chunks, 17,554,594 bytes, zero verified and zero unverified secrets. Pinned binary checksum and CI command added. |
| Production dependencies | `npm audit --omit=dev --audit-level=high` | Zero vulnerabilities; OSV is separate and unresolved braces advisory is not waived. `docs/engineering/DEPENDENCIES.md` records plans; no bulk major upgrades. |
| Workflow policy | `node scripts/check-workflow-security.mjs` | PASS: 51 immutable action references, read-only defaults. |
| Production password/RLS/advisor audit | Supabase `execute_sql` metadata query and `get_advisors` | Both rejected: “You do not have permission to perform this action.” No results claimed. Existing guarded legacy-auth migration/down retained; fresh schema no longer creates password columns/table. Read-only CI password-column guard added. |
| Retired function / CORS | Deleted owner-password-session source; shared exact-origin guard, tested allowed/hostile origins | Source fixed. Remote deletion and deployment of worker changes unverified; `OWNER-TODO.md`. Server-only functions still require service authorization and do not grant browser CORS access. |
| Strict quality types | `npm run check:strict-types` | FAIL: 447 diagnostics, no relaxed configuration. |
| CSS budgets | `npm run check:css` | FAIL: 108,052 bytes / 44 sizes / 21 radii / 10 breakpoints / 36 important / 102 feature classes. Targets unchanged. |

Remaining launch gates: every anonymous RPC rate limiter and two-token/11th-request tests; shared SQL boundary checks; exhaustive role × function matrix and forced-RLS repair verified on an isolated schema; production advisors; production snapshot and schema rollout; contact/application server delivery with Turnstile/rate limiting and error/retry tests; first scheduled external-link result; mobile Lighthouse ≥95; reference visual lock; live unknown-URL HTTP404 and complete live audit; coverage/style/unused/geometry backlog from quality orders. Current app has an honest mailto contact action; no server-send success is claimed. Guide/trust copy in non-English pages still needs translation review. PNG/ICO icons are required-format exceptions; other shipped raster imagery is WebP.

Not verified: real devices/printers, independent penetration test, production database audit, remote Edge Function deletion, DNS/mailbox/Cloudflare configuration, or new deployment. Supabase denied project-scoped audit access; GitHub Pages settings require owner administration. The competing branch publisher can overwrite Actions artifacts until Source is GitHub Actions. No guarantee of being unhackable is made.


### Final artifact follow-up
The assembled Pages artifact initially exposed 61 metadata/base-link failures because `build-system-pages.mjs` overwrote generated marketing system pages. Marketing 404/offline/maintenance now use the authoritative generator; the app retains its own system pages and explicit noindex. `SITE_AUDIT_ROOT=work/pages SITE_AUDIT_URL=https://photographicode.github.io/congregation-assistant/ node scripts/site-audit.mjs` passes **224 pages / zero failures**. This check is now invoked by `build-pages.mjs` before upload. The expanded assembled-artifact browser run PASS: **1,672 views / zero failures** at the real Pages base path.

A compiled-output probe found 10 `console.log` calls and zero debugger statements. Vite now strips log/debug calls and debugger statements; the published-file guard rejects residual debug calls, with a regression test. Rebuilt Pages artifact PASS: no residual console.log/debugger matches, no prohibited files/credentials, and 224-page static audit remains green. Initial app JS is 180,364 bytes gzip. Weekly external HEAD checking is wired only to scheduled/manual runs; it cannot fail a PR. Workflow policy now covers 54 immutable action references.

CI database result: password-column gate PASS; RLS gate FAIL on 16 enabled-but-not-forced tables. This is a reproduced security gate failure, not a passing isolated database audit. See Actions run 39913848298 (database job 120282778962). No production ALTER/DROP was attempted.

Current PR CI security jobs: CodeQL PASS, Semgrep PASS, secrets PASS, workflow policy PASS; dependencies FAIL (OSV). Database password-column check PASS, forced-RLS check FAIL. These failures remain release blockers. PR: https://github.com/photographicode/congregation-assistant/pull/59.

## Close blockers — 24 October 2026

Latest authority: `docs/V3-CLOSE-BLOCKERS.md`; production evidence is still unavailable. Supabase rejected RLS metadata, role flags, advisors and Edge Function listing. See `docs/qa/PROD-DB-ACCESS.md`; no `PROD-DB-AUDIT.md` result was invented.

RLS gate changed per owner correction: enabled RLS and reviewed policy-backed grants, no forced-RLS blanket requirement. It caught unbacked owner-table write grants. Permission-only migration ran twice on isolated PostgreSQL 17; down restored the expected rejection; corrected fresh setup ran the complete `scripts/check-supabase.sql` suite (19 PASS markers, zero errors), then `scripts/check-rls.sql` and `scripts/check-no-password-columns.sql` passed. All 16 public tables classified in `docs/security/RLS-TABLE-CLASSIFICATION.md`. No production schema/data change or snapshot claim.

OSV: downloaded the failing CI scanner JSON (run 39913848072): only GHSA-vfj7-8cjw-p6xm on braces 3.0.3. `npm explain braces` confirms dev tooling, `npm view braces version` confirms no newer fix. Single-ID review expires 2027-01-15; graph/expiry guard PASS; production npm audit PASS (0 vulnerabilities). OSV scanner result with the reviewed exception is pending new-head CI; no blanket ignore. See `docs/security/OSV-REVIEWS.md`.

OSV feed follow-up: run 40006331896 no longer reports braces (unused ignore) and reports production Zod GHSA-mrhx-c7xc-m3w5, fixed >=4.6.6. Removed the stale ignore, pinned app/core Zod 4.6.7; strict diagnostic ratchet remains 434/434 with no changed-file findings. Fresh OSV result pending. No active exceptions remain.

Ratchets: strict 447 → 434, with zero diagnostics in changed PR files; new-diagnostic regression probe correctly fails, then clean strict gate passes. CSS measured budgets pass with targets retained. Coverage re-measured with Vitest 4.1.12 and current-level global/scoped thresholds pass (214 tests); future baseline lowering is rejected. `npm run check` PASS: lint, normal TypeScript, 214 Vitest tests, 85 script contracts. S-21 existing measured test PASS: 279 vector ticks and 14 checked-box raster centres at 400 dpi; no fixture/golden changed. Expanded missing containment/row tests and RPC matrix remain work.

PR hygiene: inventoried all 12 open PRs with branches, dates and diff sizes; no small PR was wholly green. Incorporated QR type patch #44 and Zod #50, closed those plus superseded legacy/action PRs #7/#37/#42/#43/#45/#46/#47 with replacement comments. Preserved branches; API confirms exactly three open (#59/#49/#51). #59 has security/ui/db/docs labels. Inventory: `docs/engineering/PR-INVENTORY.md`.

Deployment workflow: removed the old owner-release-58 marker bypass; ci/security/e2e/pdf success is mandatory. Website CI now builds/audits the assembled Pages artifact at its Pages base path. YAML parsed, workflow immutable-action/default-permission policy passes. Hosting target unchanged. No deployment performed yet.

Unused gate now passes after workspace/entry-point corrections, explicit dependencies, stale-tool removal and private helper exports. No broad unused-code ignore. Preserved shared component APIs are exercised by a test-only browser fixture: actions, switch, picker, numeric bounds, Monday normalization, wizard, keyboard tabs, sorting, dialog/sheet Escape+focus, toast Undo, QR output and field associations; 320/768/1440 layout checks PASS, zero browser errors/external requests. Five retained crypto/device/role/history contracts and 100 existing parser/config/navigation tests PASS. Strict diagnostics 434 → 425, zero in changed files.

Stylelint retains all rules under the authorized CSS no-growth interpretation: 452 unchanged findings, no new findings and changed CSS must be clean. Negative regression probe PASS. Full raw command remains `check:style:all`; zero-finding target stays open. CI now cancels obsolete branch heads, protects main, and keeps full geometry shards scheduled/manual while retaining sampled PR HARD checks.

RPC matrix: all 106 signatures, anonymous/authenticated/service grants, fixed search_path and 16 caller contexts pass **1,696 / 1,696**. Includes all ten other-tenant role presets (authorized in their own tenant first), household, unapproved account, non-Google owner email, SuperAdmin and service worker. Every attempted write rolls back; fixture identities/links are cleaned up. Existing positive/concurrency SQL suite remains mandatory. Fixed a missing persistent auth.sessions mock rather than accepting a missing-table error. Source manifest and scope expectations documented in `docs/security/RPC-MATRIX.md`; CI artifact records each outcome. No production database assertion added.

S-21 launch hardening: independent 400-dpi tests cover all 33 checkbox positions, 362 visible ticks and 840 rows. Maximum visible tick delta 0.337pt and row delta 0.76pt; HARD 0. All labels/months checked. Separate variant geometry HARD 0 (3 pages); canonical 17 reviewed PDF goldens and 14 V1 comparison fixtures pass unchanged. Release consumes PDF evidence from its own workflow run.

Fresh-head CI exposed two test-environment issues: verify checkout lacked the base ref required by ratchet regression probes; added full history. UI contract checked restored focus before the scheduled restoration completed; now waits for the actual opener to become focused and still asserts focus identity. No product or tolerance change.

Deployment protection: the previous run's artifact has expired, so the workflow reconstructs source 151396149ad8942ecd331230eb86d1395c3d4f1b and retains it as `rollback-pages-1513961` for 30 days before publishing. This is a rebuilt rollback artifact, not a recovered byte-identical historical upload. New Pages artifacts retain 30 days. The canonical publisher waits for same-commit branch publishing to finish, then verifies every public file against the approved artifact, scans downloaded live bytes and audits their 224 pages. Host control files (.nojekyll/_headers/_redirects/CNAME) are explicitly excluded from HTTP checks. A regression test rejects stale live HTML. Pages source still needs the owner setting to prevent future branch publishing.

Final local full check after retained-security/API tests: `npm run check` PASS: 219 Vitest tests (33 files) and 87 script contracts, including stale-live-byte rejection. Workflow policy PASS: 63 immutable action references. Final-head Actions remain authoritative for merge.

Clean-runner follow-up: focus restoration now passes in Actions. The contract then exposed a missing report-directory initialization (ENOENT); create work/quality before saving its result. This is a separate setup defect, not a second failed focus correction; browser assertions remain unchanged.

Final-head 079b583: CI (including 224 pages/1,672 views), security and PDF PASS. Browser job 120632748654 timed out during Playwright OS dependency download on Ubuntu 26.04; no app assertions ran. Logs identify 142MB/185 new apt packages, stalled on libflite. Pin affected browser/PDF/Pages jobs to ubuntu-24.04 and bound installation; final-head gates must run again. No passing browser result or deployment is claimed from that cancelled job.

Runner correction follow-up: 297ed5e CI/PDF checks passed, but browser setup again timed out at six minutes on slow azure.archive package downloads. Switch e2e apt URLs to the official HTTPS Ubuntu archive, keep package signatures, all engines, assertions and timeout unchanged. This is the second targeted infrastructure correction; no passing browser/deployment claim yet.

Official Ubuntu archive correction resolves installation: browser job 120647854437 passed shared UI, resume, system-page, admin-assistant and dialog checks. It exposed an existing immediate focus assertion in check-refinement: Reports intentionally focuses Publisher in requestAnimationFrame, but the test read before that frame. Wait for the actual Publisher element to receive focus, retaining the original identity assertion; no manual focus or product behavior change.

Local reproduction corrected the timing hypothesis: waiting alone still fails because Reports queries only select/input while Publisher now renders a custom combobox button. Focus the first combobox/select/input instead. Adapt affected refinement/AP/download/matrix automation to the existing selectControl helper, checking real option values, filtered availability, selected values and disabled state. Preserve the focus assertion and all report/AP/download contracts. No custom control is replaced by a native control.

Close-blockers report correction verified locally: full refinement behavior PASS at 390/1440px; AP stale-write/conflict/recovery/Undo PASS; 26 direct downloads PASS (maximum 945ms); shared component keyboard/virtual table/dialog/axe contract PASS. Seven new network-error unit tests PASS. Lint, strict ratchet (425 legacy diagnostics, zero failures/changed-source diagnostics) and unused graph PASS. Source changes: focus the actual custom Publisher combobox, and keep handled POST errors inline without automatic retry or a global page takeover. Adapt browser automation to real custom option selection/value/filtering; retain explicit assertions. Full fresh-head Actions and post-deploy proof remain required.

Post-resume release corrections: fresh OSV feed found three Undici advisories in dev-only Wrangler → Miniflare; scoped override upgrades Undici 7.29.1 to fixed 7.30.1 without an exception. Wrangler CLI loads and production npm audit reports zero findings. Dialog diagnostic reproduction found an actual 200%-text crash: accessibility ResizeObserver synchronously measured/wrote layout tokens. Defer through the existing animation-frame scheduler; retain all global error handling. All 12 short-screen/200%-text dialog scenarios now pass close, Escape, outside click, focus restoration and zero runtime errors. Bulk handoff closes Month tools and explicitly returns focus to its trigger, leaving no overlay behind. Picker keyboard/touch/pinch/Indic stress and protected QR lifecycle pass. Shared UI contracts pass.

Touching shared components burned down six existing strict diagnostics (425 → 419), introduced no changed-source diagnostics, replaced legacy magic numbers with named constants/shared TIMING at unchanged values, and pruned 16 obsolete ESLint suppressions. Lint, strict types, unused graph and lint ratchet pass. No rule disabled or new suppression added. Final-head Actions and live post-deploy checks remain required.

Clean Actions install caught npm 10 incompatibility in the nested dependency override before tests ran. Replace it with the exact-version `undici@7.29.1` → 7.30.1 override. Regenerated/validated with npm 10; real clean `npm@10.9.4 ci --ignore-scripts` PASS (954 packages/13s), installed graph 7.30.1. No install gate waived and no test failure relabeled.

Rendered contrast: the existing checker treated transparent CSS text color as invisible foreground for gradient-clipped greetings. Measure actual browser-painted foreground pixels separately from panel pixels, retain every contrast threshold and panel check, and reject an intentionally invisible gradient in a one-view negative control. Corrected measurement found two real Neo Brutal greeting failures (3.087 /4.396 against 4.5). Use the existing text token for that component's gradient accent; supplied theme definitions unchanged. Full rendered check now PASS: 108 views/3,349 pairs/zero failures. Invisible-gradient negative control correctly fails contrast. Stylelint ratchet PASS (changed CSS zero findings), CSS metrics PASS and byte budget shrinks 108052 →108033 by moving a redundant CSS header explanation into this record. The artwork remains on the fixed pseudo-layer, never a fixed body background. Workflow policy PASS: 64 immutable refs. Evidence uploaded as current-contrast-evidence; fresh-head CI remains required.

Three-browser smoke harness diagnosis: the dated greeting rotates through valid phrases such as “Afternoon,” outside the old /Good |Welcome|Hello/ matcher. Its failed assertion leaked an open browser, leaving the job running. Assert the stable Monthly submissions heading and a non-empty heading within Your day; retain the Admin assistant and browser-error checks, close each browser in finally, and bound this step to four minutes. Record only exact intentional HEAD /version.json AbortController cancellations separately; every other non-Supabase failed request still fails. Chromium preflight PASS with zero browser errors/unexpected failed requests and one recorded cancelled health probe. Firefox and WebKit remain mandatory in CI; no cross-browser pass claimed from the local preflight.

## V4 publisher-first candidate — 2026-10-26

Owner decisions and implementation are documented in docs/V4-RELEASE.md. Existing V3 freezes are superseded by the explicit V4 request; release checks remain intact. Independent review findings about persisted overlapping away ranges and publisher accessibility settings were fixed and verified. An additional regression test preserves exact contact snapshots for optimistic concurrency.

Observed checks: npm run check (231 unit tests plus 90 script contracts), lint, strict-type ratchet (419 historical diagnostics, zero new/changed-file diagnostics), Stylelint ratchet (191 historical findings, zero in changed styles), CSS budget, architecture/cycles/unused/duplication, size/bundle checks and coverage. Native PDFs: 17 golden fixtures, 3433 source-data assertions and eight scripts. Publisher browser: two widths, contact/time-away/appearance/More/report/meeting/announcement workflows, zero Axe violations, browser errors or cloud calls. Existing browser sample: 60 responsive S-21/search/assignment views and 16 focused workflow views pass; 15 navigation hub views pass; all 12 dialog lifecycles, 200% text, pinch zoom, long Indic options and protected QR pass. System states pass 198 responsive views/33 Axe scans. Direct downloads pass 26 cases. Website routes/no-JS/dark appearance and six retained script-locale routes pass.

Production V4 additive schema is applied and freshly metadata-verified; see docs/qa/V4-DB-VERIFICATION.md. Local migration filenames match recorded production version 20261026183947. No existing rows erased. Source is in PR #75. Final CI/merge/deployment is pending; these local checks are not a claim of deployment or full historical feature parity.

V4 follow-up: all 11 active-theme font/preload cases pass with original theme font choices retained; interaction audit checks 10 views with zero HARD findings, including the keyboard-only skip link. 108 rendered-contrast views/3128 pairs pass. Native offline draft/reconnect, meeting-source rendering and weekend assignment checks pass. Chromium cross-engine smoke passes locally; Firefox/WebKit executables are unavailable locally, so those results depend on CI.

V4 shared-component correction: mobile dialog geometry now belongs to Dialog itself, so standalone components receive the same reachable controls as the app. check-v3-ui and check-ui-kit-contracts both pass. Contact/time-away/announcement inputs are disabled while their save is pending, preventing edits from being overwritten by the completed request. Final local app pipeline passes 231 unit tests/90 script contracts, assembled Pages safety/224-page audit, publisher two-width workflows with zero Axe violations and zero backend calls, 10 interaction views with zero HARD findings, and 180 responsive views with zero HARD findings/coverage errors. The responsive sample retains 43 soft findings; interaction retains 96 soft findings. These are not full-product/nightly parity claims.

V4 release follow-up: production smoke test now asserts the redesigned headline and passes locally against the full 224-page artifact. Final local check: 231 unit tests and 90 script contracts passed. CI secret scan identified the literal SQL relation name ca_private.v4_announcements as a generic key; only its exact introducing commit/path/line fingerprints are excluded. Dialog keyboard lifecycle tests now wait for modal focus before sending Escape, matching keyboard interaction readiness. Owner deletion of root CNAME is retained.

System-state audit timing: measured Aurora theme switching showed foreground colors update immediately while button backgrounds retain previous theme colors during a CSS transition (Search briefly light text on white; final background rgb(26,18,69)). The audit now waits for actual CSS transitions and font readiness before measuring final theme contrast; no contrast rule is disabled. All 198 views and 33 Axe scans pass locally. The Gitleaks explanatory comment itself was subsequently classified as the same SQL-name false positive; its exact historical fingerprints are recorded, and scanning all fetched branch histories passes.

V4 Escape correction: reproduced clean modal ignoring Escape between autofocus and Radix document-layer registration. Content handles otherwise unclaimed Escape through the existing dirty guard. A deterministic autofocus regression fails with old code and passes with new code; all 12 dialog lifecycle checks and the complete local check suite pass. Independent review found no important new issue.

## V4-UX Phase0 — 2026-10-28

App-only baseline from8565b6b. See [BASELINE](qa/v4-ux/BASELINE.md) for every command, result,252-view sample and task measures. No product/website/backend/PDF/deployment edits. Three supplied legacy browser scripts failed; current native equivalents passed. Initial cutover font-preload warning failed; isolated rerun passed48screens. SonarQube and human usability unverified.

### Intentional selector changes
None in product acceptance scripts. New baseline measurement script targets current native controls.

## V4-UX Phase1 — typed URL navigation

New router/unit tests and browser history acceptance replace hidden navigation state. Screens/tabs push history; week/month/search/document refinements replace it. Demo role is retained. Legacy section/tool inputs remain accepted, and hub presentation is intentionally retained until Phase2 to keep Phase1 visually stable. Native public form tokens/auth/repositories/RPCs/PDF templates are unchanged.

Verification: `npm run check` passed244unit tests plus90script contracts before the last two parser edge cases; final targeted router suite15/15 passed. `npm run build`, `check:bundle`, `check:css`, `check:style`, `check:contrast`, `check:vercel-guidelines` passed. Strict diagnostics419→405, zero in changed files. ESLint suppressions only pruned downward. Full PDF suite passed17goldens,3433retention assertions and8Indian scripts.

Browser: router regression RED on baseline missing tab URL, then GREEN for tabs/week, refresh, Back/Forward, legacy links, both native and asynchronous dirty Back cancellation/acceptance, per-person S21 preselection, preserved demo and zero navigation storage keys. Shell15views; native acceptance60views; cutover48screens;26downloads; AP stale-write recovery; dialog/form refinement; short navigation; fresh Pages publisher/profile/time-away/announcement tests all passed, with zero demo cloud calls. Four current screen captures are in `qa/v4-ux/phase-1/`.

One integration regression was found and fixed: assistant export-all no longer reset PDF filters after removing ca:select-s21. Explicit action=export now preserves that reset; existing native resume test failed then passed. No acceptance assertion was weakened.

### Intentional selector changes
None to existing acceptance scripts in Phase1. Added router acceptance.

### Limits
Human usability and SonarQube remain unverified. Full Cartesian screenshot matrix not rerun; current CSS/layout unchanged and existing affected screen matrices passed. New production schema changes remain excluded.

### V4 UX phase 2 — shell checkpoint (2026-10-29, in progress)
Capability-derived navigation now has Publisher Today/Meetings/Reports/Me; staff union tabs plus a full More page; isolated owner navigation. Unavailable registry entries and publisher Weekend are excluded. No SectionHub remains. Header controls are 2 for publishers/overseers, 3 for admin phones and 4 for admin desktop. Assistant moves to the first search row; updates and Display move to Account. Add is a compact non-modal popover, reachable through Account on phones. Rail collapse is restored. Short landscape keeps a compact rail. More uses distinct tool icons and plain divided rows.

Verification so far: 250 unit + 90 script contracts, strict405 (baseline419; no changed-file diagnostics), 15 native shell views, 60 resume views, 8 role/size shell views, 200% header geometry, short-landscape history, and quick/assistant/updates/account close/escape/outside/focus flows. Final phase gates remain pending. The first short CSS override lost to legacy selector specificity; corrected and tested. Popover handoff failed until the after-close callback was actually invoked (an omitted implementation line); the same test now passes. Visual inspection caught stacked/concatenated More rows and verified their grid correction.

Intentional selector changes: `check-weekend-next` enters `tab=weekend` rather than retired sessionStorage; scheduling/backfill assertions unchanged. Shared `v4-shell-actions.cjs` opens Assistant through Search, updates through Account, and mobile quick actions through Account. `check-v3-shell` verifies direct destination URLs instead of hub headings. `check-short-navigation` verifies More-page history instead of a removed More dialog. `check-dialog-refinement` tests Account in place of the removed More dialog and preserves close/escape/outside/focus assertions. Resume, dialog-layers, alignment and refinement matrix entry selectors use the same helper; functionality assertions retained.

Phase 2 verification completed: final `npm run check` passes 250 unit tests and 90 script contracts; strict405 with zero failures; production build/bundle/style/CSS pass. All42 authorized tool destinations across admin/group/field/attendance are reachable with one row click from More, with distinct SVG icons. Duties and Duties PDF now have distinct labels. 48 cutover screens,15 native shell views,60 resume views,8 role/size shell views,200% header geometry,11 dialog theme layers, short-landscape More/history, and publisher contact/time-away/navigation/Axe checks pass. Pages packaging and service-worker smoke test pass with zero demo cloud requests/browser errors. Popover tests preserve dismissal and focus assertions; native Add-publisher selector is scoped to the non-modal popover because the underlying page remains accessible. Publisher navigation test now checks Me rather than the removed More dialog. Website sources remain untouched.

Phase 2 CI follow-up: CI correctly rejected the later-added sticky-search raw z-index and could not resolve namespace-used CJS helper exports. Replaced z-index with existing `--z-sticky`, and converted helper consumers to explicit named imports/destructuring. Local unused/style gates now pass; no rule exceptions or baseline changes. Earlier local success covered the pre-sticky source; final CI remains the release authority.

## V4-UX Phase 3 — Today (2026-10-30)
Publisher Today now has Next for you, state-aware monthly report, nonempty congregation announcements and Me. Report entry opens inline on Reports at its reporting month. Main Admin has Needs attention, This month and four shortcuts; department roles have their own first block, with publisher blocks appended only for a publisher membership. Attendance has a stepper and direct Save. Duty cards open the matching department roster. The on-device Assistant remains Main Admin only through Search. Group links remain available under People → Groups and Reports → Monthly overview; announcement management remains under More → Messages.

Toast regression: removing the Radix notice exception reproduced S-21 Dismiss closing Assistant. The marked notice exception preserves Assistant; the same test dismisses the S-21 notice, runs and saves attendance, dismisses that notice and previews another command. No toast-expiration wait is used. Close/Escape/outside and the setup dirty guard retain independent coverage. Embedded publisher report actions are secondary so staff role cards keep the primary action.

Intentional selector changes: Today replaces the removed Dashboard greeting/Monthly submissions home target in cutover, v3-shell, short-navigation, v3-resume, alignment, router and V4 publisher tests. Publisher Today “My profile & time away” → “Update”; “Submit report” plus “Enter report” → direct “Report my service”. Dashboard browser enters Reports → Monthly overview before testing KPI filters and bulk entry. Group-link browser opens People → Groups. Setup dialog acceptance opens Settings because completed setup no longer has a Today card. Assistant browser enters Search → Ask the assistant and scopes command controls to its dialog; S-21 and attendance notices are actively dismissed. These selector changes retain the associated behavior assertions.

Pending approval requests remain labeled separately ahead of newest-first contact updates: their existing API has no request timestamps, so a globally timestamp-sorted Inbox cannot be represented without a backend change. No request timestamp is invented. Persisted announcement drafts are not exposed by the existing API; no draft badge is invented. Broader Settings/Display restructuring remains Phase 7. Human participant evidence remains unverified; the participant runbook is unrelated work and untouched.

Verification complete locally: 257 unit tests + 90 script contracts; public safety; build/bundle (199834 gzip bytes); CSS/style/strict404; contrast429 checks/11 themes; 0 HARD guidelines; lint ratchet613; knip; 48 cutover screens; 15 shell/60 resume/30 Today views; 26 downloads; full composed overlay suite; Pages publisher/announcements/service-worker checks; 17 PDF goldens/3433 retention assertions/eight Indian scripts. Today matrix has zero Axe/overflow/cloud/browser errors, and admin phone has two content blocks above the fold. Full outcomes, limitations and review evidence are recorded in `work/v4-ux/briefs/phase-3-report.md` and `docs/qa/v4-ux/phase-3/verification.json`.
