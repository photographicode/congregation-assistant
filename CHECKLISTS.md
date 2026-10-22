# CHECKLISTS — enterprise-grade SaaS and security

Legend: ✔ done (evidence found in the repo) · ◐ partial · ✗ missing · ? cannot verify from the code (needs a runtime/dashboard check) · **OWNER** = only the owner can do it (dashboard/account). "Verify" says how an automated check or a human proves it. Codex turns every ✗/◐ into a task in `V3-QUALITY-ORDERS.md`; every checked item must have a test, script or document as evidence in `docs/engineering/EVIDENCE.md`.

---

# PART A — Enterprise SaaS checklist

## A1. Product and UX
- [ ] ◐ **One design system** used everywhere (14 of 25 shared components are exported but unused; screens hand-build markup). *Verify:* lint bans raw layout markup patterns; `/styleguide` renders every component/state.
- [ ] ◐ **Accessibility WCAG 2.2 AA** (axe, keyboard, screen reader, forced colors, 200% text). *Verify:* axe 0 serious; manual script `docs/qa/A11Y-MANUAL.md`; conformance statement.
- [ ] ◐ **Responsive 320–1920 px, text 100–200%.** *Verify:* alignment + layout detectors zero HARD findings.
- [ ] ✗ **System pages**: 404, offline, slow, error, session expired, no access, link inactive, maintenance, 429, read-only/plan ended (see `V3-SYSTEM-PAGES-AND-FINISH.md`).
- [ ] ◐ Empty / loading (skeleton) / error / success states for every list and form.
- [ ] ◐ Onboarding (setup wizard) and in-app help; "What's new" page; feedback channel.
- [ ] ◐ i18n (strings in a catalogue, 13 languages scaffolded, RTL check). *Verify:* no hard-coded UI text (lint).

## A2. Architecture and code quality
- [ ] ✗ **No god components** (found: `Workspace` 2,036-line function, `Reports` 1,431, `PdfStudio` 904, `Midweek` 904; 20 functions > 150 lines). *Verify:* ESLint `max-lines-per-function` 120, `max-lines` 400, `complexity` 12 (ratchet).
- [ ] ◐ Clear layers: `packages/core` (pure domain) · `apps/web/src/data` (repositories) · UI. *Verify:* `dependency-cruiser` rules (UI cannot import data internals; core cannot import React).
- [ ] ✗ Strict typing: 54 `any`, 15 empty `catch {}`, `allowJs: true`, no `noUncheckedIndexedAccess`. *Verify:* `no-explicit-any`, `no-empty`, `no-floating-promises` = error.
- [ ] ✗ **Every `<button>` has an explicit `type`** (195 do not). *Verify:* `react/button-has-type`.
- [ ] ◐ No dead code (11% of CSS classes unused; 25 unused exports). *Verify:* `knip` (files/exports/deps), `stylelint` unused selectors report → zero.
- [ ] ◐ Dependency hygiene (lockfile ✔, Dependabot ✔). *Verify:* `knip`, `depcheck`, license check (no GPL in shipped code).
- [ ] ✗ Architecture Decision Records (`docs/adr/*`), architecture overview, module READMEs.
- [ ] ✗ Config validated at startup with Zod (env, feature flags, `public-config.json`); typed `storage` wrapper (67 raw `localStorage` calls).

## A3. Testing
- [ ] ✔ Large test suite (≈100 files: unit, role/SQL, PDF golden, browser, layout).
- [ ] ✗ **Coverage gates** (none configured): core domain ≥ 85% lines, permission-critical code 100% branches, ratchet up only.
- [ ] ◐ Visual regression baselines per screen × theme × breakpoint (sampled PR, full weekly).
- [ ] ◐ Contract tests for every RPC (input validation, role matrix, tenant isolation).
- [ ] ✗ Property-based tests (fast-check) for parsers, PDF layout, attendance math, assistant.
- [ ] ✗ Flaky-test policy: retry ≤ 1, quarantine list with owners, weekly review.
- [ ] ✗ Load test against staging (k6): 300 congregations × 150 publishers, month-start burst.

