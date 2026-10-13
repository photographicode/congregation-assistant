# V2 cutover implementation report

14 October 2026 (client timezone). Branch: `v2/cutover`.

**The full cutover is not complete and has not been published.** The implementation is a tested foundation for the native cutover, with explicit remaining gates in PARITY. No production database, DNS, hosting, mail account or GitHub PR/issue state changed.

## Implemented

- Vite app output at `dist/` root, with configurable absolute BASE_URL, SPA fallback and old /v2 redirect handling. Separate `dist-site/` website output.
- Native reports/household editor, monthly submission summary, attendance counts, midweek draft/assignment/publish screen, approved-account controls, protected public forms/schedule views, publisher Home and encrypted backup/restore UI. These use existing server contracts rather than V1 iframes.
- Workspace-scoped repository factories with Zod responses, pagination, uniform errors and existing expected-record/revision parameters. Browser demo paths never call the backend.
- Shared greeting component: local-date variants, minute-aligned clock, resume events, congregation timezone/date, 12/24 preference and included language strings.
- Layout Doctor: viewport/size/density/text/keyboard/pointer/orientation/standalone values, explicit screen-fit setting, safe-area layout and a content scroll area above measured navigation. Narrow-screen clock width uses container queries.
- Build-hash worker cache, visible reload prompt, explicit activation, eviction of old caches and no caching of backend/personal form responses.
- Public website tour using the shared greeting, play/pause/steps, reduced-motion handling, static/no-JS fallback, updated product copy, Hindi introduction/CTA, metadata and sitemap. Website Latin fonts are subset and self-hosted.
- Intended domain/support configuration, guarded owner-run legacy-auth UP/DOWN files, and deployment/acceptance workflows that do not bypass incomplete release gates.
- Updated README, AGENTS, decisions, audit, parity, database/domain instructions and owner tasks.

## Deletion / porting status

Removed the V1 iframe renderer and V1 navigation references from native V2 source. Removed V1 root files, bridges, duplicate trees and vendor scripts from **generated deployment outputs**. No V1 repository source tree was deleted: exhaustive native capability parity is not yet met, and the owner's A.2 permits deletion only after parity. The complete V1 source remains as a porting reference and is not a release-ready source tree.

Native ports currently cover the scopes listed above; complete SuperAdmin, advanced publisher/emergency fields, official PDF exports, rolling analytics, group-overseer bulk flows, independent departments, subscription locking, reminders/notifications, wipe and the full E2EE lifecycle remain outstanding. PARITY names their routes/contracts and missing acceptance. No row claims a V1 fallback is native completion.

## Verification evidence

- Existing baseline `npm test`: 61 app checks plus cloud draft, recovery/envelope and public safety checks passed.
- Native `npm run check`: 42 unit/contrast/source/crypto checks and TypeScript passed before the final extra greeting-variant test. Targeted final greeting/source checks passed (9 tests); TypeScript passed.
- V2 app/site build passed in an isolated copy with no V1 root files, staging, archive, public-site-preview, experiments or old v2 deployment tree. This proves build independence, not complete feature parity.
- Generated production app/site bundle legacy scan passed.
- Reduced browser matrix: 42 screens across 280×653, 375×667 and 768×1024 at 100%/200% text, plus publisher demo, old /v2 redirect and an actual fake-V1-worker/cache replacement. Final reduced matrix passed: 42 screens, zero layout/axe failures, zero browser errors/warnings and zero backend requests in the admin demo. Publisher demo, redirects and actual visible fake-V1-worker/cache migration also passed.
- Read-only live Supabase metadata confirmed the required scheduling/report/household/backup/weekend RPC signatures and RLS enabled on publishers, reports, attendance and access. It did not simulate all real roles or read actual publisher records.
- Isolated PostgreSQL 17: existing baseline contracts, all existing V2 migrations/contracts, and proposed legacy-auth UP/DOWN/approved-Google authorization passed. Fixture changes rolled back; production SQL was never applied.
- App JS budget is approximately 152 KiB gzip, excluding the lazy crypto module. Measured initial website/font/script payload is approximately 126 KiB gzip, below 200 KiB. Crypto remains approximately 315 KiB gzip when explicitly requested.

## Remote housekeeping

Read-only GitHub tools inspected:

- PR #37: useful mobile/PDF/usability work, conflicting head. Port compatible logic; do not blindly merge the legacy tree into the native cutover.
- PR #7: draft security repair, conflicting head. Preserve its security intentions; old UI changes need native equivalents.
- Issue #39: accurate deployed-preview status and outstanding requirements. It is not completed by this branch.

The GitHub CLI reports invalid GH_TOKEN/forbidden access. No writable alternative is exposed. Neither PR was merged/closed/commented on, no issue was changed, and no cutover PR was opened.

## Domain and preview status

Prepared `congregationassistant.com` for the website and `app.congregationassistant.com` for the app. Domain and mailbox readiness flags remain false. No GoDaddy/Cloudflare/DNS credentials or provider-assigned nameservers/Pages targets are available. domain-and-email.md describes exact host purposes, necessary provider-generated values, OAuth redirects, mail records and verification.

No supported interactive virtual-screen tool is exposed. Two contact/website review images were inspected through the image tool. Local browser QA is not a public preview or a domain deployment.

## Unverified / blocked release gates

Complete capability parity and V1 source deletion; all real role/anonymous abuse/RLS checks; complete nightly matrix and physical keyboard/safe-area/device behavior; Lighthouse ≥95; full broken-link/console/CSP sweeps; Indic-script official PDFs; 5000-row complete imports; real backup schema/restore; trial/renewal/expiry; offline edit reconciliation; complete E2EE device/recovery/revocation/migration sentinel lifecycle; real OAuth/mail/provider configuration; PR resolution, publication, DNS/TLS and production cache/root verification.

`npm run check:release` deliberately fails while PARITY has unchecked requirements and V1 source remains. This is a release blocker, not a passed cutover gate.
