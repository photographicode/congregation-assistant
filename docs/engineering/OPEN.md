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
