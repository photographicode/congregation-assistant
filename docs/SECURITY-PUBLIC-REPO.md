# Public repository safety review — 17 October 2026

Both owner repositories are public. Full reachable Git history and tracked/unignored working files are scanned without printing credential values. The scan recognizes privileged Supabase keys, service-role JWTs, OAuth client secrets, private keys, GitHub token formats and Razorpay secret assignments. Generic `service_role`, `RAZORPAY`, `client_secret` and `BEGIN` mentions in SQL/docs are not themselves credentials. Publishable Supabase keys and project URLs are intentionally public; database policies remain the security boundary.

The supplied S-140 DOCX is now in ignored `docs/private-reference/`. It has never been committed on this branch. The S-89 inline image is not saved in the repository. New meeting/slip layouts are independently drawn in code with fictional fixtures. Existing V1 PDF reference assets and their licensing status remain documented in the reference inventory; no new official scans are added.

Removed `archive/legacy-app-config.js`, the stale project configuration. Frozen historical commits remain unchanged, including `v1-final`. No history rewrite is authorized. `.gitignore` excludes environment files, PEM/key files, Supabase temporary state and private form/parser fixtures. Third-party components retain their own licenses; application code is All rights reserved.

Scan results are appended after the complete scan finishes. A format scan is not an assurance that all possible secrets have been detected.

Completed scan: 1,540 unique historical blobs in `congregation-assistant`, and 230 in the fully fetched `Congregation-Assistant_Public` history; working trees also scanned. No recognized credential formats or privileged JWTs found. No rotation finding to report. Historical generic markers are reviewed as documentation/SQL, not treated as secret values. Scan output contains file identifiers only and is kept in ignored work files.

Final pre-publication refresh fetched all branch refs and tags in both repositories: 1,825 source history blobs and 263 public-repository history blobs scanned, plus working files; no recognized credential findings. Production department metadata confirms the existing all-departments approval boundary is preserved. The rejected meeting migration is not applied.

Final artifact scan: 1,855 source history blobs and 415 public history blobs, including generated assets; no recognized credential findings. Automatic review later accepted the narrowed meeting migration after department replacements were removed. Production metadata confirms its four new helpers deny anon execution and preserve authenticated role checks and empty search_path.
