# V2 audit

The master README's audit is an input, not independently verified evidence for this checkout. Source inspection confirms the legacy monolith, CDN scripts, emoji/glyph UI, theme sprawl and existing inline handlers. V2 source uses React escaping and local imported dependencies; legacy paths remain and must be audited before the complete release.

Fixed: publisher Close is labelled and at least 44px; generic legacy roots receive dialog metadata/close controls; inner modal-like IDs renamed; plain form labels; PDF asset install precache removed; service-worker activation requires explicit approval; offline shell and build-hash packaging; manifest metadata; managed group normalization and server-safe household prompt; sanitized weekend public projection excludes notes/contacts; new token hashed and reads rate-limited.

SQL verification found two PL/pgSQL variable/column naming ambiguities. Corrective migrations applied and full synthetic rollback contracts passed afterwards. The database retained 116 publishers/4 congregations; no real user records were deleted.

Important unresolved items: full Private protocol/data inventory and sentinel suite, all legacy XSS/inline-handler/CSP conversion, all anonymous endpoint throttles, all emoji replacements, complete theme/text scale migration, script-aware shaped custom PDFs, safe maskable icons/manifest screenshots, full browser/Lighthouse performance/accessibility evidence. None are disguised as a missing credential.

Advisors: intentional deny-all private tables have RLS enabled without direct policies; wrappers have explicit execute grants and role checks. Review [anonymous SECURITY DEFINER guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [authenticated wrapper guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Existing [leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) is disabled and needs owner/account policy review.

`npm audit --omit=dev` initially reported zero vulnerabilities. Full audit and CI status are recorded separately; no measured Lighthouse score is invented.
