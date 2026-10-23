# PR inventory — 24 October 2026

All 12 open PRs were read before cleanup. Dates give age context. None of the small dependency PRs has all required checks green, so none is merged as an unchecked shortcut.

| PR | Branch | Created | Diff lines | Files |
|---|---|---|---|---|
| #59 | `v3/launch-hardening` | 2026-10-23 | +530/−5291 | 119 |
| #51 | `dependabot/npm_and_yarn/date-fns-4.4.0` | 2026-10-17 | +5/−5 | 2 |
| #50 | `dependabot/npm_and_yarn/zod-4.6.7` | 2026-10-17 | +7/−7 | 3 |
| #49 | `dependabot/npm_and_yarn/tanstack/react-query-5.104.2` | 2026-10-17 | +15/−9 | 2 |
| #47 | `dependabot/github_actions/actions/setup-python-7` | 2026-10-17 | +1/−1 | 1 |
| #46 | `dependabot/github_actions/actions/configure-pages-6` | 2026-10-17 | +1/−1 | 1 |
| #45 | `dependabot/github_actions/actions/setup-node-7` | 2026-10-17 | +13/−13 | 6 |
| #44 | `dependabot/npm_and_yarn/types/qrcode-1.5.6` | 2026-10-17 | +5/−5 | 2 |
| #43 | `dependabot/github_actions/actions/upload-pages-artifact-5` | 2026-10-17 | +1/−1 | 1 |
| #42 | `dependabot/github_actions/actions/upload-artifact-7` | 2026-10-17 | +7/−7 | 5 |
| #37 | `codex/workpackages-20261010` | 2026-10-10 | +568/−981 | 87 |
| #7 | `fix/secure-backend-debugging` | 2026-10-03 | +250/−15 | 7 |

Plan: retain #59 and runtime minor-update PRs #49/#51. Close #50 after incorporating Zod 4.6.7 and #44 after incorporating its type patch; close five obsolete action-tag PRs replaced by current SHA-pinned workflows and legacy #7/#37 superseded by native V3. Preserve all branches. Link closures to #59; record actual completion below. New PRs must stay <=800 non-generated changed lines.

