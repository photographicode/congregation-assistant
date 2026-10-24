# Reviewed OSV advisory

Reviewed 24 October 2026. CI run 39913848072 supplied the scanner JSON: one advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), braces 3.0.3 stack exhaustion on deeply nested glob patterns. `npm view braces version` still returns 3.0.3; there is no fixed published release at review time.

`npm explain braces --json` traces development-only Tailwind/chokidar and micromatch tooling; the lockfile entry is dev-only. The production CycloneDX graph excludes braces and application source does not import it. This is a build-tool availability risk when consuming malicious patterns, not a reason to accept arbitrary build input. CI builds only trusted repository configuration and PR review remains required.

The single advisory has an explicit expiry of 15 January 2027 in `osv-scanner.toml` (under 90 days). `scripts/check-osv-reviews.mjs` fails on expiry, missing/overlong review, changed braces version or appearance in the production graph. OSV still scans all dependencies and fails any new unreviewed advisory. No blanket ignore and no production dependency exception. Upgrade or re-review before expiry; do not extend silently.

## Updated feed — 24 October 2026

Run 40006331896 reports the former braces ignore as unused and instead finds **production** Zod 4.1.12 advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), constrained-collection memory exhaustion, fixed in 4.6.6. The unused braces exception is removed. App and core pin Zod 4.6.7, the current published patch. No active ignores remain; new-head OSV must prove zero unreviewed advisories. This supersedes the earlier historical dev-only exception, rather than adding an ignore for a reachable production dependency.

2026-10-24 fresh feed: run 40093901436, artifact 12559478876 reports Undici 7.29.1 advisories GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472 and GHSA-xjj6-f33q-929c (fixed in 7.30.1). Dependency path is dev-only Wrangler 4.151.3 → Miniflare 5.20261019.1-beta → exact Undici pin. Apply a narrowly scoped Miniflare override to Undici 7.30.1 and update the lockfile; no advisory ignored. Fresh-head OSV must confirm the fix.
