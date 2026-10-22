# Threat model

Assets include congregation membership/religious-affiliation records, contact and emergency data, minors' records, ministry reports, schedules, access tokens, backups and billing metadata. Actor boundaries include anonymous link users, publishers/households, group overseers, individual duty overseers, congregation admins, service operators and another tenant.

| Entry point | Abuse case | Required controls and evidence |
|---|---|---|
| OAuth/session | stolen or stale access | provider configuration, short sessions, rotation, revocation tests; OWNER dashboard verification remains |
| RPC/record IDs | cross-tenant or cross-role access | RLS, explicit function grants, input validation, generated role/IDOR matrix |
| Public links/forms | enumeration, replay, burst submissions | hashed tokens, expiry/rotation/revocation, uniform errors, tested rate limits and payload caps |
| Assistant | ambiguous or over-privileged write | local bounded parser, registry permissions, preview/Confirm, same server APIs, typed destructive confirmation |
| Import/export/PDF | injection, malicious size/shape, data omission | Zod/size caps, formula neutralization, escaping, property tests and source-retention/golden checks |
| Browser/storage | XSS, blocked storage, stale worker | strict CSP, no third-party script, scoped worker, explicit updates, safe fallbacks and recovery tests |
| Build/dependencies | compromised action/package | immutable action commits, lockfile, ignored install scripts, scanners, SBOM and licence policy |
| Billing/webhooks | forged, duplicate or replayed events | signature verification, idempotency/reconciliation; integrations stay gated pending credentials/tests |
| Diagnostics/backup | unintended personal-data disclosure | memory-only sanitized diagnostics, opt-in exports, encrypted backups and tested restore |

This is an engineering threat model, not an independent penetration-test certificate. Gaps remain in OPEN and CHECKLISTS until runtime evidence closes them. The proprietary root LICENSE is preserved; first-party workspace components are distinguished from third-party licence grants.
