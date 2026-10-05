# Owner sign-in through the main login

Use the normal software login form with username `superadmin` and the owner account password. There is no separate public owner form and Google is not needed for this account.

The main login calls the server-only owner-password-session function. It verifies the password through Supabase Auth and requires active owner approval. Owner sessions use the new backend on the same software URL; legacy congregation records have not been migrated.

For a fresh owner, the initial password digest is configured privately in ca_private.owner_bootstrap. Only the service-role function can verify it. The first successful login creates the confirmed owner through the Auth admin API and consumes the bootstrap digest. It never resets an existing owner's password. No password, digest, or service-role key is published in the software.

Password activation is pending clarification of the trailing dots in the supplied credential. Configure the exact initial password only after that answer. Verify actual sign-in, denied credentials, reload, sign-out, and disabled owner behavior.

Approved congregation identities use server-loaded roles. Main admin / Secretary has all congregation sections; field service has publishers/groups/reports; attendance has attendance; OCLM has only scheduling. Help, appearance and sign-out remain available. Multiple deliberately assigned roles combine. The new backend enforces role permissions and tenant isolation; the legacy backend still needs its authorization audit.

Owner identity: congregationassistant0@gmail.com. This is the SuperAdmin account only and must not be granted a congregation admin role automatically. Existing owner email approval is retired when replacing the owner. The username alias remains superadmin; no Google login is required for this password account.