## A4. CI/CD and release
- [ ] ✔ Consolidated workflows (`ci, e2e, pdf, deploy, scheduled`).
- [ ] ◐ Required checks + protected `main` + CODEOWNERS + PR template (**OWNER** sets branch protection; Codex adds the files).
- [ ] ✗ Preview deploys per PR; environments (staging/production) with protection rules.
- [ ] ✗ Migrations: expand → backfill → contract; every migration has `down`, a dry run, and a pre-migration snapshot step.
- [ ] ✗ Semantic versioning, `CHANGELOG.md` generated from conventional commits, release notes in `/updates`.
- [ ] ◐ Feature flags (exists ad hoc) → one typed flag registry with owner + expiry date.
- [ ] ✗ Rollback drill documented and rehearsed.

## A5. Reliability and operations
- [ ] ✗ SLOs (availability 99.5%, p95 API < 500 ms, error rate < 1%) and error budgets in `docs/engineering/SLO.md`.
- [ ] ✗ **OWNER** Uptime monitor on `/`, `/app/`, Supabase health; public status page.
- [ ] ✗ Backups: Supabase Pro daily + PITR; monthly encrypted off-site export; **restore drill each quarter**; RTO 4 h / RPO 24 h documented.
- [ ] ✗ Runbooks: outage, bad deploy, DB restore, key rotation, rate-limit storm, payment webhook backlog.
- [ ] ◐ Graceful degradation (offline queue exists; add slow-mode, read-only mode).
- [ ] ◐ Rate limiting on every anonymous endpoint (16 mentions found; needs a single tested mechanism).

## A6. Observability (privacy-safe)
- [ ] ✗ Structured error reporting that is **local or first-party**, scrubbed of personal data, rate-limited, opt-in for details.
- [ ] ✗ Metrics: web vitals (cookie-less), RPC latency/error counters, queue depth, webhook failures.
- [ ] ◐ Audit log for admin actions (AP revoke has one) → uniform append-only audit table (no update/delete grants).
- [ ] ✗ Alerts: failed-login spikes, mass export, webhook failures, error-rate burn.

## A7. Security
See Part B (must be fully ✔ before charging customers).

## A8. Data and privacy
- [ ] ◐ Data map (`docs/PRIVACY-DATA-MAP.md`) generated from the schema; subprocessors list.
- [ ] ◐ Retention + deletion (export pack, delete with receipt, crypto-shred) tested end-to-end.
- [ ] ✗ DPDP Act readiness: notice, consent, purpose limitation, grievance contact, data-principal rights, breach notification (72 h), **children's data** (publishers include minors — verifiable guardian consent) → **OWNER** lawyer review.
- [ ] ◐ Encryption: in transit ✔ (HTTPS), at rest (Supabase), end-to-end (Vault) — claims gated by tests.

## A9. Identity and access management
- [ ] ✔ Google sign-in, role presets, invites, no shared passwords (legacy removed).
- [ ] ◐ Least privilege per role (95 authenticated definer functions need a per-function role matrix).
- [ ] ◐ Session management (list devices, sign out everywhere, admin idle timeout ✔).
- [ ] ✗ Offboarding: revoking a person kills sessions, links and pool membership in one action; tested.

## A10. Billing and commercial
- [ ] ✗ Plans/entitlements as data; trial → Lite fallback; proration; invoices (PDF) and GST fields; dunning; refunds.
- [ ] ✗ Razorpay webhooks: signature check, idempotency table, replay-safe, reconciliation report. **OWNER** keys.
- [ ] ✗ SuperAdmin dashboard: MRR/ARR, funnel, renewals, failed payments (billing metadata only, never content).

## A11. Support and success
- [ ] ✗ Support inbox + SLA, help center (in-app and site), status comms template, bug-report button (no personal data), NPS after first S-21.

## A12. Legal and compliance
- [ ] ◐ Terms, Privacy, Refund & Cancellation, Cookie statement ("no tracking cookies"), accessibility statement, third-party licenses (`THIRD-PARTY-NOTICES.md`), `security.txt` — **OWNER** lawyer review.

## A13. Performance and cost
- [ ] ◐ Budgets: initial JS ≤ 250 KB gz, LCP ≤ 2.5 s (Slow-4G), INP ≤ 200 ms, CLS ≈ 0; route code-splitting; fonts subsetted.
- [ ] ✗ DB: indexes for every RLS/join path (`EXPLAIN` evidence), no sequential scans on hot tables; connection limits; cost alerts.

