# Open engineering work

The owner's measured D1–D7 findings in V3-QUALITY-ORDERS.md are the accepted starting diagnosis; they are not remeasured as an excuse to defer fixing them.

Quality work is in progress. The previous release override is superseded: all new gates must pass before merge/deploy. Production remains the last live-verified artifact.

## Retained acceptance failures

- Browser resume contract still assumes native options after the custom-picker migration. Preserve all filtering/privacy assertions when converting the interactions.
- PDF repeat-download contract encounters the actionable receipt toast. Dismiss the actual notification through its visible close control, rather than forcing clicks or deleting the assertion.

## Execution gaps

Strict typing, architecture/duplication, CSS targets, coverage targets, component extraction, full role/function matrix and production security rollout are not yet accepted. Dashboard-only controls and external physical-device/payment/penetration testing remain OWNER/runtime tasks. No migration is applied without the required verified encrypted backup.

## Q1 gate feedback

- The strict type gate reports unchecked-index/checked-JS issues in the existing source and PDF `.mjs` modules. It remains required and failing until real types/guards are added; no wildcard declarations or `any` substitutions were used to conceal it.
- Stylelint identifies existing specificity, duplicate selectors, raw values and important declarations; Q3 owns the cleanup. No style suppressions were introduced.
- Architecture analysis uses preserved JSX so it inspects source dependencies rather than TypeScript's generated JSX-runtime imports. With that correction it reports zero violations; genuine React/app imports from core remain forbidden.

## Twice-attempted PDF browser characterization

The repeated-download receipt was corrected using the real dismiss control, and picker label containers were corrected so choosing an option no longer reopens its menu. The second local PDF spec completes download/shaping/offline export, then fails its unchanged zero-console gate on the intentional offline HEAD probe to version.json (`ERR_INTERNET_DISCONNECTED`). No forced click, console-filter waiver or removed assertion was added. This stays open for the network-recovery design and characterization work.

## Supply-chain policy feedback

Production SBOM generation works, but the licence gate finds workspace packages with no declared licence. Do not invent a licence grant for owner-authored code merely to make the gate green; establish the repository licence/owner decision and distinguish first-party components from third-party notices. OSV/Semgrep/CodeQL workflows are configured but not yet live-verified as passing.

The licence-gate workspace finding is resolved by preserving the existing proprietary LICENSE and verifying first-party workspace identity/version separately. No new licence permission was granted. The remaining 104-component production SBOM passes the third-party allow-list. Runtime scanner executions and legal review remain separate requirements.

The isolated database workflow now runs a metadata-only enabled/forced-RLS gate after the existing schema/contracts. It refuses an empty schema, so it cannot pass vacuously. It is expected to expose the pre-existing Q6 gaps until additive, twice-tested, snapshot-backed migrations repair them. No live schema was modified.

## Q4 Home layout characterization (30 views)

A 30-view sample (Home × paper/Eclipse/Eclipse Night × 320/600/1024/1440/1920 × 100/200% text) found 749 HARD findings and 17 soft findings. Most were descendants of the 720px-minimum publisher spreadsheet exceeding narrow viewports; the privacy note also mixed centered and left alignment. The table now has shared component-owned CSS with labelled rows in narrow containers, and the privacy note follows its stack alignment. Verification of that correction is the next batch; this sample is not acceptance proof.

The offline HEAD-probe issue above is resolved: the network monitor now avoids probing when navigator.onLine is false. The unchanged PDF browser contract passes direct downloads, eight selectable scripts, offline emergency regeneration, zero browser errors, and demo isolation. This does not establish general network recovery, all-screen geometry, or production security acceptance.

The next 30-view Home sample reduced findings to 195 HARD and 17 soft. Remaining HARD findings were clipped header descendants and large-text row-action widths. A second correction keeps header boxes within their clipped region and stacks each narrow-row label/value with wrapping actions; the container threshold follows its font size (em). This correction is not yet accepted by a new matrix run.

## Live CI feedback (quality branch)

At b38411b, Actions confirms architecture, cycles, duplication, lint ratchet, Semgrep and CodeQL pass. CI/39730399110 and Security/39730399040 remain failing, so no merge/deploy is permitted.

- Public-safety caught a synthetic privileged-key literal in the configuration rejection test. The test now constructs the same invalid prefix from components; it still asserts rejection, and the scanner is unchanged.
- Gitleaks' sole full-history finding is the generated English message key at en.json:173 in 85c44b5. The line contains only “Independent and unofficial. Your congregation controls access.” and its lookup key. `.gitleaksignore` documents that exact historical fingerprint only. No secret rule or path is disabled.
- OSV reports real development dependencies, including the old Vitest/mocker/tinypool and Wrangler dependency chains. Patched upgrades are in progress; no finding is waived. The braces 3.0.3 advisory GHSA-vfj7-8cjw-p6xm currently has no fixed version in the scanner result or npm registry; it remains a release blocker, pending an upstream fix or tested dependency replacement.
- The 30-view Home correction passes zero HARD findings. Seventeen typography/widow findings remain; zero findings across the full product is not established.

