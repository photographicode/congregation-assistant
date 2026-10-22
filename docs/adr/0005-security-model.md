# 0005 — Database-enforced tenant and role boundaries

Status: accepted target; production hardening incomplete.

Client role checks improve navigation but do not authorize data access. The database must enforce tenant and role boundaries for every table and RPC. Default-deny grants, enabled/forced RLS and a reviewed function-to-role manifest are the intended controls. Anonymous links require bounded input, rate limiting and uniform failure responses.

Do not apply blanket revocations or table moves directly to production. First inventory live metadata, verify an encrypted snapshot by restoring it, and test every additive migration twice in an isolated database with its down path. Test anonymous, role-specific and cross-tenant denial with real isolated database identities rather than string-matching SQL alone.

Supply-chain checks use pinned Actions, read-only workflow defaults, Gitleaks, Semgrep, CodeQL, audit/OSV, a production SBOM and a licence policy. Exact reviewed false-positive fingerprints do not waive future findings. Unfixed vulnerabilities remain release blockers.

Evidence: scripts/check-rls.sql, scripts/audit-database-security.sql, .github/workflows/security.yml and docs/engineering/THREAT-MODEL.md. The role matrix, grants rollout and forced-RLS remediation are not complete.
