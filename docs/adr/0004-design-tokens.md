# 0004 — Component-owned layout and semantic tokens

Status: accepted target; migration in progress.

Use DESIGN.md and the supplied theme definitions as the visual authority. Components own padding, alignment and control states; screens compose shared Page/Header/Section/Stack/Inline/Grid/Card/Field/Table primitives. Screens must not accumulate overrides of shared component geometry.

The target is nine font-size tokens, five radii, eight spacing values, four viewport breakpoints and named z-index/control-height tokens. Use container queries for content-specific changes, including the publisher spreadsheet's labelled narrow rows. Respect large text, reduced motion and solid surfaces. Overlay surfaces remain opaque and distinct from the page.

The existing stylesheet cascade is not already compliant. Stylelint and css-audit remain blocking until duplicate definitions, raw values, important declarations and old screen layouts are removed. Do not edit the supplied themes to hide a cascade bug or weaken geometry tests.

Evidence: packages/ui/layout.tsx, packages/ui/Field.tsx, packages/ui/people-table.css, packages/ui/tokens.css, .stylelintrc.json and scripts/css-audit.mjs. The Home sample is limited evidence, not all-screen acceptance.
