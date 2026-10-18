# Alignment audit — 18 October 2026

Gate: **not passed**. No contact sheets or marketing captures were rendered. The complete required 2,850-view app matrix, additional role/public states, and website matrix remain open. Coordinates and selectors are in the JSON reports; counts include text-widow findings rather than silently exempting them.

## Comparable before/after

Paper, 390/1440 px, 100% text, six screens (12 views). Before uses the saved pre-fix run; after uses seeded RNG and a fixed browser date.

| Screen | Before | After |
|---|---:|---:|
| home | 4 | 0 |
| people | 10 | 0 |
| pdf | 9 | 0 |
| schedule | 0 | 1 |
| weekend | 0 | 0 |
| settings | 7 | 0 |

Total: 30 → 1. The remaining finding is a single-word final line in Midweek. Evidence: `alignment-before.json`, `alignment-comparison.json`.

## Large-text stress sample

320/390 px, 200% text, Mono Light/Paper, ten screens (40 views): **48 findings**, all text widows; zero detected overflow, clipping, small controls or coverage errors. This sample is not equivalent to the before/after matrix.

| Screen | Findings |
|---|---:|
| home | 5 |
| people | 1 |
| pdf | 7 |
| schedule | 3 |
| weekend | 0 |
| duties | 0 |
| settings | 32 |
| search | 0 |
| assistant | 0 |
| add-person | 0 |

The audit excludes intentionally clipped previews, hidden/decorative elements and scrollable tables. Desktop Quick Actions uses the command palette equivalent. The script reports failed route coverage separately. A successful sample does not establish complete visual acceptance, safe-area/device acceptance or zero CLS.


## POLISH font-preference sample

Five themes, four states (publisher editor, report entry, public report, Settings), twelve widths plus two short-landscape viewports, browser font preferences 16/20/24/32 px: 1,120 views, zero coverage errors, four Settings text-widow findings. All report/editor states in this sample have zero findings. After the Settings note repair, the same 280 Settings views have zero findings/errors. No detector was relaxed; root font sizes and actual theme body fonts are asserted. The sample does not replace the full required application/site/overlay matrix. Whole-phase alignment remains unaccepted.

R1 final local sample: 294 views, zero findings/coverage errors; see r1-sampled-matrix.summary.json. This meets the later sampled HARD gate, independently of the once-only full Actions matrix. No additional full local matrix was run.
