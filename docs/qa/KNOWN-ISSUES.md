# V3 known issues

- The unmodified owner CSS fails text directly on Lagoon Glass/Aurora raw gradient canvases in 22 strict contrast combinations. Text-bearing application regions have panel backing. The raw-gradient contrast release gate stays blocked; colors and thresholds were not modified.
- Full V3 work packages remain tracked in V3-PROGRESS.md; a native baseline or demo does not establish full parity.
- Supabase appearance validation retains existing identity, grants, revision and scope guards. Existing platform advisor categories include intentional private-table deny-all policy notices and callable wrapper notices, plus leaked-password protection. No new public table/access grant was introduced. See [function privilege guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Supabase changelog fetch returned HTTP 403; current function/security documentation was verified with the connected documentation search.
