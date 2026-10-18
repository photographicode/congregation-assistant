CONGREGATION ASSISTANT — COMPLETE REFINEMENT PHASE
Scope: Restore familiar workflows, remove friction, correct defects and polish existing screens. Pause all additional features and unrelated expansion. Preserve the supplied themes, current security controls and direct PDF downloads.
1. Restore V1’s field service report experience
- Inspect the actual v1-final report form and submission logic before editing.
- Recreate its dedicated report card natively: clear heading, publisher identity, reporting month, prominent participation control, studies/hours, helpful descriptions, comments and a strong Submit button.
- Restore the proper success screen and “Submit Another Report” behavior.
- Apply the same visual hierarchy to public/group links and signed-in publisher reporting.
- Preserve current identity restrictions, permitted reporting periods, corrections and validation.
- Review the change from V1’s quarter-hour entry to the current half-hour step. Never silently round or discard valid values.
- Retain entered values after errors, prevent duplicate submissions and distinguish offline pending saves from confirmed receipt.
- Restore V1’s usability without importing legacy scripts, authentication or global styling.
2. Restore monthly AP review and revocation
- Restore the month-specific Auxiliary Pioneer list with names, hours, studies, totals and an authorized Revoke AP action.
- Revocation must affect the selected publisher and month only.
- Preserve the underlying report, participation, studies, hours and comments. Do not copy V1’s silent clearing of hours/comments.
- Refresh the list, totals, filters and relevant S-21 selections consistently after success.
- Preserve existing role and congregation/group restrictions. Failed or stale writes must not display success.
3. Create an app-styled OCLM assignment dropdown
- Replace native assignment selects with one shared, accessible picker, scoped to OCLM.
- Show the name prominently, with last-used information and assignment cautions beneath it.
- Preserve existing qualifications, availability, assistant restrictions and suggestion ordering.
- Support name filtering, keyboard navigation, Enter, Escape, touch, visible focus and screen readers.
- Keep the dropdown inside the viewport and above surrounding panels. Long names, large fonts and mobile keyboards must not clip it.
- Do not redesign every dropdown elsewhere.
4. Allow multiple parts with a caution
- Remove the blanket disabling of an otherwise eligible person because they already have an assignment.
- Show their other parts and halls as a non-blocking caution.
- Distinguish ordinary same-day repetition from an actual timing conflict.
- Preserve all selected assignments through save, reload, publication and PDF generation.
- Keep genuinely invalid combinations excluded, including a student acting as their own assistant.
- Auto-assign should prefer unused eligible people and preserve manual choices. No new allocation modes or settings panels.
5. Remove auxiliary-classroom clutter when disabled
- Persist the existing auxiliary-classroom setting with the appropriate meeting/week.
- When disabled, remove auxiliary controls, counselor, column headings, cells, empty dashes and unused space from:
  - The app schedule.
  - Print output.
  - S-140 PDF.
  - Published live schedule.
- Recalculate column widths and table spans properly.
- Preserve saved auxiliary draft assignments when toggling off; restore them when enabled again.
- Exclude disabled auxiliary assignments from published output.
- Preserve the official S-89 form layout.
6. Remove unnecessary dialogs and fix every remaining dialog
- Inventory every existing dialog, sheet and popup by trigger and role.
- Move routine forms inline where the popup provides no benefit.
- Every remaining dialog must have a reachable Close or Cancel action.
- Test Escape, appropriate outside-click dismissal, Save/Done, navigation and reopening.
- Dirty forms must offer Keep editing or Discard without nested confirmation loops.
- Errors and pending operations must never trap the user.
- Closing must remove overlays, scroll locks and focus traps, then return focus appropriately.
- Reopening must not show stale errors or an old discard-confirmation screen.
- Preserve necessary data-loss and destructive-action safeguards.
7. Clean up publisher forms
- Remove the duplicate Gender control. Keep one canonical field in Add and Edit.
- Check the remaining form for duplicated fields, contradictory defaults, unnecessary sections and inconsistent labels.
- Existing publishers must load their actual values.
- Changing one field must not reset unrelated data.
- Keep Save and Cancel reachable at large text sizes.
8. Perform a critical responsive audit
Do not judge completion from one desktop screenshot.
Test every touched workflow and every existing dialog pattern across:
- Widths: 320, 360, 390, 430, 600, 768, 1024, 1366, 1440 and 1920 px.
- Text sizes: 100%, 130% and 200%.
- Themes: all nine existing themes with their actual fonts.
- Additional conditions: browser zoom, short landscape screens, mobile keyboards, long names and available Indic-script samples.
- Roles: public-link user, publisher, group overseer and relevant administrators/overseers.
- States: normal, empty, loading, error, dirty, pending and saved.
Check overflow, clipping, overlap, dropdown placement, unreachable buttons, uneven alignment, inconsistent spacing, text widows and duplicate controls.
Fix shared layout primitives instead of adding scattered offsets. Keep touch targets and contrast requirements intact. Record comparable before/after findings; never weaken the detector to obtain a green result.
9. Required behavioral acceptance
Verify:
- Report submission, correction, failure recovery and duplicate-click protection.
- AP revocation without losing report data.
- Existing OCLM assignments surviving automatic source refresh.
- Repeated assignments surviving save/reload.
- Auxiliary enabled/disabled behavior across every output.
- Every dialog closing through all supported routes.
- Exactly one Gender field with correct persistence.
- Offline saves surviving reload and syncing once.
- Direct downloads and existing PDF contracts remaining intact.
10. Deliver and report honestly
- Commit tested repairs in focused batches.
- Run targeted checks during development and the full suite at final integration.
- Deploy both repositories after the refinement gates pass and verify both live sites.
- Report exact deployed commits, review URLs, coverage and remaining defects.
- Keep unrelated feature-backlog items outside this phase.
- Do not call refinement complete while known scoped defects remain.
Outcome: Familiar reporting restored, AP review/revoke restored, polished OCLM selection, repeat assignments with cautions, no unnecessary auxiliary clutter, reliably dismissible dialogs and clean layouts across screen and font sizes. No additional product features.