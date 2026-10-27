# V4 publisher-first release

Owner decisions: publishers use the app daily, then department overseers, then Main Admin. English launch; existing Google approved-account sign-in, departments, role boundaries and all native tools retained. Main Admin in-app notification on publisher contact edits, self-service time away without approval, no assignment-change request feature. Website redesign authorized. No new paid services. GoDaddy/DNS work postponed by owner.

## Changes
- Calm Today workspace: monthly report, personal assignments, published meeting access, announcements and profile shortcuts.
- Account profile and time-away forms reuse existing scoped publisher RPCs with loading, validation, failed-save retention and stale-edit recovery.
- Private announcement feed and admin contact-update inbox with explicit congregation membership, admin-only writes/inbox access, atomic update trigger and no direct client-table grants.
- Stable navigation and More directory retain legacy functions; publishers open Reports and Meetings directly. Existing appearance/accessibility controls remain under Appearance.
- Matching public website and truthful inactive email messaging. Translation resources retained; launch navigation is English.
- Same-origin custom-domain packaging retains /app; cross-origin redirects still supported. Activation remains false. Existing root CNAME owner edits are preserved.

## Verification in progress
Baseline: 226 unit tests passed. Current check: 231 unit tests and 90 script contracts pass, including stored overlapping away-period compatibility. The full isolated database fixture passes after replacing an expired fixed-week test fixture with a relative upcoming week. V4 lifecycle/permission checks pass twice and rollback/reapply is tested. RPC role matrix: 111 functions × 16 actors = 1776 passed, zero failures. App compilation, strict diagnostic ratchet, lint, CSS budget and Stylelint ratchet pass. Assembled Pages safety and marketing audit: 224 pages, zero failures.

Publisher browser checks pass at 390px and 1440px, including contact save, time-away add/remove, appearance access, direct Reports/Meetings, More navigation, announcement publish/archive and zero demo cloud requests/browser errors. Axe checks: zero violations at both widths. PDF checks pass all 17 golden fixtures, 3433 data-retention assertions and all eight Indian scripts. Coverage passes: statements 16.25%, branches 13.15%, functions 13.16%, lines 10.61%. CI and deployment are pending. Historical check:release references removed v2-screen-flags.json and is not current release proof; required workflow gates remain authoritative. Existing 419 strict diagnostics remain outside changed files; no new diagnostics are allowed. No production rows were erased.

## Independent review
Two important findings corrected: persisted overlapping away ranges no longer block account/home loading; existing publisher appearance/accessibility controls are preserved. Deferred minor observations: sidebar collapse preference is written but not restored on reload; compressed source styles are harder to review. They do not affect record access or saving.

Production: additive V4 migration applied successfully; fresh metadata verifies RLS/no direct client grants on both tables, authenticated-only execution on five scoped RPCs, and one enabled contact trigger. See docs/qa/V4-DB-VERIFICATION.md. No existing records erased.

Further verification: 15 navigation hub views pass; all 12 dialog lifecycles and protected QR/touch/long-script picker checks pass. 198 system-state views/33 Axe scans, 26 direct downloads, installation guidance, website no-JS/dark behavior and retained locale routes also pass. Responsive More navigation keeps a visible opener across short-screen changes. Production migration history matches source version 20261026183947. Final CI/merge/deployment remains pending.
