# V2 implementation decisions

Current decisions are in the 14 October 2026 section below. Older preview/bridge/GitHub Pages decisions are historical and superseded by the native cutover and private-review workflow.

2026-10-13. Source specification: V2-MASTER-README.md. Work branch: v2/all.

1. Keep the existing application operational while introducing a Vite/React/TypeScript strangler shell at `apps/web`. A build produces `/v2/` and a separately deployable `/site/`; `?ui=legacy` is retained. Do not switch the default before every release gate passes.
2. Preserve existing tested business logic through the legacy adapter. Database-dependent modules use an authenticated capability RPC; missing migrations show Update pending. No production SQL is applied by this task.
3. Implement shared tokens, themes, accessible dialogs, weekend scheduling, groups, setup, imports, messaging, delivery settings and privacy disclosure. New UI cannot claim production E2EE until full device lifecycle, migration and sentinel gates pass. Implement and test audited crypto primitives without enabling an incomplete privacy migration.
4. Centralize capability metadata for app/site. Website copy distinguishes implemented functionality, migration-dependent modules and optional services.
5. Existing GitHub Pages remains the deployment destination; do not replace its audience or silently create a different production site. Retain the public-site-preview compatibility path while adding apps/site.
6. Keep duplicate staging files until tests prove safe removal. Existing source-path contracts and rollback matter more than a premature directory move.
7. Use one dependency installation and bounded verification. Optional service keys, Android signing, legal review and authorization documents remain owner inputs. Never infer authorization for external publication content from the attached document's assertions alone.

8. User subsequently authorized SQL updates. Read-only inspection found 116 publishers and 4 congregations. Additive V2 migrations were applied through the authenticated Supabase connector; no real publishers/congregations deleted. Synthetic rollback tests exposed and fixed two PL/pgSQL naming ambiguities before marking SQL verified.
9. The pre-existing additional-duties unit fixture used a week that expired on 2026-10-12. Public views correctly omit old weeks. Move that one synthetic fixture to a future week; do not change the public filtering behavior.
10. The current public site repository was fetched read-only as the source template. apps/site preserves its assets and guide and adds honest V2 feature/status copy. The USD charge is not invented: quote before purchase; retain the existing ₹1,499 introductory price.

11. Nightly accessibility matrix runs at 03:00 Asia/Calcutta; PRs keep bounded V2 checks. Legacy footer labels are preserved, and icon Close labels are standardized consistently. Browser scroll effects explicitly return no cleanup value to remain compatible with browser APIs returning promises.
12. Published weekend capabilities exchange to expiring scoped sessions before URL cleanup. Session tokens are hashed on the server and retained only in tab session storage for clean-URL reloads.
13. Do not merge/deploy the full release: the detailed master checklist remains incomplete, especially actual Private mode and its end-to-end suite. A passing foundation suite is not authorization to bypass the user's release gates.

## V2 cutover decisions — 14 October 2026 (client date)

1. Work in `v2/cutover`; the uploaded cutover specification supersedes the preview/escape-hatch plan.
2. Generate the V2 app at `dist/` root and the public website at `dist-site/`. Do not package any V1 entry, iframe, bridge, vendor script or duplicate deployment tree.
3. Use `congregationassistant.com` for the website and `app.congregationassistant.com` for the app. Keep domain/mail readiness false until externally verified. Use the intended support mailbox as configuration, without pretending it exists.
4. Port report, household, attendance and shared scheduling calls against established server contracts. Use per-workspace repository factories and Zod; preserve existing revision/expected-record checks rather than inventing alternate tables.
5. Keep incomplete encryption and importer features disabled. Backup-file encryption is separate from Private mode for cloud records.
6. Preserve legacy source until *all* native parity is complete, as required by A.2 “After parity.” Basic native screens do not meet the exhaustive cutover requirement. No premature source deletion, merge or production switch.
7. GitHub CLI access fails; the connected read-only GitHub tools allow PR/issue inspection but cannot close, comment or merge. No GoDaddy/Cloudflare credentials or virtual-screen tool is available. Record those constraints and provide an offline review package and domain instructions.
8. Proposed legacy-auth migration is owner-run and guarded. Down restores empty structures only, never deleted password data or password authorization.

9. Git transport successfully pushed the implementation branch. A separate draft-PR API attempt failed with GraphQL Forbidden; do not equate Git transport access with API readiness. No merge or production switch occurred.

## 14 October 2026 — private repository review and hosting

