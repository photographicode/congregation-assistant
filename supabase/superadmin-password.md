# SuperAdmin password sign-in

The secure staging workspace supports Supabase email/password authentication for active approved owners. Google is optional for SuperAdmin. Congregation role accounts continue using their existing Google contract.

1. Open https://supabase.com/dashboard/project/ejosykrxjvwrhxfnputo/auth/users .
2. Add an email/password user for photographicode@gmail.com, using a private password and an email-confirmed account. This email is already listed as an active owner in ca_superadmins. Do not put the password in source code or chat.
3. Open https://photographicode.github.io/congregation-assistant/staging/?superadmin=1 .
4. Expand SuperAdmin password sign-in and enter the owner email and password.
5. Verify the command centre opens, sign out, then verify reloading stays signed out. Test an incorrect password and an unapproved account.

This workspace uses the new backend. Existing legacy congregation records have not been migrated. The main app links here rather than creating a browser master-password bypass.

The backend verifies an active owner entry and, for email-provider sessions, an actual confirmed auth.users account matching auth.uid(). Live transaction tests verified approved, disabled, and unconfirmed password owners and rolled back fixtures. Actual password sign-in requires the owner account setup above.
