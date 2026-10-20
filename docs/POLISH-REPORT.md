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
- Not done yet: expanded dashboard sections, complete command registry, CBS reader model, final screenshots, and deployment for this owner pass.

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

site/DESIGN-LOCK.md records the deployed design reference and permitted edits. The website assets/layout are unchanged. The required screenshot baselines/pixel test remain open. OWNER-MANUAL.md records fallback hosts, intended domain/configuration, provider login and CNAME/snapshot requirements; it is not evidence of DNS/provider changes.

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

