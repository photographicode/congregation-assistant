# V4 UX continuation checkpoint — 2026-10-29

Scope: execute docs/V4-UX-SIMPLIFICATION.md for the app only. User reiterated “Continue and deploy.” Production deployment remains authorized after the required checks. Website, backend/API/schema, PDF engine, authentication and hosting changes remain excluded; domain activation remains deferred.

## Saved state

- Phase0 baseline committed17f0879.
- Phase1 typed URL navigation PR76 merged into integration at eca84ab, including weekend test correction73fd8c6. Current CI checks passed before merge.
- Phase2 shell/navigation PR77 remains open; implementation883c9d2, integration merge1fa4fc2, CI corrections2a3d759 and7b52c14. PR review findings are in PHASE-2-REVIEW.md and must be resolved before release. Local evidence in POLISH-REPORT is historical evidence for those exact iterations, not proof of later Today work.
- Phase3 Today implementation is an **unfinished checkpoint** on v4/ux-today. Worker stopped at the session usage limit, before its report, full verification, review or completion commit. Four needs-attention unit tests and application TypeScript compilation pass on the saved checkpoint. Browser coverage, lint, CSS, all retained capability flows and final review are still required.
- Phase3 has NOT yet incorporated Phase2 corrections2a3d759 and7b52c14. Cherry-pick both, resolving overlaps without discarding Today changes.
- Phases4–9 remain incomplete. Do not deploy this checkpoint.

## Next work

1. Finish/review Phase3 against work/v4-ux/briefs/phase-3-brief.md and the authoritative plan. Preserve existing reporting, assistant and setup capabilities; update intentional test selectors without weakening assertions.
2. Resolve Phase2 review: functional Display destination and visible-control test (coordinate Phase7); searchable authorized Sessions row and correct More grouping/icons; Inbox badge (Phase3); publisher My details copy; phone Quick alignment scenario must open actual popover.
3. Meetings/publisher eligibility, Reports, People/Messages/PDF surface, Settings/Display, then copy/accessibility and final release gates.
4. Existing publisher API already supports the full published programme: repository supabase/publisher-family.sql returns schedule through noticeboard_snapshot. Metadata-only production SQL verified schedule output, published-noticeboard use and publisher identity check. Consume this existing response, never the scheduler draft API for publishers. No new RPC/migration is required.
5. Fresh independent review and required Actions checks on final head, then merge main and verify actual Pages deployment and app flows. Do not treat a PR or a successful build as deployment.

## Limits and provenance

The implementation/review agents stopped because the session usage limit was reached. No production deployment or database mutation occurred in this checkpoint. SonarQube has no callable tools/CLI in this session; do not claim a Sonar scan. Human usability sessions have not been conducted; prepare/run them when participants are available, and keep this distinct from automated demo checks.

The earlier pre-plan navigation refinement remains stashed, including an unauthorized-for-this-UI-only-plan new RPC candidate. Do not apply it wholesale. Existing local plan ledger: work/v4-ux/progress.md. Execution changed from inline to one implementer plus task review; no simultaneous implementation agents.
