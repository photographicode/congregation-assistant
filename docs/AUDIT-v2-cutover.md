# V2 cutover audit

Audit date: 14 October 2026 (client timezone). Starting evidence is the owner's uploaded cutover README; remote production behavior has not been reverified in this execution environment.

## Confirmed source findings

1. The original V2 Workspace rendered reports, duties and midweek scheduling through a `Legacy` iframe. Removed from native source; replacement modules use established server calls.
2. Original build copied V1 root scripts, public-site-preview and all vendor assets into production. New build packages only V2 and apps/site, with a separate dist-site output.
3. Original Vite output was dist/v2 and the entry manifest link assumed a parent directory. Changed to dist root with a validated BASE_URL and root manifest.
4. All demo values originally obtained admin memberships, including publisher. Publisher now uses publisher roles and its own home/report screen. Backend calls are explicitly rejected by the RPC helper in demo mode.
5. Support Gmail and old public-site links were in public config. Intended domain/support values updated; readiness flags remain false.
6. The root V1 and duplicate source trees still exist. Complete native parity is absent, so source deletion and production cutover remain blocked as required by “After parity.”
7. The greeting used a fixed heading and date, without a clock. Added locale/timezone-aware time, minute alignment/resume and explicit time-format preference. First-name source is publisher record in personal Home, otherwise approved profile fallback; English variants are deterministic by local date; honorific/name preference remains incomplete.
8. Phone navigation previously had only a fixed padding assumption. Browser checks exposed apparent overlaps and the shell now reserves a measured navigation area with an internally scrolling content area. The detector also accounts for scroll clipping and modal foregrounds.
9. Crypto is a large lazy-loaded module (~315 KiB gzip); it is excluded from initial app budget and service-worker precache. Initial native app JS is approximately 150 KiB gzip. The website tour is approximately 48 KiB gzip. Complete website/font payload and Lighthouse still need measurement.
10. Publisher private drafts, role-specific settings, notification/reminder management, PDF parity and complete SuperAdmin are not native equivalents yet. They are recorded in PARITY rather than asserted complete.

## Access and review findings

- GitHub CLI reports invalid GH_TOKEN / forbidden API access. Read-only connected GitHub tools could inspect two open PRs and the open issue. Git transport later pushed the branch successfully; CLI draft-PR creation still returned GraphQL Forbidden. No PR/issue write, merge or close action occurred.
- PR #37: mobile/PDF/usability work, conflicting head and original record layouts. Useful design/export logic to port; incompatible with a wholesale cutover merge without review.
- PR #7: draft, conflicting head, legacy-auth/security fixes. The new implementation should retain its security intentions; direct merge is not appropriate for native cutover.
- Issue #39 accurately states preview deployment and outstanding master requirements. Update after a verified release; do not close it as completed now.
- No GoDaddy, Cloudflare, DNS-provider or mail provisioning credentials are bound. No domain change was made.
- Network policy lists the older fb nonglo project, but V2 connects to ejosykrxjvwrhxfnputo. The connected Supabase tool could subsequently read metadata and confirm required RPC signatures and RLS on publishers/reports/attendance/access; browser OAuth and live role acceptance remain unverified. Supabase changelog fetch returned proxy 403; the web connector could not parse its markdown. No current-doc verification is implied.
- No supported interactive virtual-screen tool is exposed. Browser checks use the installed Chromium; screenshots are a review artifact, not an interactive screen.

## Verification

See CUTOVER-REPORT for the final measured results. Remaining required audits include live RLS/permissions, all anonymous RPC abuse limits, Lighthouse, full broken-link crawl, CSP reporting, physical keyboard/safe-area handling, Indic PDFs, actual 5000-row imports, offline edits and real subscription transitions. Do not infer these from local demo tests.

- Live metadata confirms ca_has_role requires Google identity. The implemented email-link UI is therefore gated off with MAGIC_LINK_ENABLED=false until approved-account policies and provider/callback configuration are tested. SuperAdmin remains Google-only.

## Additional resolved local findings

- Changing the fictional congregation to Asia/Kolkata exposed timezone-chip/clock overflow at doubled text. Clock and chip now size to their card and wrap the chip safely.
- Setup progress and section controls needed explicit progressbar/group roles. Their semantics were corrected.
- A late malformed stylesheet edit was caught and restored from the last verified source. The build now rejects esbuild CSS syntax warnings.
- The original website fonts exceeded the intended initial payload. Self-hosted Latin subsets and an explicit 200 KiB build budget bring the measured initial website payload to approximately 126 KiB gzip.
