# V2 release checklist and verification log

Last checkpoint: 2026-10-13. This is a foundation/preview, not the completed master release. The two uploaded master files were byte-identical. The source specification is preserved in `V2-MASTER-README.md`; this checklist does not relax its requirements.

| README section | Evidence completed | Remaining gate |
|---|---|---|
| §0 autonomy/deployment | v2/all; logical commits; additive SQL applied after user's explicit SQL authorization; capability probe; legacy escape hatch | Owner authorized deployment of available unpaid foundation; full master rollout remains incomplete |
| §1 verified audit | Legacy close button labels/hit areas; dialog-root inner ID collisions fixed; title labels simplified; PDF precache removed; explicit update prompt | Full XSS/anonymous-RPC/font/theme/emoji/duplicate-tree audit not complete |
| §2 principles | Calm navigation, device typography, honest privacy, kept legacy business logic | Human usability acceptance |
| §3 foundation | Vite/TypeScript/React18, Radix Dialog, TanStack Query, Zustand, Zod dependency, six token themes, contrast tests, local Noto, code-split workspace | Full monorepo move, Tailwind UI integration, full component/styleguide catalogue, strict legacy CSP and all local vendors |
| §4 shell | Seven sections, role-filtered navigation, manual rail toggle, phone tabs, Ctrl/Cmd+K tools search | Real data attention summaries, full global search, all viewports/zoom matrix |
| §5 screens | V2 Home/People/weekend/import/messages/settings; legacy adapter for preserved screens | Rewrite reports/attendance/midweek/duties/access/SuperAdmin; complete profile fields and all loading/offline states |
| §6 household email | Normal email field, normalization, existing login RPC reuse, explicit prompt, server-enforced confirmation, atomic new publisher/login save, household badges | Full removal/invite/import household review and revoked/transferred browser matrix |
| §7 groups/roles/links | Service groups with normalized unique keys, backfill/dry-run, dropdown, admin-only creation; weekend role; hashed 256-bit weekend token | Rename/reorder/archive/quick-create, no plaintext password path everywhere, complete Links Hub/rotation/revocation/session exchange/QR |
| §8 weekend | Per-week drafts, visitor/free text, songs/talk/watchtower placeholder, exceptions, duties, optimistic revisions, publish history, sanitized public page, browser print; SQL role tests | Structured PersonPicker, visitor address book, real official article data, editable qualification setup/shared availability, public module switch, rollback, PDF layouts |
| §9 setup | Eleven-step resumable guide, Back/skip/save, meeting/delivery choices, module handoffs, SQL progress/settings | Full-screen guided key ceremony, inline quick groups/import/roles/first schedules, real under-10-minute phone pilot |
| §10 adaptive accessibility | System color/contrast/reduced motion/transparency/coarse pointer listeners; rem sizing; large-text layout; manual controls | Full 320px/400% reflow, spacing, Dynamic Type, root200% and publisher portal matrix; CI/browser status below |
| §11 Import Center | Spreadsheet/CSV/vCard, header mapping, row review/fixes, E.164, existing group mapping, dry-run selected count, batch undo, loaded-data export | XLSX/OCR, household batch confirmation, update-aware 7-day undo safety, full backup restore |
| §12 official import/Print | Disabled flag and permission template; weekend print/Save PDF with scale; existing exports retained | Central official importer/discovery/fixtures/rate policy; multi-layout custom script-shaped PDFs for all requested scripts |
| §13 Private mode | libsodium worker/core, XChaCha/AAD/nonce/replay, X25519 seals, Ed25519 identity signature source, Argon2id backup/restore, encrypted IndexedDB device storage source, honest docs | Entire identity approval/recovery ceremony/scope lifecycle/device/custodian/migration/sentinel suite. Private mode and claims disabled; no pretending the primitive suite is complete E2EE |
| §14 delivery/requests/WhatsApp | Delivery choices/settings, shared capability catalogue, request choices persisted, personalized Smart Share queue, copy/quiet hours, optional add-on disclosure | Full portal/delivery enforcement, per-person consent/opt-out/languages, resumable persistent queue, full Links Hub; Business+AI intake not configured/implemented |
| §15 PWA/Android | Manifest categories/lang/shortcuts/display_override, separate any icons, offline fallback, visible update flow, build-hash packaging, install guide | Maskable safe-zone icons/screenshots, physical install verification, signing-gated APK/AAB workflow and verified association; Play is owner-controlled |
| §16 quality gates | Local checks below, rollback SQL tests, CI foundation workflow | Complete new/legacy browser/SQL/PDF/axe/Lighthouse/security/E2EE gates; visual contact sheets and real users |
| §17 website/domain/email | Shared tokens, fictional device frame, features, delivery/privacy/pricing/FAQ/request/install pages; domain/Titan/OAuth/SMTP/CORS docs | Website Lighthouse95, canonical public-site deployment, actual DNS/mailbox/provider activation |
| §18 owner inputs | Requirements file, secret names/setup locations, legal/permission placeholders | Actual optional account setup, written rights, human/independent reviews |