The patched dependency batch upgrades Vitest/coverage to 4.1.12, Wrangler to 4.151.3 and the shipped fflate parser to 0.8.3. All 209 Vitest tests and 83 script contracts pass with the upgraded runner; production npm audit reports zero vulnerabilities. OSV must still re-run against the new lockfile; braces has no released fix and no advisory is ignored.

Local installed-tree SBOM generation included an extraneous dev-only sharp WASM package, even after npm prune. The lockfile records that package as dev/optional. Production SBOM generation now uses CycloneDX's documented --package-lock-only --omit dev mode, so it describes the reproducible production dependency graph rather than local build-tool residue. That SBOM passes the unchanged licence policy (100 third-party and 4 proprietary first-party components); no LGPL allow-list exception was added.

Fresh interaction evidence exposes 110 HARD focus-ring findings across 10 screen/width views. Hover, active, cursor and target checks pass; pointer-origin programmatic focus did not match focus-visible on these controls. The shared interaction rule now paints the same ring for all focus, including pointer and keyboard focus; no assertion was changed. Verification follows a rebuilt artifact. The 11-theme dialog-layer check passes opacity, contrast, borders, scrim and tone-strip requirements.

Six architecture decisions are now recorded in docs/adr (stack, local-first Store, Vault acceptance restriction, tokens/layout, database authorization and canonical deployment). They distinguish accepted targets from incomplete implementation; they do not mark runtime/dashboard checklist items done.

The first interaction correction still failed. Direct browser inspection identified the underlying cascade error: design-system.css used the undefined --ring token in its higher-specificity button focus rule, while styles.css and one gender state treated the complete --focus-ring shorthand as a color. Those declarations now consume the complete theme-owned outline token. The second correction retains the original audit unchanged; if it fails, stop this fix loop and retain the open failure.

The second focus correction passes the unchanged 10-view interaction audit: 0 HARD and 0 soft findings. The current-source dialog audit also passes all 11 themes; both reports have the same current fingerprint. check-final-release passes its evidence/geometry subset. This is not the complete quality release gate: strict types, CSS, unused code, coverage, database hardening and the unfixed dependency advisory still block release.

The refreshed Actions OSV artifact for 42ade4c contains only braces 3.0.3 / GHSA-vfj7-8cjw-p6xm. Gitleaks, Semgrep, CodeQL and the policy scanner pass. No OSV ignore was introduced. The final local PDF browser contract also passes after the dependency and focus changes, including zero console/backend errors in the fictional demo.


## Launch hardening, 2026-10-23

Production Supabase metadata and security-advisor reads were rejected by project permission checks. No plaintext counts, schema state, backup verification or remote migration/deletion are claimed. The existing guarded legacy-auth drop/down migration is the intended removal path after the encrypted snapshot gate.

Current strict quality check: 447 diagnostics. CSS: 108,052 bytes, 44 font sizes, 21 radii, 10 breakpoints, 36 important declarations, 102 feature classes. No targets were weakened. Anonymous RPC rate limiting, exhaustive server validation/role matrix, contact Turnstile delivery and complete launch website audit remain blocking work. See POLISH-REPORT.md for current checks and OWNER-TODO.md for provider actions.

One browser run was invalidated when a build replaced its output tree mid-run, causing a navigation failure. That run was discarded; subsequent browser runs use stable generated output and no overlapping build. The first complete matrix found only 79 oversized marquee spans in 1,464 views; the corrected strip passed the stable-output repeat: 1,464 views, zero findings.

## Ratchet burn-down review — 23 November 2026

Owner-authorized initial baselines are `ts-baseline.json`, `css-baseline.json` and `coverage-baseline.json`. Strict diagnostics 447 → 434; changed PR files must have zero. CSS current budgets: 108052 bytes, 44 font sizes, 21 radii, 10 breakpoints, 36 important declarations, 102 feature classes. Original targets remain 71680 bytes /9 /5 /4 /0 /40. Coverage current global lines 9.15%, statements 15.04%, functions 12.48%, branches 12.76%; core lines 81.54%, PDF-layout branches 15.76%. Original targets remain global70%, core85% lines, PDF95% branches, permission-critical100% branches. The historical auth glob matches no source file and is not proof of permission coverage.

Separate unratcheted gates still require real fixes: Stylelint (452 errors observed in CI), knip unused items, complete RPC role matrix, PDF/geometry checks and fresh assembled/live audits. Do not remove those gates merely to obtain green CI.

Stylelint CSS debt ratchet (review 2026-11-23): 452 existing findings, target zero, rules retained. New findings and findings in changed CSS are hard failures. `check:style:all` still reports the complete unresolved list.
