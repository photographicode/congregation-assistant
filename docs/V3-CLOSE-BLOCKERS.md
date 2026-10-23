# V3 CLOSE THE BLOCKERS — make PR #59 mergeable, then ship

PR #59 (`v3/launch-hardening`, draft, 5 commits) is good work. It is **not deployed** because several gates fail. This file fixes the gates **honestly** (not by waiving them) and gets to a deploy. Full authorization as in `V3-QUALITY-ORDERS.md`. Rules from `V3-LAUNCH-HARDENING.md` §0 apply. Credit rules: grep/ranges, last 20 log lines, one spec at a time, sampled audits, full matrices in CI only. Push after every item. No new features.

## 0. Correction to earlier orders (read first)
I told you to `enable` **and force** RLS on every table. **Forcing RLS can break SECURITY DEFINER functions**: they run as the table owner, and `FORCE ROW LEVEL SECURITY` applies policies to the owner unless the owner role has `BYPASSRLS`. Do **not** force blindly. The real requirement is: **every table in an exposed schema has RLS enabled, no direct privileges for `anon`/`authenticated` unless a policy intends it, and internal tables live in a non-exposed schema.** `FORCE` is optional, only where `rolbypassrls` is false for the owner **and** the role × function matrix passes afterwards.

## 1. Redefine the gates (stricter where it matters, ratcheted where it doesn't)
| Gate (currently red) | New HARD definition | How |
|---|---|---|
| **Forced-RLS on 16 tables** | `relrowsecurity = true` for every table in `public` (or table moved to a non-exposed schema with **no** grants to `anon`/`authenticated`); `anon_can_select = false` unless a policy is intentional and tested | Update `scripts/check-rls.sql`; classify the 16 tables (internal vs exposed); for exposed ones `enable row level security` + deny-by-default policy; for internal ones move to `private` (or revoke grants); migration with `down`; run the role × function matrix; **only then** consider `FORCE` per table (document why) |
| **OSV dependency job** | zero **unreviewed** advisories; each remaining advisory has an entry in `osv-scanner.toml` with id, reason (dev-only/unreachable), and an **expiry ≤ 90 days** | Read the job log; for each advisory decide: upgrade/`overrides` fix, or documented time-boxed ignore. Never a blanket ignore. Production `npm audit` is already clean |
| **Strict types: 447 diagnostics** | **No new diagnostics, no diagnostics in any changed file**, count only goes down | Create `tsconfig.strict.json` (`noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, …); save the baseline (`docs/engineering/ts-baseline.json`); CI compares counts per file; burn down by touching files (codemod the common index-access pattern first) |
| **CSS budgets** | budgets set to **current measured values**, fail on increase; targets (≤ 9 font sizes, ≤ 5 radii, ≤ 4 breakpoints, 0 `!important`) tracked in `docs/engineering/OPEN.md` with a date | Run `scripts/css-audit.mjs`, commit the numbers, shrink only on files you touch |
| **Coverage / server-RPC / geometry backlog** | coverage thresholds at current level (ratchet up); every RPC has a role-matrix test; PDF geometry tests for S-21 (ticks/labels/months), S-88, S-3, S-89, S-140 | list the missing ones in `OPEN.md`; implement the S-21 tick/label/month tests from `V3-SYSTEM-PAGES-AND-FINISH.md` §1 first |
Record each change of a gate and its reason in `docs/DECISIONS.md`. A gate may be **ratcheted** but never deleted.

## 2. Production database evidence (owner-dependent — do not claim what you cannot read)
Supabase rejected your production metadata/advisor reads. The owner will run `OWNER-DB-AUDIT.sql` (read-only) in the Supabase SQL editor and paste the results into `docs/qa/PROD-DB-AUDIT.md`. Until that file exists: keep every production-database item marked **not verified** in `CHECKLISTS.md` and the PR. When results arrive: reconcile with the repo SQL, fix anything unexpected via a migration (additive, `down`, encrypted snapshot first, isolated DB first), and delete the retired `owner-password-session` function remotely only when the owner confirms.

## 3. PR hygiene (12 open PRs, 1 open issue)
List every open PR with branch, age and diff size. **Close** superseded/duplicate PRs with a one-line comment linking the replacing PR; **merge** small green ones; keep ≤ 3 open. New PRs ≤ 800 changed lines excluding generated files, fixtures and snapshots; split larger work. Add labels (`security`, `ui`, `db`, `docs`) and link the issue to its fix.

## 4. Get #59 green and merge
1. Fix §1 items in order: RLS → OSV → ratchets (types, CSS, coverage) → missing geometry/RPC tests (S-21 first).
2. Re-run on the **new head**: `ci`, `e2e` (sampled), `pdf`, `security` (gitleaks, TruffleHog, Semgrep, CodeQL, OSV, SBOM, artifact scanner, password-column check), site audit (224 pages) and responsive audit (1,672 views) on the **assembled Pages artifact at the Pages base path**.
3. When every HARD gate is green: mark the PR ready, merge to `main`, deploy via `deploy.yml`, then run the **post-deploy** site audit, artifact scan and browser checks against the live URLs (`/` and `/app/`). Keep the previous deployment's artifact available for rollback.
4. Update `docs/POLISH-REPORT.md`, `CHECKLISTS.md` (evidence links), `OWNER-TODO.md` (remaining provider actions).

## 5. Then, as separate small PRs (in this order)
(1) S-21 tick/label/month fixes with 400-dpi tests · (2) system pages (404/offline/slow/error/session/403/link-inactive/maintenance/429/plan-ended/unsupported/storage) on `SystemPage` · (3) assistant handlers (publisher edits incl. DOB/baptism, AP revoke, assignments, link creation) via the action registry · (4) god-component splits with primitives (Home, People, Reports first) · (5) remaining items of `V3-EXPERIENCE-ORDERS.md` and `V3-QUALITY-ORDERS.md`.

**Done when:** PR #59 is merged with every HARD gate green on its final head, the live site and app pass the post-deploy audits, production-database claims are backed by the owner's audit file (or marked not verified), open PRs are ≤ 3, and the next work is queued as small PRs.