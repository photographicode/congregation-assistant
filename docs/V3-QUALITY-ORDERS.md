# V3 QUALITY ORDERS — make it a well-engineered product, not vibe-coded

**FULL AUTHORIZATION.** You may rename/move/delete files, rewrite components, change CSS and TypeScript broadly, add dev tooling, change CI, apply database migrations (additive, with `down`, after an encrypted pre-migration snapshot, tested first on an isolated database), commit, push, merge to `main` and deploy — **as long as every gate in §10 stays green**. You may not: delete production data, change prices/plans, put secrets in the repo, weaken or delete a test to get green, alter the locked public-website design (bug fixes only), or remove the golden PDFs.
Read `DESIGN.md` and `CHECKLISTS.md` first. This file is the **master sequence**; items from `V3-EXPERIENCE-ORDERS.md`, `V3-SYSTEM-PAGES-AND-FINISH.md` and `V3-FINAL-ORDERS.md` are done *inside* it when they touch the same code (listed in §9). No questions. Push after every numbered item.

## 0. Method and credit rules
Use **codemods and tools** (free, deterministic) instead of hand-editing: `ts-morph`, `eslint --fix`, `stylelint --fix`, `knip`, `dependency-cruiser`, `jscpd`, `madge`, `size-limit`, `fast-check`, ESLint 9 **bulk suppressions** (`eslint --suppress-all` → `eslint-suppressions.json`) so the **ratchet** blocks *new* violations while the baseline shrinks. `grep`/line ranges only; last 20 log lines; one spec at a time; sampled audits ≤ 300 views; full matrices in CI; images ≤ 6; a fix that fails twice → log in `docs/engineering/OPEN.md` and continue.

## 1. Diagnosis (measured on the current tree — do not re-measure; fix)
| # | Finding | Evidence |
|---|---|---|
| D1 | **God components** | `Workspace` = one 2,036-line function (22 `useState`, 10 `useEffect`); `Reports` 1,431; `PdfStudio` 904; `Midweek` 904; `OwnerConsole` 527; `PublicForm` 515; `DepartmentPanel` 451; `LocalAssistant` 440; `Dashboard` 406; `PublisherEditor` 308; `App` 263; **20 functions > 150 lines** |
| D2 | **Shared UI not used** | 14 of 25 exports in `packages/ui` are never imported: `Banner, Card, Chip, DataTable, EmptyState, ListRow, ProgressRing, Section, Skeleton, StatTile, Stepper, Switch, Tabs, WeekPicker` → screens hand-build markup + CSS → **the cause of the alignment/padding/positioning drift** |
| D3 | **CSS chaos** | `.card` defined/overridden in 6 places (padding `1.5rem`, `1.25rem`, `var(--card-pad)`; radius `--radius-l` in `styles.css` vs `--radius-m` in `theme-bridge.css`); `.notice` ×4, `.dialog` ×3; **42 distinct font sizes, 31 border radii, 15 breakpoints**; 41 `!important`; 15 unused classes; 12 fixed heights; 30 `min-height:px`; 4 `vh`; 127 KB CSS in 17 files |
| D4 | **Type/error hygiene** | 54 `any`; **15 empty `catch {}`** (errors swallowed, e.g. `PdfStudio.tsx:302,339`, `HomeSuggestions.tsx:278,313,326`); **195 `<button>` without `type`** (default = submit; e.g. `main.tsx:275,303,328`); 70 nested ternaries; 10 magic `setTimeout` numbers; 8 inline `style={{}}`; 4 `target="_blank"` without `rel`; 67 raw `localStorage` calls; `allowJs:true`; no `noUncheckedIndexedAccess`; ESLint lacks `@typescript-eslint` rules |
| D5 | **Tests without gates** | ≈ 100 test files but **no coverage thresholds**; no mutation/property tests for critical logic; Zod used in few places |
| D6 | **Security gaps** | 9 tables with neither `enable RLS` nor a policy in SQL (`ca_private, ca_migrations, ca_ap_private, ca_oclm_*, ca_meeting_*`); 104 `SECURITY DEFINER` functions (all with `search_path` ✔) but 95 callable by `authenticated` and 13 by `anon` per advisors; **30 GitHub Action refs pinned to tags, not SHAs**; no CODEOWNERS; no CI secret scan/SAST/SBOM/OSV; GitHub Pages cannot send security headers (strong CSP exists only in the Cloudflare worker) |
| D7 | **Inline i18n** | `packages/core/i18n.ts` = 26 KB of strings in code |
Good (keep): no secrets in the tree, no `eval`/`innerHTML`, all definer functions set `search_path`, preferences-only `localStorage`, 5 consolidated workflows, strong CSP in the worker, Dependabot present.

