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
