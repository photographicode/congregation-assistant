# Domain and email activation — owner-only setup

Status recorded 10 October 2026: congregationassistant.com, Titan email and domain protection purchased. Owner confirms nothing configured. Purchase does not establish DNS, a mailbox, sender verification or OAuth configuration.

## Preserve the working service

Keep both existing GitHub Pages URLs and the configured public support contact unchanged. Do not publish a nonexistent domain mailbox. Do not migrate hosting, delete projects, activate paid plans or replace live authentication settings as part of documentation preparation.

## Safe activation order

1. Enable registrar account two-factor authentication and verify recovery arrangements. Keep domain protection enabled. Never put recovery codes or provider credentials in chat, source control or screenshots.
2. Choose and create the public Titan support mailbox in the provider dashboard. Test receiving an external message, replying, and reading that reply from the external account. Purchase alone is not mailbox readiness.
3. Obtain the exact MX, SPF and DKIM records from the purchased Titan account. Check for an existing SPF record before changing it: a domain must not have competing SPF TXT records. Do not guess provider record values.
4. Configure DMARC using the provider's current guidance and a monitored reporting address. Review authentication results before moving to a policy that rejects mail. Registrar domain protection is separate from mail authentication.
5. Review the existing hosting plan before setting website DNS. Proposed addresses are www.congregationassistant.com for the website and app.congregationassistant.com for the app; these are not live or verified. Check current GitHub Pages instructions and domain-verification requirements, TLS issuance, repository privacy and free-plan restrictions before selecting exact records. No hosting switch is authorized by buying a domain.
6. Prepare the precise HTTPS sign-in destinations and Supabase callback configuration. Add and test the new allowed redirect without removing the working old destination. Rotate the Google OAuth client secret in its secure provider settings, update the secure Supabase configuration, then verify sign-in, role selection, denial and sign-out. Do not copy the secret into a document or repository.
7. Configure the existing Brevo sender only after the mailbox/domain works. Store its key privately in Supabase settings. Test real delivery and failure handling with an owner-controlled test address before enabling queued welcome emails. Titan hosting is not itself the existing application's automated sender integration.
8. Verify app and website HTTPS, email authentication, browser installation, callback destinations and existing links. Only then switch public URLs/contact. Preserve old links and an appropriate transition for at least six months; do not break links containing private tokens or log their values.

## Evidence required before marking ready

- Mailbox created; external receive/reply test passed.
- Actual DNS records verified; mail authentication results checked.
- HTTPS certificate and both public destinations verified.
- Google secret rotation and secure configuration confirmed; approved/denied sign-in tested.
- Old links continue working; no credentials or private tokens exposed by redirects.
- Brevo delivery verified separately; push configuration and real delivery verified separately.

No configuration or delivery is claimed by this checklist. Exact DNS values remain provider/dashboard-dependent and must be reviewed before application.