## 2. Q1 — Tooling and ratchets (first; everything else depends on it)
1. **ESLint (flat config):** add `@typescript-eslint` (type-aware): `no-explicit-any`, `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`, `switch-exhaustiveness-check`; core: `no-empty`, `no-nested-ternary`, `complexity: 12`, `max-lines-per-function: 120`, `max-lines: 400`, `max-params: 4`, `no-magic-numbers` (allow 0,1,-1,2, array indexes, tokens file), `eqeqeq`; React: `react/button-has-type`, `react/jsx-no-target-blank`, `react-hooks/*` as **error**; `jsx-a11y` strict; `no-restricted-syntax` for `style={{…}}` and for `.innerHTML`/`dangerouslySetInnerHTML`/`eval`/`new Function`; custom `no-details`, `no-native-select`, `no-emoji`. Run `eslint --suppress-all` once to baseline; CI fails on any **new** violation or any unused suppression.
2. **tsconfig:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `allowJs:false` for `src` (convert `packages/*/*.mjs` to `.ts` or `checkJs:true` with JSDoc types).
3. **Stylelint** with `stylelint-declaration-strict-value` + `declaration-no-important`, `no-duplicate-selectors`, `selector-max-specificity: 0,3,0`, `selector-class-pattern: kebab-case`, `color-no-hex` (outside theme token files), and **strict values** (see §4).
4. **knip** (unused files/exports/deps), **dependency-cruiser** (layers: `packages/core` ← `apps/web/src/data` ← features/UI; core may not import React; features may not import other features' internals), **jscpd** (duplication < 3%), **madge** (no cycles), **size-limit** (budgets), `tsc --noEmit` in CI.
5. **Vitest coverage thresholds:** global lines 70% (ratchet up), `packages/core` ≥ 85%, permission/RLS helpers and `packages/pdf/layout` ≥ 95% branches. CI fails below.
6. Add **`scripts/css-audit.mjs`** (defined vs used classes, duplicate selectors, distinct font-sizes/radii/breakpoints/z-indexes) and **`scripts/vercel-guidelines-audit.mjs`**; both run in CI.
7. `CODEOWNERS` (`supabase/`, `.github/`, `hosting/`, `packages/core`, `packages/pdf` → owner), PR template with the checklist, `CONTRIBUTING.md`, conventional commits + `release-please` (or `changesets`) for `CHANGELOG.md` and semantic versions.

## 3. Q2 — Mechanical clean-up by codemod (fast, safe, big win)
1. **Buttons:** `scripts/codemods/button-types.mjs` (ts-morph): add `type="button"` to every `<button>` without `type`; keep/make `type="submit"` only for a form's primary action (inside `<form onSubmit>`). Also route all buttons through `<Button>` (it defaults to `type="button"`). Verify with `react/button-has-type`. (195 → 0.)
2. **Empty catches (15):** replace each with `handleError(error, {scope, severity, userMessage?})` — logs to a **local ring buffer** (no network), surfaces a toast/inline error when the user is affected; for deliberately ignorable failures (storage unavailable) use `ignoreError("reason")` so intent is explicit. (15 → 0.)
3. **`any` (54) → 0:** use `unknown` + Zod parse or real types; at most 3 documented `eslint-disable` for third-party typings.
4. **Nested ternaries (70) → 0:** early returns, lookup objects, small components.
5. **Magic timeouts (10):** `TIMING` constants in `packages/core/timing.ts`.
6. **`target="_blank"`:** `rel="noopener noreferrer"` (4).
7. **Storage:** `packages/core/storage.ts` — typed keys, schema version, try/catch, in-memory fallback; replace all 67 raw `localStorage` calls.
8. **Config:** `packages/core/config.ts` validates env/`public-config.json`/flags with Zod at startup and **fails closed**; typed feature-flag registry (`owner`, `expires`).
9. **i18n:** move strings to `locales/<code>.json`, lazy-load per language, generate key types; delete the 26 KB inline file. Lint: no hard-coded visible text.
10. Run `knip`, delete unused files/exports/CSS classes (15 classes, 25 exports) **unless** they are about to be used by §5.

## 4. Q3 — One token scale, one definition per class (CSS)
Define in `packages/ui/tokens.css` and **enforce by Stylelint strict values**:
- **Type scale (9):** `--fs-1…9 = 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3 rem` (× `--text-scale`). (42 → 9)
- **Radius (5):** `--radius-s/m/l/xl/full`. (31 → 5)
- **Spacing (8):** `--space-1…8 = 4, 8, 12, 16, 24, 32, 48, 64 px` (as rem); only these in `padding/margin/gap/inset`, plus `0` and 1 px hairlines.
- **Breakpoints (4):** phone `<600`, tablet `600–1023`, desktop `1024–1439`, wide `≥1440`; anything finer uses **container queries**. (15 → 4)
- **z-index tokens:** `--z-base 0 · sticky 20 · popover 30 · scrim 35 · dialog 40 · toast 50`; **control heights** `36/44/52`; no other fixed heights.
- **Layers:** `@layer reset, tokens, base, components, screens, utilities;` — each class defined **once**; merge `.card/.notice/.dialog` duplicates; delete the 41 `!important`; convert 4 `vh` → `dvh/svh`; remove the 12 fixed heights and 30 `min-height:px` (except controls and hairlines); delete the 15 unused classes; target **≤ 70 KB** CSS.
- Components own their padding (`Card pad="m"`), screens never override it.

## 5. Q4 — Layout primitives and a real component library (fixes alignment/padding/positioning at the root)
1. Add to `packages/ui`: **`Page`, `PageHeader`, `Section`, `Stack(gap)`, `Inline/Cluster(gap,wrap,align)`, `Split`, `Grid(minItem)`, `Card(pad)`, `Field(label,hint,error)`, `FormRow`, `Toolbar`, `TableShell/DataTable`, `EmptyState`, `Skeleton`, `Banner`, `Chip`, `Tabs`, `Segmented`, `Switch`, `Stepper`, `ListRow`, `StatTile`, `ProgressRing`, `WeekPicker`, `Select/PersonSelect`, `Dialog/Sheet`, `Toast`, `SystemPage`.** Spacing and alignment live **inside** them (one source of truth); each has all states from `DESIGN.md` and a story on the **`/styleguide`** route.
2. **Migrate screens to primitives**, in this order: Home, People (+Groups), Reports (+AP review), Forms & Print, Midweek, Weekend, Duties, Attendance, Access/Links, Settings, PublicForm, OwnerConsole, PublisherHome. No screen may use ad-hoc flex/grid/padding classes; screens compose primitives only. Measure with `css-audit`: classes in `features/styles.css` **130 → ≤ 40**.
3. Page template rules: every page = `Page` + `PageHeader` (title, actions) + `Section`s; one container padding per breakpoint; equal card heights in a row; forms use `Field`; tables use `DataTable` (borderless spreadsheet style per DESIGN.md).
4. After each screen migration run the **alignment audit** (sampled) and fix to zero findings; commit the visual baselines.

## 6. Q5 — Split the god components (extract, don't rewrite)
Procedure per component: (1) pin behavior with a characterization Playwright test or existing specs; (2) extract sections into components in `apps/web/src/features/<feature>/` (`components/`, `hooks/`, `model/`); (3) move pure logic to `packages/core` with unit tests; (4) move server calls to `apps/web/src/data/*` (typed repositories + Zod + TanStack Query); (5) delete leftovers; (6) all specs green; commit.
Targets (limits enforced by ESLint): **screen file ≤ 300 lines, component function ≤ 120, hook ≤ 150, `useState` ≤ 8 per component** (use reducers/stores beyond that).
- `Workspace` → per-route screens (People, Groups, Households, Emergency, Import, Settings sections, Access) + shared hooks.
- `Reports` → `ReportsHub, ChaseQueue, BulkEntry, ReportForm, ApReview, PioneerLists, S1Summary`.
- `PdfStudio` → `PrintSections, CustomListBuilder, ServiceYearStepper, DownloadButton`, worker client.
- `Midweek` → `WeekHeader, PartRow, AssignmentPicker, AutoAssignPanel, ClassroomSetting, PublishBar`.
- `OwnerConsole, PublicForm, DepartmentPanel, LocalAssistant` (parser · action registry · UI), `Dashboard, PublisherEditor, main.tsx App` (router/providers/layout only).
Also rename files to match exports, one component per file, co-locate tests.

## 7. Q6 — Database and API security hardening (authorized; snapshot first)
1. **Pre-migration:** export an **encrypted snapshot** and verify round-trip; run every migration on an isolated database twice (idempotent) before production; each has a `down`.
2. **RLS everywhere:** generate the list of tables in exposed schemas; `alter table … enable row level security; … force row level security;` on **all**; move internal tables (`ca_private, ca_migrations, ca_ap_private, ca_oclm_*, ca_meeting_*` that are only used by definer functions) to a non-exposed **`private` schema**; add `scripts/check-rls.sql` (fails if any exposed table lacks RLS) to CI.
3. **Function privileges:** `alter default privileges in schema public revoke execute on functions from public, anon, authenticated;` then grant **explicitly** from a manifest `supabase/grants.json` (function → roles). Convert helpers that don't need definer rights to `security invoker`; keep definer functions with `set search_path = ''` and fully-qualified names; add length/range validation in SQL; reduce the advisor findings to documented exceptions (13 anon / 95 authenticated → only intended).
4. **Role × function matrix test** generated from `pg_proc` + the manifest: for anonymous, publisher, household, group overseer, each overseer role, admin, SuperAdmin and **another tenant**, assert allow/deny; plus **IDOR tests** for every RPC taking an id; run in `e2e.yml`/`security.yml`.
5. **Abuse control:** one `ca_rate_limit(key, limit, window)` function + table (hashed IP/token keys, TTL cleanup) used by **every** anonymous RPC; Turnstile on the application form; uniform error messages (no account/link enumeration); constant-time token comparison; max payload/page-size limits.
6. **Audit log:** append-only `ca_audit` (revoke `update/delete`; trigger blocks them) written inside definer functions for sign-in/role changes/link events/exports/backups/plan changes/deletes/assistant actions; viewer for admins.
7. **Auth config (OWNER does in dashboard; you document):** disable unused email+password provider, enable leaked-password protection if kept, short JWT expiry, refresh-token rotation.

## 8. Q7 — Application and supply-chain security
1. **Headers:** add `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, Trusted Types (`require-trusted-types-for 'script'`, with a default policy only if needed) to `hosting/worker.mjs`; keep the CSP `<meta>` in the app for GitHub Pages and document that `frame-ancestors`/HSTS need Cloudflare; `scripts/check-headers.mjs` tests the **deployed** URLs.
2. **Input/output:** CSV/Excel **formula-injection** neutraliser on every export + tests; import limits (size, rows, type, zip-bomb); **ReDoS/fuzz tests** (fast-check with time limits) for the assistant and import parsers (input cap, linear-time patterns); open-redirect tests for every `returnTo`; XSS payload tests across names/comments → escaped in app, PDFs, exports.
3. **Actions:** pin **every** action to a commit SHA (use `pinact`/`ratchet`), Dependabot for `github-actions` and `npm` weekly, workflow `permissions: contents: read` by default with per-job escalation, deploy only from `main` via an **environment** with required reviewers (OWNER enables), no secrets in plain env.
4. **New `security.yml`:** gitleaks (full history + PRs; `.gitleaks.toml`), Semgrep OSS (`p/typescript p/react p/security-audit p/owasp-top-ten`) → SARIF, CodeQL (free while public), `npm audit --omit=dev --audit-level=high` + OSV-Scanner, CycloneDX SBOM artifact, license allow-list check, ZAP baseline scan against the deployed site, role×function matrix, RLS check, headers check. `npm ci --ignore-scripts` everywhere.
5. Update `SECURITY.md`, `security.txt`, `docs/engineering/THREAT-MODEL.md` (assets, actors, entry points, abuse cases per role, assistant, public links, billing), regenerate `docs/PRIVACY-DATA-MAP.md`, add `docs/INCIDENT-RUNBOOK.md`.

## 9. Q8 — Fold in the already-ordered fixes (while migrating the same screens)
S-21 tick/label/month fixes with the 400-dpi tests · system pages (404, offline, slow, error, session, 403, link-inactive, maintenance, 429, plan-ended, unsupported browser, storage blocked) built on `SystemPage` · Home Gemini-style welcome + assistant handlers (publisher edits incl. DOB/baptism, AP revoke, assignments, link creation) via the action registry · people table / RP / AP / AP review · print section cards + custom list · groups-tab links · duplicate theme removal (keep Eclipse) · Aurora/glass fixes · dialog layer. Each item ends with its named tests.

## 10. Q9 — Engineering documentation and evidence
`docs/adr/0001…` (stack, local-first + Store interface, Vault, tokens/layers, security model, deployment); `docs/engineering/ARCHITECTURE.md` (diagram), `SLO.md`, `RUNBOOKS/*` (outage, bad deploy, DB restore, key rotation, rate-limit storm, webhook backlog), `RELEASE.md` (expand→backfill→contract migrations, rollback), `EVIDENCE.md` (every CHECKLISTS item → test/script/doc link) and update the ✔/◐/✗ marks in `CHECKLISTS.md`. Add `k6` load script (staging only) and `THIRD-PARTY-NOTICES.md`.

## 11. GATES (all HARD; CI must be green before merge/deploy)
`tsc` strict · ESLint zero new violations and baseline shrinking · Stylelint strict values · `knip`/`jscpd`/`madge`/dependency-cruiser clean · coverage thresholds · `css-audit` targets (≤ 9 font sizes, ≤ 5 radii, ≤ 4 breakpoints, 0 `!important`, ≤ 70 KB, classes ≤ 40 in `features/styles.css`) · no `<details>`/native select/inline style/`any`/empty catch/nested ternary · all existing gates (alignment audit zero, layout detector, overlays, interaction audit, a11y, contrast, PDF geometry + golden, direct-download, assistant zero-network, offline) · `security.yml` green (secrets, SAST, deps, SBOM, ZAP baseline, RLS, role×function matrix, headers) · bundle budgets · Lighthouse ≥ 90 · Sev1/Sev2 = 0.

## 12. Execution order (each step ends with a push; deploy after Q6/Q7 and at the end)
Q1 tooling → Q2 codemods → Q3 tokens/CSS → Q4 primitives + migrate Home/People/Reports → Q5 split god components (with Q8 items) → Q6 DB security → Q7 app/supply-chain security → remaining screens → Q9 docs/evidence → alignment + visual pass (≤ 6 images) → deploy canonical Pages site → post-deploy checks.
**Report** (`docs/POLISH-REPORT.md`): before/after numbers for every row in §1, gate results, commits/URLs, open items, what is **not** verified (real phones/printers/WhatsApp/Razorpay, penetration test) and the **OWNER** actions still required.

**Done when:** every number in §1 has moved to its target, screens are composed from one component library with one spacing/type/radius scale, no component exceeds the limits, errors are handled not swallowed, the database denies by default and is proven by generated tests, the supply chain and CI scan themselves on every push, and `CHECKLISTS.md` shows evidence for each ✔.