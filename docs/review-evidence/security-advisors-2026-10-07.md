# Supabase security advisory review — read-only, 7 October 2026

## Fresh live Supabase advisor read

This was read-only and contained no publisher records. Advisories report RLS-enabled private tables with no direct policies and exposed SECURITY DEFINER entry points. Deny-all private tables and deliberately public token-bound endpoints can be intentional. A linter warning alone neither proves an exploit nor verifies the guards. Review current definitions and grants for each entry point; do not blindly revoke needed reporting/attendance APIs or add permissive policies.

- [RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Anonymous callable SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated callable SECURITY DEFINER functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

- [Leaked-password protection is disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Confirm plan entitlement and password-based account exposure before proposing a change; no paid activation was authorized.

No complete security certification or entitlement change is claimed. No live access configuration was changed.

Counts: 8 RLS/no-policy informational findings, 8 anonymous callable privileged functions, 43 authenticated callable privileged functions, and 1 disabled leaked-password-protection warning. No advisory is treated as proof of complete security.
