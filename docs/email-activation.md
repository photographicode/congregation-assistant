# Activate transactional email — private setup

The request/outbox/reminder code is prepared, but messages are not yet delivered. Do not paste API keys into chat or commit them.

1. Register a free Brevo account. Use your business identity and contact details.
2. Verify the intended sender `sender@example.com` in Brevo using the verification email. The owner has approved preparing Brevo activation. A Gmail address cannot have custom domain DNS records changed by this app; follow Brevo’s current sender requirements and confirm that this sender is accepted before sending. If Brevo requires an owned domain, stop and present that concrete requirement rather than inventing or buying a domain.
3. Create a transactional API key in Brevo.
4. In Supabase → Edge Functions → Secrets, privately add `BREVO_API_KEY` and `CA_MAIL_SENDER` (the verified sender address). The function uses Supabase's server-provided URL/service-role environment variables; no browser service key is needed.
5. Schedule `transactional-mail` every 15 minutes using Supabase Cron/Edge invocation. POST to its project function URL. It requires `Authorization: Bearer <server service-role JWT>`; store that credential in Supabase Vault and use a server-side invocation. Never put it in website JavaScript, screenshots, source or chat. If using the newer secret-key invocation model, adapt/verify the worker authentication first; this deployment explicitly checks the service-role JWT.
6. Sign in as a main administrator, open My reminders, and save congregation email preferences using a main-admin email that has already signed in with Google. Select publication notices, monthly reports, OCLM planning day/time/timezone, and attendance/form reminder times. Attendance emails follow the configured meeting calendar and skip Circuit Assembly/Regional Convention days.
7. Send a test to your own approved address. Check Brevo's delivery event, inbox and spam folder, and the stored delivery receipt. Test a rejected provider response/retry before public launch.
8. Monitor failed jobs and provider quota. Remove the pilot 'delivery being prepared' wording only after end-to-end delivery is verified. Set up a private operator view/alert for failed jobs; no automatic failed-job alert is currently configured.

Request emails contain a reference and next steps; welcome messages contain the workspace URL and guide. Reminder emails never contain publisher reports, contact information or bearer form links. Delivery is at-least-once during uncertain provider failures; repeated request clicks and normal retries are deduplicated by the private queue.

The website's alternative email form still prepares a draft in the visitor's email app; it does not silently submit to a third party. The new Google route saves a request directly on the server.