## A14. Documentation and governance
- [ ] ◐ README, AGENTS.md, DESIGN.md ✔; add CONTRIBUTING, architecture, API/RPC reference, runbooks, "bus-factor" note and **continuity pledge**.

---

# PART B — Security checklist ("so attackers can't get in")
No product is unhackable. The goal is **defence in depth, tested continuously, with fast detection and recovery.**

## B1. Authentication
- [ ] ✔ Google OAuth / magic link; no password storage by us. [ ] ✗ Disable the unused email+password provider in Supabase (advisor warns about leaked-password protection) **OWNER**.
- [ ] ◐ Short session lifetime, refresh-token rotation, revoke-on-sign-out; admin idle timeout ✔. *Verify:* test with expired/rotated tokens.
- [ ] ◐ Link tokens ≥ 256-bit, stored **hashed**, rotate/revoke, rate-limited, exchanged then removed from the URL (`history.replaceState`). *Verify:* brute-force test.
- [ ] ✗ Recommend Google 2-Step Verification to admins (banner) and enforce for SuperAdmin accounts **OWNER**.

## B2. Authorization and tenant isolation
- [ ] ◐ **RLS enabled and forced on every table in an exposed schema** (static scan: 9 tables with neither `enable RLS` nor a policy — e.g. `ca_private`, `ca_migrations`, `ca_ap_private`, `ca_oclm_*`, `ca_meeting_*`). Verify in the database: `select relname, relrowsecurity, relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r';` → all true, or move internal tables to a non-exposed `private` schema.
- [ ] ◐ **104 SECURITY DEFINER functions** (all have `set search_path` ✔). Reduce exposure: revoke `execute` from `public/anon` by default; grant per function; convert to `security invoker` where RLS suffices; fully qualify names. *Verify:* generated **role × function matrix test** (anonymous, publisher, household, group overseer, each overseer, admin, SuperAdmin, other tenant).
- [ ] ◐ Supabase advisors clean (report: 13 anonymous + 95 authenticated definer-function findings; target: only intended, documented exceptions).
- [ ] ✔ No service-role key in client or repo (scan clean). [ ] ✗ CI secret scan on every push (gitleaks) + GitHub push protection **OWNER** enable.
- [ ] ✗ IDOR tests: for every RPC taking an id, a test that another tenant's/another role's id is rejected.

## B3. Input and output safety
- [ ] ◐ Zod validation at every boundary (used in a few places) and length/range checks inside SQL functions.
- [ ] ✔ No `dangerouslySetInnerHTML`, `innerHTML=`, `eval`, `new Function`. Keep it banned by lint.
- [ ] ◐ **CSV/Excel formula injection** neutralised on every export; import size/type/row limits; zip-bomb guard.
- [ ] ✗ ReDoS review of the assistant parser and import parsers (max input length, linear-time patterns, fuzz test).
- [ ] ✗ `rel="noopener noreferrer"` on all `target="_blank"` (4 missing). Open-redirect test for every redirect/`returnTo`.

