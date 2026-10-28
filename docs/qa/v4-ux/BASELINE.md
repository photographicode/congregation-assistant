# V4-UX Phase0 baseline — 2026-10-28

Source: `8565b6b76f849ec0008cfe86492af37d1e0e7f96`. Branch: `v4/ux-simplification`. No product, website, database, auth, PDF-engine or hosting source changed. Previous incomplete refinement is preserved in git stash.

## Commands and evidence

`npm ci`: passed (954 packages,16seconds). Dependency deprecation warnings retained in local log; no dependency changes.

| Command | Result | Seconds |
|---|---|---|
| `npm run lint` | PASS | 10.1 |
| `npx tsc -p apps/web/tsconfig.json --noEmit` | PASS | 6.8 |
| `npm test` | PASS | 5.5 |
| `node --test scripts/v2-tests/*.test.mjs` | PASS | 13.2 |
| `npm run build` | PASS | 10.5 |
| `npm run check:bundle` | PASS | 0.3 |
| `npm run check:css` | PASS | 0.3 |
| `npm run check:style` | PASS | 0.7 |
| `npm run check:strict-types` | PASS | 8.0 |
| `npm run check:contrast` | PASS | 3.9 |
| `npm run check:vercel-guidelines` | PASS | 0.2 |
| `npm run test:browser` | FAIL (exit 1) | 85.9 |
| `node scripts/check-v3-shell.cjs` | PASS | 33.1 |
| `node scripts/check-short-navigation.cjs` | PASS | 4.7 |
| `node scripts/check-publisher-portal.cjs` | FAIL (exit 1) | 0.6 |
| `node scripts/check-scheduling-simplicity.cjs` | FAIL (exit 1) | 1.0 |
| `node scripts/check-reachability.cjs` | FAIL (exit 1) | 33.5 |
| `npm run test:pdf` | PASS | 133.3 |

The first cutover browser run failed on a delayed unused font-preload console warning while the screenshot/PDF workloads overlapped. An isolated rerun passed48screens, zero failures. Both outputs retained; no assertion changed.

Three literal plan commands remain failed: publisher-portal and scheduling-simplicity require missing bundled Chromium and target retired V1 globals; reachability waits for a destination after the old direct-navigation interaction. These are not passes. Current equivalents below retain the actual native functional checks; existing CI remains intact.

- Fresh Pages build + `node scripts/v4-tests/browser.cjs`: passed publisher contact edits, time-away, announcements/navigation, zero Axe violations, cloud calls and errors.
- `node scripts/check-v3-resume.cjs`: passed S21 entry, filters, on-device privacy and responsive matrix.
- `node scripts/check-direct-downloads.cjs`: passed26downloads, including individual S21, PDFs, ZIP, student slips and emergency search.

## Visual sample

`node scripts/check-v4-ux-baseline.cjs`:252views; seven roles × six viewports × three text sizes × two route selections, with four themes rotated. This is a stratified sample, not the full Cartesian matrix. Zero Axe violations, horizontal overflow, browser errors and Supabase requests. See [machine-readable sample](phase-0/matrix.json) and [contact sheets](contact-sheets/). Full screenshots are generated locally under phase-0 and excluded from Git to avoid committing252individual binaries.

Important visual failures despite automated accessibility/overflow passes: header controls exceed budget (admin5 on phone); avatar extends below header at200%; settings renders multiple h1 elements (5 on staff settings); lengthy pages require excessive scrolling. These remain baseline findings, not fixed.

## Measured task actions

See [task results](taps.json). Form typing/field selection is excluded; only action buttons/navigation are counted. Incomplete tasks are not scored as successes. Reproduce with `node scripts/check-v4-ux-baseline.cjs --tasks`.

T1=0, T2=3, T3=2, T4=2, T5=4, T6=3 via Quick actions, T7=2 to a user-initiated reminder, T8=3 via People, T9=2, T10=3. T11 reaches demo Publish in3 actions but cannot verify a real share link. T12 has no role-specific next-duty view in the supplied group demo. No WhatsApp message was sent.

## Diagnosis corrections

- F1 confirmed by browser history/refesh capture: [navigation baseline](navigation-baseline.json).
- F2 same icon confirmed in SectionHub source and tile views.
- F3 duplicated locations confirmed; native PDF studio already downloads directly, so the proposed Generate preview is obsolete.
- F4 header crowding confirmed; inspector unused and collapse restoration absent in source.
- F5 long admin Dashboard confirmed.
- F6 confirmed in attendance/group/field demos.
- F7 slogan headings confirmed.
- F8 settings workbench and multiple h1 headings confirmed.
- F9 corrected: LegacySelect is a shared custom Select adapter, not a native select. Sampled screens contain0visible native selects and0details elements. Existing Disclosure is also custom. Preserve these controls unless changing their presentation is required.
- F10 repeated card hierarchy confirmed visually; assignment check icon confirmed in source.
- F11 JavaScript labels bypass catalogue confirmed in source.
- F12 component sizes confirmed; extraction must preserve behaviour.

## External verification limits

SonarQube analysis is unavailable: no analysis MCP tool and `sonar` CLI absent. No SonarQube pass claimed. Vercel guidelines run locally; no Vercel deployment or hosting change. Supabase schema/RPCs unchanged. Human usability participants have not been recruited or tested; Phase9 observer evidence cannot be invented.

## Next phase

Router implementation is next, with legacy URL compatibility and dirty-form guards first. Retired-script mismatches are recorded as plan corrections in DECISIONS.md, not erased from baseline evidence.
