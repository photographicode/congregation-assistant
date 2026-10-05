# Google sign-in: simple setup

Owner / SuperAdmin: **congregationassistant0@gmail.com**. This is not a congregation account. SuperAdmin uses the ordinary software login: username **superadmin** and the owner password. Google is required only for congregation role accounts. The new owner email is approved, but its Supabase Auth password account does not yet exist.

## 1. Activate the owner password privately, if needed

Sign in to Supabase with the dashboard account that already owns or manages the secure project. Your new software SuperAdmin email does not automatically grant Supabase dashboard access. In that project, open Authentication → Users → Add user/Create new user. Enter `congregationassistant0@gmail.com`, choose the intended strong password privately, and enable Auto confirm user/email confirmation for this owner you control. Do not put the password in chat or a repository. The owner email already has server approval. Open the normal software login and sign in as `superadmin` with that password. Test sign-out and a fresh sign-in. This does not require enabling Google.

## 2. One-time Google setup, by you

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with congregationassistant0@gmail.com. Create or select a project named **Congregation Assistant**.
2. Open **Google Auth Platform** (or APIs & Services → OAuth consent screen). Choose Get started if needed. Set the app name to Congregation Assistant, support/contact email to your new email, and Audience to **External** so approved Gmail users from different congregations can sign in.
3. For the pilot, keep the app in **Testing** and add each participating Google email under Audience → Test users. Being a Google test user does not grant congregation access; the software administrator must also approve their role.
4. Open **Clients** (or Credentials) → Create OAuth client → **Web application**. Name it Congregation Assistant Web.
5. Add this **Authorized JavaScript origin** (no path):

   `https://photographicode.github.io`

6. Add this exact **Authorized redirect URI**:

   `https://ejosykrxjvwrhxfnputo.supabase.co/auth/v1/callback`

7. Create the client. Keep its Client ID and Client secret private. In [Supabase](https://supabase.com/dashboard/project/ejosykrxjvwrhxfnputo/auth/providers), select the secure project → Authentication → Sign In / Providers → Google. Enable Google, paste the Client ID and Client secret, and Save. Paste the secret only in Supabase, not in this chat or software source.
8. Open Authentication → URL Configuration. For this secure pilot, set **Site URL** to:

   `https://photographicode.github.io/congregation-assistant/staging/`

   Add these exact Redirect URLs:

   - `https://photographicode.github.io/congregation-assistant/staging/`
   - `https://photographicode.github.io/congregation-assistant/staging/index.html`

9. Use [the secure pilot software](https://photographicode.github.io/congregation-assistant/staging/) for Google role-account testing. The main software URL still connects existing legacy congregations to their existing backend; enabling Google on the secure project does not migrate their records. Move ordinary Google users to the main URL only after the backend/data migration is reviewed and its exact URLs are added to URL Configuration.
10. After the pilot, use Audience → Publish app/Production when ready for general approved users. Follow any Google verification requirements shown in your console. In Testing, every participating email must remain on Google's test-user list.

## 3. Create a congregation and its main admin

1. You sign in as SuperAdmin through the normal password form.
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

Current provider activation still requires your Google Client ID/secret in the Supabase dashboard. Database and synthetic browser checks do not establish that real Google sign-in works.