## Intermediate checks

1. Upload comparison: byte-identical, 52,463 bytes each.
2. `npm run check:v2`: 32 model/contrast/crypto tests passed; TypeScript passed. All six themes × three tones satisfy tested body, accent and link contrast thresholds.
3. `npm test`: existing 61 app/PDF checks plus cloud-draft/recovery/record-envelope checks passed. One pre-existing fixture's fixed 2026-W41 had expired; it was changed to a future synthetic week without modifying public-view filtering.
4. `npm run build:v2`: successful; V2 JavaScript gzip upper bound about 126.5 KB, under the 250 KB budget. This is a bundle-size check, not measured LCP/INP/CLS.
5. `node scripts/check-pdf-offline.cjs`: lazy PDF asset caching and offline worker asset retention pass; private APIs are not cached.
6. Live SQL contract: synthetic transaction rolled back after normalization/duplicate groups, atomic email, household confirmation, resume, stale revision, safe public projection, import undo and cross-account rejection passed. Separate request preferences fixture also rolled back.
7. Post-migration counts: 116 publishers and 4 congregations retained; 8 service groups created; 108 active publisher group IDs backfilled; no synthetic contract congregation remains.
8. Security advisors inspected: private-table no-policy notices are expected deny-all/RPC-only behavior; public/authenticated SECURITY DEFINER warnings require the documented explicit grant and role/token boundary review. Existing broader endpoint/password advisories remain; not declared all-clear.
9. Browser control is unavailable in this session (no callable supported JS browser tool). Browser acceptance/axe/screenshots are delegated to CI, not marked locally verified.

## Flag-flip order

Keep `V2_DEFAULT=false`, `E2EE_CLAIMS_ENABLED=false`, `JW_IMPORT_ENABLED=false`, `WHATSAPP_BUSINESS_ENABLED=false` for this foundation. After all §16 gates pass: verify additive migrations/capabilities, stage the new UI and legacy escape hatch, pilot with real users, enable approved standard modules, verify full E2EE independently with sentinel evidence before enabling Private/claims, and only then make V2 the default. Optional services need their own verified configuration and policy gates.

## Rollback

Return to the legacy frontend/query path; never overwrite drafts automatically. Preserve V2 records and export them before any reviewed down migration. Reassign weekend roles before removing its schema. Reverse migrations only in a reviewed transaction after backup; no automatic production deletes. Keep the legacy escape hatch for at least 30 days after the eventual default flip.

Dependency checkpoint: production audit zero; remaining development-only Tailwind/braces advisories are unresolved because no patched braces 3.x is available. Vite and selector parser were updated. Do not report the complete security gate passed.

## Verified foundation checkpoint

- V2 foundation CI run [38400859574](https://github.com/photographicode/congregation-assistant/actions/runs/38400859574) passed: build, model/crypto/contrast/source/public-session tests, TypeScript, phone/desktop demo flows, household confirmation, dialog dirty guard and focus return, weekend saving, import undo, axe serious/critical checks, 200% reflow and website axe.
- Local V2 suite is now 37 tests. Built V2 JS gzip upper bound is about 126.7 KB.
- One combined phone/desktop contact sheet was reviewed; the enlarged phone header and navigation were revised. The second affected contact sheet was also reviewed from the green CI images.
- Full legacy CI passed cloud readiness, isolated SQL and accessibility matrix, but its browser run encountered the old `Close navigation menu` selector after close labels were intentionally standardized. That fixture now targets the scoped `Close` button; the final legacy run 38412366216 passed on retry, including the full browser/PDF/database/cloud suite.
- Weekend sessions now exchange hashed 256-bit publication capabilities for expiring, hashed scoped sessions. Clean URLs can reload via tab session state. Synthetic session checks passed with rollback.
- Publisher email saving now carries the editor's expected login list; stale access changes reject atomically without changing contact details. The synthetic stale-login check passed with rollback.
- Heavy accessibility matrices were moved to the requested nightly/manual CI path (03:00 Asia/Calcutta). Fast V2 checks remain on pull requests.

This does not complete README §16: full Private mode, its end-to-end lifecycle/sentinel suite, the remaining UI/security/PWA work, human pilot acceptance and measured performance remain unfinished. The owner subsequently explicitly requested deployment of available unpaid work. The foundation was merged and published via PR #38; full Private mode and the remaining gates stay unfinished. See CURRENT-STATUS.md for current deployment evidence.
