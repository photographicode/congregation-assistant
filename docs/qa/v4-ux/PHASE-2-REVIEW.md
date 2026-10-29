# Phase 2 review

Reviewed BASE `eca84ab` → HEAD `7b52c14`, using `phase-2-brief.md`, `phase-2-report.md` and the supplied commit/stat/diff package. Phase 3 working changes were excluded. Outside the diff, only fixed-HEAD context needed to trace Settings/Display, notification, storage and palette behavior was inspected. No implementation edits, commits, or full test reruns were made.

**Spec compliance: issues found. Task quality: needs fixes. No critical finding.**

## Important findings

1. **Display changes the URL without opening the promised controls.** `apps/web/src/main.tsx:333` navigates to `screen=settings&tab=display`. The existing destination has no settings-tab handling: `apps/web/src/features/Workspace.tsx:153` reads `tab` for workspace subviews, while its Settings branch at `:1620` renders the same full Settings/Profile page regardless of that value. For publishers, Appearance remains a closed disclosure (`:88`, `:1625`). Consequently Avatar → Display lands on Profile & time away and does not expose text size/light-dark controls; when already on Settings it does not even move the viewport to them. `scripts/check-v4-ux-shell.cjs:7` asserts only the URL, so its passing result does not verify this behavior. Wire Display to an actual visible appearance destination and assert the controls, including the publisher flow.

2. **More does not implement the specified settings/access catalog, and its search cannot find Sessions.** `apps/web/src/features/more/MorePage.tsx:6` groups all `admin` tools under Congregation; `:10` only adds What's new, Help and Sign out under You. The registry has no Sessions tool, so the required Sessions row is absent and typing “Sessions” returns “No tools match your search,” although Sessions exists farther down Settings. Settings appears under Congregation instead of You, and Links & access appears there instead of Everyday. The You actions also omit the required row icons/descriptions. Tools remain generally accessible through Settings, but the new searchable page does not provide the explicit destinations and grouping required by §5.7. Add the missing role-authorized row and implement the specified grouping/row presentation without changing role boundaries.

## Minor findings

3. **Inbox has no badge or unread-count plumbing.** `packages/ui/AppShell.tsx:10` accepts only an Inbox callback, and `:27` renders only the bell. `apps/web/src/main.tsx:333` supplies no open-approvals/contact-update count. Admins therefore receive no header indication that attention is needed. The brief defers Inbox content to Phase 3, but explicitly includes the badge in the Phase 2 global header requirement; retain this as an unfinished shell requirement if it will be completed with Phase 3.

4. **Publisher avatar labeling remains generic.** `packages/ui/AppShell.tsx:29` always renders “Account and appearance,” rather than the required publisher “My details” item. Me opens the existing Profile & time away/Settings page and does not itself contain the specified Help/Sign out actions. These actions remain reachable through the avatar, so this is a copy/IA gap rather than lost functionality.

5. **The alignment audit's phone Quick scenario now audits Search.** `scripts/alignment-audit.ts:26` still falls back to opening Search when the header Quick actions button is invisible. Phase 2 intentionally removes that button from phones, so its `quick` scenario takes the fallback at phone widths rather than opening the new popover through Account. The separate dialog-refinement checks use the correct helper, but the alignment matrix's Quick results are not evidence for phone popover geometry. Use `openQuick` there as the other consumers do.

## What satisfies the brief

- Capability-derived role navigation, separate tab icons and labels, owner isolation, attendance/duties default destinations, full More navigation and removal of SectionHub are present.
- Unavailable registry stubs are excluded; existing tool icons in More are individually mapped. Role checks were not introduced inside AppShell.
- Header action count is reduced; Assistant is first in admin search; updates moved into Account; Add uses the non-modal popover variant; collapse preference is restored; the rail slogan/caption and per-page footer are removed.
- The diff contains no website sources, schema/RPC definitions, PDF templates, auth, retention or hosting changes. New visible copy uses translations. Suppression counts decrease; no changed gate was observed being disabled or re-baselined. Existing dismissal/focus assertions are preserved with replacement entry selectors.
- The supplied report records 250 unit tests, 90 script contracts, strict/build/bundle/style/CSS checks and affected browser/demo checks. These results were treated as supplied evidence, not independently rerun evidence.

## Unverified items

- Final CI gate status for exactly `7b52c14`, including every command in brief §1.5, is not established by this review. The report itself retains CI as release authority; explicit current-head PDF/contrast/guidelines/full-browser gate evidence was not independently checked.
- No browser session was rerun against this head; Display behavior above is traced from fixed-HEAD source. The supplied browser evidence covers four role sets, while the complete demo-role/combined-role keyboard walkthrough required by the exit criteria is not independently established here.
- Live authenticated unread approvals/contact-update behavior, all-role More reachability beyond supplied evidence, human usability, SonarQube and production behavior remain unverified. This review concerns the Phase 2 PR staging, not a production deployment.
