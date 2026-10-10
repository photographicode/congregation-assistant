# Google sign-in: simple setup

Owner / SuperAdmin: **sender@example.com**. This is not a congregation account. SuperAdmin uses the same **Continue with Google** button as congregation users. The server approves the owner separately from congregation roles. No owner password setup is required.

## 1. Owner sign-in: Google only

Open the software and choose **Continue with Google**, then select `sender@example.com`. The main software button routes to the secure staging backend. Google creates the Auth account on first successful sign-in; no separate password account or owner form is needed. The server checks active owner approval before showing SuperAdmin. This email is not assigned as a congregation administrator. The old owner-password endpoint is retired.

## 2. One-time Google setup, by you

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with sender@example.com. Create or select a project named **Congregation Assistant**.
2. Open **Google Auth Platform** (or APIs & Services → OAuth consent screen). Choose Get started if needed. Set the app name to Congregation Assistant, support/contact email to your new email, and Audience to **External** so approved Gmail users from different congregations can sign in.
3. For the pilot, keep the app in **Testing** and add each participating Google email under Audience → Test users. Being a Google test user does not grant congregation access; the software administrator must also approve their role.
4. Open **Clients** (or Credentials) → Create OAuth client → **Web application**. Name it Congregation Assistant Web.
5. Add this **Authorized JavaScript origin** (no path):

   `https://photographicode.github.io`

6. Add this exact **Authorized redirect URI**:

   `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`

7. Create the client. Keep its Client ID and Client secret private. Replace any client secret shared in chat; enter the replacement only in the provider dashboard. In [Supabase](https://supabase.com/dashboard/project/ejosykrxjvwrhxfnputo/auth/providers), select the secure project → Authentication → Sign In / Providers → Google. Enable Google, paste the Client ID and Client secret, and Save. Paste the secret only in Supabase, not in this chat or software source.
8. Open Authentication → URL Configuration. For this secure pilot, set **Site URL** to:

   `https://photographicode.github.io/congregation-assistant/staging/`

   Add these exact Redirect URLs:

   - `https://photographicode.github.io/congregation-assistant/staging/`
   - `https://photographicode.github.io/congregation-assistant/staging/index.html`

9. Use [the secure pilot software](https://photographicode.github.io/congregation-assistant/staging/) for Google role-account testing. The main software URL still connects existing legacy congregations to their existing backend; enabling Google on the secure project does not migrate their records. Move ordinary Google users to the main URL only after the backend/data migration is reviewed and its exact URLs are added to URL Configuration.
10. After the pilot, use Audience → Publish app/Production when ready for general approved users. Follow any Google verification requirements shown in your console. In Testing, every participating email must remain on Google's test-user list.

## 3. Create a congregation and its main admin

1. You choose Continue with Google and select the approved SuperAdmin email.
2. Choose Add congregation. Set its unique **congregation ID**, congregation name, and the **Main Admin / Secretary’s Google email**.
3. Save and check confirmation. The secure backend creates the congregation and its admin grant together. Do not assign your SuperAdmin email as a congregation admin.
4. That person opens the secure pilot URL → Continue with Google → chooses that exact approved account.
5. A congregation ID identifies the workspace. It is not an additional Google username or proof of permission. Access follows the approved Google account and its active grant.

## 4. Main admin assigns section access

1. Main admin opens **Access & Roles**.
2. Enter a person's Google email and choose **Field Service**, **OCLM overseer**, **Attendance overseer**, or **Group overseer**. For Group overseer, enter the exact assigned group name.
3. Optionally tick **Assistant** for a section. Assistants have the same tools within that section; they cannot manage account access. Do not select Main admin for a section assistant.
4. Choose Add and check confirmation. To give Service + OCLM, add the **same email twice**, once for each role. Add Attendance as a third role if needed. One Google login opens all explicitly assigned sections.
5. Additional assistants get their own approved Google accounts and section grants. Avoid everyone sharing one Google password.
6. To change duties, remove the old grant and add the new one. Users sign out and back in to refresh the visible workspace. The secure backend checks active grants on data operations.

OCLM drafts and Additional Duties definitions remain on the device for that congregation. Overseer and assistant should coordinate who edits and publishes; publication is not a shared editable draft.

## 5. Test before using real records

- One approved Service + OCLM user sees both sections and cannot read Attendance or manage Access & Roles.
- An OCLM assistant sees scheduling only; an Attendance assistant sees attendance only.
- A Group overseer sees only their assigned group, not other groups or congregations.
- A user not approved in the software stays out, even if Google sign-in succeeds.
- Removing a grant blocks that section’s private reads/writes. Sign out actually returns to login.

If Google says access denied while in Testing, add the exact email to Google's Test users. If redirect_uri_mismatch appears, check the Google callback URI in step 6. If Google sign-in succeeds but software access is denied, check Access & Roles, the exact email, and active congregation status.

5 October verification: Google is enabled, and a live public-metadata check confirms that the authorization redirect uses the intended Client ID and Supabase callback. The user supplied matching Google Cloud origin/callback screenshots. An actual approved Google account login, test-user approval and two-congregation isolation with real sessions still require testing. Owner sign-in now uses Google; creating a separate password account is no longer required. Do not treat provider readiness as completed OAuth acceptance.
