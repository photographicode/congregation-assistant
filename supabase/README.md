# Authorization audit

`audit-access.sql` is a read-only metadata audit for the existing Supabase project. Run it in the project's SQL editor, or with an already configured administrative PostgreSQL connection:

```sh
psql "$CA_AUDIT_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/audit-access.sql
```

Keep connection credentials in a secret binding rather than source control. The script lists table existence, RLS flags, policy predicates, grants, legacy password-column names, and scheduler RPC definitions. It reads no publisher records or stored password values and finishes with a rollback. Policy and function definitions may reveal implementation details; review the output before sharing it.

The report alone cannot prove tenant isolation. In an isolated test project, provision two congregations and authenticated identities for admin, field service, attendance, and scheduler roles. Verify the following with each identity's actual JWT, plus the anonymous client:

| Identity | Expected acceptance checks |
| --- | --- |
| Anonymous | Cannot list congregations, password columns, publisher addresses, emergency details, private reports, or attendance history. Public submissions use an explicit narrowly scoped server contract. |
| Congregation A admin | May perform authorized A operations; cannot select, insert, update, or delete B records, including by changing `cong_id` or a publisher/household foreign key. |
| Field service | Has intended A publisher/report access; cannot administer accounts or acquire other feature permissions. |
| Attendance | Has intended A attendance access; cannot acquire publisher/emergency/account permissions. |
| Scheduler | Has intended A scheduler access; cannot acquire unrelated feature permissions. |
| Disabled member | Cannot regain access by changing browser session storage or calling tables/RPCs directly. |

Test both visible read results and write outcomes. A policy can return an empty result without an error; a blocked write must also leave rows unchanged. Check UPDATE's old-row and new-row predicates, foreign-key tenant consistency, and SECURITY DEFINER function authorization. Use synthetic records and clean them up only in the isolated test project.

The repository's password-filter logins and embedded master credential still need replacement with authenticated, server-enforced authorization. Do not apply a generic policy migration against the live project: its schema, current policies, identity mappings, and public submission requirements have not been verified. A migration should follow this audit and use the actual server schema.
