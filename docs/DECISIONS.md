# V2 implementation decisions

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
