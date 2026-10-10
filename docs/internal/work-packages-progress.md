# Work packages: durable checkpoint

Started 10 October 2026. Continue this file, do not restart completed work.

Source request: uploaded `Pasted text.txt`, work packages WP1–WP11. Attachments are reference material; only the work expressly requested by the owner is authorized. Preserve records and existing deployment. Work on a branch, not main. Do not force-push or rewrite history.

Baseline app: `f15efd22346c06d3e6b1de482f77bd339dd660ca`.
Baseline website: `787bd659df02495c407dec11f0b657d5a788bfae`.
Workspaces: `/workspace/ca-workpackages-app`, `/workspace/ca-workpackages-site`.
Branch: `codex/workpackages-20261010`.

## Package state

| Package | State | Evidence / next action |
| --- | --- | --- |
| WP1 privacy/repository hygiene | Implementation complete; owner gates pending | 171 history commits, 33 Gmail-change commits audited. Personal source references replaced; one canonical support config with generated bundle copies. Proprietary notice and SECURITY.md added; required font-licence attribution preserved. History not rewritten; repo visibility/OAuth rotation need owner action. |
| WP2 original PDF exports | Pending | Inventory embedded templates, replace with original Noto Sans layouts, preserve data and test pagination/print bounds. |
| WP3 branding | Pending | Audit app/site after replacements; documentation may discuss third parties. |
| WP4 content | Pending | Audit fictional programmes; no official-content fetching or parsing. |
| WP5 claims | Pending | Evidence register and restrained wording. Do not invent a biography or support-access restriction. |
| WP6 data minimization | Pending | Non-confidential notices, inactive/minor safeguards, authorization/access records and incident plan. No destructive live migration. |
| WP7 hardening | Pending | Self-host libraries, remove inline handlers/scripts, CSP, synthetic function/hostile-import tests; provider-dependent anti-abuse activation remains separate. |
| WP8 domain/hosting/email | Owner setup pending | Prepare plans only. Domain ownership/mailbox status unconfirmed; preserve old URLs. |
| WP9 commercial/policies | Depends on WP1–WP8 and owner/legal decisions | Draft concrete policies; no billing, merchant activation or unapproved legal commitments. |
| WP10 pilot | Owner acceptance/legal gate | Prepare protocol; no outreach, real-data pilot, or congregation names. |
| WP11 verification | Pending | Mark each gate PASS/FAIL/NEEDS OWNER with precise evidence. |

## Persistent boundaries and decisions

- Use fictional records only in tests, screenshots and demos. Do not request real records, private keys or live-database access for these packages.
- Supabase remains free; upgrading is an owner-only decision, not a task to activate automatically. Do not delete projects to resolve connector-session errors.
- Founder facts approved previously: a brother based in India serving full-time in Jehovah’s organisation. The attachment’s spreadsheet biography is unverified and must not be used.
- Public support contact currently verified; centralize it without changing to an unconfigured domain mailbox.
- Existing privacy/terms drafts need owner changes and approval before publication. Thirty-day deletion, 72-hour incident targets and sixty-day post-expiry export are draft commitments until implemented and approved.
- Repository privacy can affect free GitHub Pages. Record owner action; do not change visibility or hosting implicitly.
- OAuth secret rotation, DNS/provider keys, paid plans, legal/accountant review and merchant KYC are owner-only gates.
- Production E2EE remains inactive. Neither UI changes nor encrypted backup exports establish E2EE.

## Resume instructions

1. Read this file and `git status` in both workspaces.
2. Inspect the latest local commits and tests listed below. Do not overwrite changes or re-clone/restart without checking.
3. Continue the first unfinished implementation package. Keep owner-dependent activation pending while preparing independent work.
4. Update the current action, test results and commit IDs after each package. Never call a pending gate complete.

Current action: WP2 original PDF exports. WP1 npm test passed 61 functional checks plus cloud/conflict/recovery/encryption checks; new privacy regression passed. Historical exposure is not erased by current-source cleanup.
Release state: not deployed; main untouched for this work-package release.