## B4. Browser and hosting security
- [ ] ✔ Strict CSP in the Cloudflare worker (`default-src 'self'`, no inline styles/scripts, `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`), HSTS, nosniff, `Referrer-Policy: no-referrer`, Permissions-Policy.
- [ ] ✗ **GitHub Pages cannot send headers** (no real `frame-ancestors`, HSTS, COOP/CORP) → **OWNER**: move production to Cloudflare Pages before launch; until then keep the CSP meta tag and document the gap.
- [ ] ✗ Add `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, Trusted Types (`require-trusted-types-for 'script'`) where feasible; SRI for any third-party asset (target: none).
- [ ] ◐ Supabase session in `localStorage` is XSS-sensitive → compensate with strict CSP, zero third-party scripts, short sessions; no secrets in storage (only preferences found ✔).
- [ ] ◐ Service worker scope minimal; no caching of authenticated API responses; update prompt (no silent skipWaiting).

## B5. API/RPC abuse protection
- [ ] ◐ Rate limits + Turnstile on **every** anonymous endpoint (application form, public report/attendance, noticeboard, link exchange) with a single tested mechanism and uniform error responses (no account/link enumeration; constant-time token compare).
- [ ] ✗ Pagination limits and max payload size on every RPC; idempotency keys for submits; replay protection on webhooks (Razorpay, Meta).
- [ ] ✗ CORS allow-list (exact origins), no wildcard.

## B6. Data protection
- [ ] ✔ HTTPS only. [ ] ◐ Encryption at rest (provider) + Vault E2EE (claims gated by tests). [ ] ◐ Backups encrypted; deletion = crypto-shred.
- [ ] ◐ Logs and error reports contain no personal data (redaction tests). [ ] ✗ Data minimisation review for every table (purpose, retention).

## B7. Secrets and configuration
- [ ] ✔ No secrets in tree (scan clean; repo is public → keep clean). [ ] ✗ Secrets only in GitHub **environment** secrets and Supabase secrets; rotation calendar (90 days); least-privilege tokens (Cloudflare token scoped to Pages; Razorpay restricted keys).
- [ ] ✗ Startup config validation fails closed.

## B8. Supply chain
- [ ] ◐ Lockfile ✔, Dependabot ✔. [ ] ✗ **Pin every GitHub Action to a commit SHA** (all 30 refs use tags); Dependabot for `github-actions`; `npm ci --ignore-scripts`; `npm audit --omit=dev` + OSV scanner in CI; SBOM (CycloneDX) artifact; license allow-list; minimal dependency count.
- [ ] ◐ Reproducible build + published build hash (`version.json`) + visible version in Settings.

## B9. Infrastructure
- [ ] **OWNER** Cloudflare: proxy on, WAF managed rules, rate-limit rules on `/rpc` and form paths, Bot Fight Mode, DNSSEC, CAA records, Always HTTPS, TLS ≥ 1.2, HSTS (preload later).
- [ ] **OWNER** Email auth: SPF, DKIM, DMARC (`p=quarantine` after review). Registrar lock + 2FA everywhere (GitHub, Cloudflare, Supabase, GoDaddy, Google, Razorpay, Titan).
- [ ] **OWNER** Supabase: Pro (backups/PITR), SSL enforced, network restrictions where possible, separate staging project, least-privilege DB roles, alerts on auth/DB anomalies.

## B10. Detection and response
- [ ] ✗ Append-only audit log (who, what, when, via assistant?) for: sign-in, role/access changes, link create/rotate/revoke, exports, backups, plan changes, deletes. Visible to congregation admins.
- [ ] ✗ Alerts (failed-login spike, mass export, webhook failures); `docs/INCIDENT-RUNBOOK.md` with 72-hour notification steps; tabletop exercise once.
- [ ] ✔ `SECURITY.md` / `security.txt` policy; ✗ response-time promise and PGP/contact; **OWNER** independent penetration test before heavy marketing.

## B11. Secure SDLC
- [ ] ✗ Threat model (`docs/engineering/THREAT-MODEL.md`: assets, actors, entry points, abuse cases for each role, assistant, public links, billing).
- [ ] ✗ SAST: Semgrep OSS (+ CodeQL while the repo is public) with SARIF upload; DAST: OWASP ZAP baseline against staging; headers/TLS test in CI.
- [ ] ✗ Code review rules: CODEOWNERS for `supabase/`, `.github/`, `packages/core`, `hosting/`; two-step review for security files; signed commits (optional).
- [ ] ✔ Security-relevant tests exist (role/RLS, assistant zero-network, direct downloads); ✗ run in a dedicated `security` workflow.

## B12. Privacy law and special data
- [ ] ✗ DPDP checklist (notice, consent, purpose, rights, grievance, breach, **minors**), sensitive-category review (religious affiliation is sensitive personal data) — **OWNER** lawyer.
- [ ] ✗ Data-processing terms with subprocessors (Supabase, Cloudflare, Google, email provider, Razorpay, optional Meta).

## B13. The assistant
- [ ] ✔ On-device, no network (tested). [ ] ✗ Role-gated actions only from the registry; destructive actions need typed confirmation; every execution audited "via assistant"; input length cap + parser fuzzing.