- Keep photographicode/congregation-assistant private. GitHub Pages is not the review host. An owner-only Sites deployment gives the owner a real browser link: https://congregation-assistant-review.cherryshore32.chatgpt.site/?demo=admin. This is a working review, not a declaration that every cutover acceptance item has passed.
- Use Cloudflare Workers static assets for custom-domain hosting because current Cloudflare Pages documentation recommends Workers for new projects. Separate app/site Workers, custom domains, headers and deploy workflows are tracked. Production Cloudflare credentials and GoDaddy/Titan access are unavailable; missing secrets explicitly skip deploy without failing CI.
- Sites package helpers are not installed in this execution environment and are not readable through the skill resource API. For the review only, a stdin-only workflow pushed the exact static source with its short-lived credential and packaged that same commit. Credentials were neither persisted nor printed. Sites confirmed successful owner-private publication. Preserve the Site ID in its hosting manifest; do not recreate it.
- Supabase project API verified region ap-south-1 (Mumbai). No production data was read and no destructive production migration was applied.
- Permit CSP `wasm-unsafe-eval` only for the app's HarfBuzz/libsodium WebAssembly. JavaScript unsafe-eval and inline scripts remain prohibited. Website CSP has no WebAssembly allowance. The narrower source test checks the exact unsafe-eval token rather than rejecting its occurrence inside the WebAssembly keyword.
- Embed Latin PDF fonts for portable rendering; document the resulting differences in PDF-PARITY.md instead of claiming pixel identity. Leave Private mode claims off until full lifecycle and sentinel checks pass.

The additive `v2_extended_person` migration was first verified in isolated PostgreSQL (fields, invalid-date rollback, household-cycle refusal and cross-tenant denial), then applied successfully to the configured Supabase project through the connected API. It preserves existing fields when omitted and retains the atomic email-revision guard. No records were deleted. The database advertises extended_people only when the new contract is present.

Own-session metadata and native records-export RPCs were tested in isolated PostgreSQL, then applied through the connected Supabase API. Session listing returns only the authenticated account's device/timestamps, never tokens. Records export includes native groups, weekend drafts/public snapshots/history, setup and import history; it omits bearer hashes and device sessions. Its archive is for portability and is explicitly distinct from the existing automatic recovery format.

The expanded matrix exposed a doubled-text landscape greeting with a zero-width title column. Large-text landscape now stacks greeting and clock. All 192 targeted landscape cases passed after the fix; the earlier incomplete expanded run is not reported as fully passed. The 84-page website matrix passed accessibility and horizontal-overflow checks. Physical-device, usability and exhaustive tenant/RPC acceptance remain required release work.

The app now distinguishes approved-account identity from an active/trial plan. The server returns the current plan state; expired workspaces show a lock screen. An actual approved Main Admin can still make the read-only records export after expiry. The export helper preserves existing schema and report-retention additions, and explicitly denies other accounts and non-admin publishers. This additive contract passed isolated SQL checks before being applied.

Demo disables Supabase session persistence, URL exchange and automatic refresh even when an existing account session is present. Private query caches are cleared on account changes/sign-out, while same-account token refresh preserves them. PDF assets are explicitly cached by build version after first use; common Latin fonts are included even when the first document contains other scripts. Actual browser downloads preserved all eight tested script names and subsequent offline regeneration produced zero browser errors and zero backend requests.

The native Command centre uses the established approved-Google owner RPCs and RLS-controlled billing directory. It supports creation, request approval/decline, controlled billing changes and account/group assignment; its fictional mode now changes local data instead of returning a static placeholder. Six browser cases across 280/375/768 widths and normal/doubled text pass with no backend requests.

Welcome/request email links no longer depend on GitHub Pages. The additive configured-mail-links migration supplies APP_URL, PUBLIC_SITE_URL and SUPPORT_EMAIL from a private public-configuration row. Isolated tests inspected queued messages under alternate example URLs, then rolled back; no email was sent. The migration was applied successfully to Supabase. Existing queued historical messages were not rewritten.

## 15 October 2026 — Revival takes precedence

The V2 Revival brief supersedes earlier minimal-control limits. Calm, Balanced and Lively share capabilities; device-saved presentation preferences never grant roles. Added real dashboard repositories, congregation-timezone previous-month logic, KPI drill-down, labeled direct bulk-entry launch, monthly submissions and user-initiated reminder sharing. Fictional demo values are explicitly labeled; production never substitutes demo totals after failed queries. Preset cards currently use illustrative miniature previews, not live rendered Home; profile/congregation-default synchronization, widget rearrangement, trends and performance trace acceptance remain open. System motion preferences override presentation motion. Publish the owner review as a candidate, retain the existing main/V1 deployment until every screen gate passes, and do not delete V1 yet.

The review now includes the native owner directory/request/billing UI and report bulk/CSV/annual-log ports verified locally. Configured transactional email URLs now use private public_app_config values; only public URL/email keys are permitted. No email was sent during migration verification. Public Supabase endpoint and publishable key moved to public-config.json; these are intentionally public, never privileged credentials.

Appearance choices are now scoped locally to the signed-in user and congregation, with publisher defaults set to Calm. This provides account-separated device persistence; it is not cross-device server profile synchronization. The remote preference/defaults contract is still a release gate. Sidebar shortcuts reuse the native screen components and retain their role filters. The inventory brief labels its handler list 109, but contains 90 distinct explicitly backticked handler names; the generated inventory records that discrepancy and the frozen-tag evidence rather than inventing nineteen completed actions.
