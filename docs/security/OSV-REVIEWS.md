# Reviewed OSV advisory

Reviewed 24 October 2026. CI run 39913848072 supplied the scanner JSON: one advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), braces 3.0.3 stack exhaustion on deeply nested glob patterns. `npm view braces version` still returns 3.0.3; there is no fixed published release at review time.

`npm explain braces --json` traces development-only Tailwind/chokidar and micromatch tooling; the lockfile entry is dev-only. The production CycloneDX graph excludes braces and application source does not import it. This is a build-tool availability risk when consuming malicious patterns, not a reason to accept arbitrary build input. CI builds only trusted repository configuration and PR review remains required.

The single advisory has an explicit expiry of 15 January 2027 in `osv-scanner.toml` (under 90 days). `scripts/check-osv-reviews.mjs` fails on expiry, missing/overlong review, changed braces version or appearance in the production graph. OSV still scans all dependencies and fails any new unreviewed advisory. No blanket ignore and no production dependency exception. Upgrade or re-review before expiry; do not extend silently.
