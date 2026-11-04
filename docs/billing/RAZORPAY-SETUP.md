# Razorpay setup — owner steps

The code for online payment is in place and switched off. It turns on when `paymentsEnabled` is `true` in `public-config.json`. Do the steps below in order. Never paste a key secret or webhook secret into the repository, a chat, an issue or an email.

## 1. Activation form (KYC)

Razorpay asks for these in **Account & Settings → Activation**. Only you can supply them.

| Field | What to enter |
| --- | --- |
| Business type | Individual or Proprietorship (choose what matches your PAN) |
| Business category | Software / SaaS (Software as a Service) |
| Business description | Online administration software for congregations: monthly reports, meeting schedules, duties and attendance. Sold as one yearly subscription per congregation. |
| PAN, bank account, address proof | Your own documents |
| Website | `https://congregationassistant.com` |
| Expected price | ₹1,499 a year per congregation |

### Website pages Razorpay checks

| Requirement | URL | Status |
| --- | --- | --- |
| Pricing | https://congregationassistant.com/pricing/ | Live |
| Terms and conditions | https://congregationassistant.com/terms/ | Live |
| Privacy policy | https://congregationassistant.com/privacy/ | Live |
| Refund and cancellation policy | https://congregationassistant.com/refunds/ | Live. **You must decide the refund rule** (for example "full refund within 7 days of payment") and add it before submitting. |
| Shipping / delivery policy | https://congregationassistant.com/refunds/ (Delivery section) | Live after this release |
| Contact us | https://congregationassistant.com/contact/ | Razorpay usually wants a working email, a phone number and an address. Add them, then set `mailConfigured: true` once support@ receives mail. |

## 2. Dashboard settings after activation

1. **Settings → Payment capture:** turn on **automatic capture**. A payment that is only authorised does not open the workspace.
   Check that **Payment Links** is enabled on the account; the app uses it so no Razorpay script has to run inside the app.
2. **Settings → API keys:** generate a key. Use **Test mode** first, then repeat for **Live mode**.
3. **Settings → Webhooks → Add webhook:**
   - URL: `https://ejosykrxjvwrhxfnputo.supabase.co/functions/v1/razorpay-webhook`
   - Secret: a new random value (keep it for step 3)
   - Active events: `payment_link.paid`

## 3. Supabase

1. Back up the database.
2. Run `supabase/migrations/20261105090000_razorpay_payments.sql` in the SQL editor. It adds a payments table and the payment functions; the annual price (₹1,499 = 149900 paise) is set in `ca_private.annual_price_paise()`.
3. **Edge Functions → Secrets:** add
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`
4. Deploy the functions from a terminal signed in to Supabase:

   ```bash
   supabase functions deploy razorpay-link
   ```

   ```bash
   supabase functions deploy razorpay-verify
   ```

   ```bash
   supabase functions deploy razorpay-webhook --no-verify-jwt
   ```

   The webhook has no sign-in; it checks Razorpay's signature instead.

## 4. Test, then go live

1. With **test** keys, set `paymentsEnabled: true` on a branch build, sign in as a main administrator of a test congregation and open **Settings → Plan → Pay online**.
2. Pay with a Razorpay test card or test UPI ID. Check that:
   - the workspace shows as active;
   - `select * from ca_private.payments` in the SQL editor shows it as `paid`;
   - the webhook delivery in the Razorpay dashboard shows `200`.
3. Replace the three secrets with **live** values, set `paymentsEnabled: true` on main and deploy.
4. Make one real payment yourself, then refund it from the Razorpay dashboard.

## How it works

1. **Pay online** calls `razorpay-link`. It checks that the caller is the congregation's main administrator, takes the amount from the database and creates a Razorpay Payment Link that expires in 24 hours.
2. The browser goes to Razorpay's payment page. The app never sees card or UPI details and loads no Razorpay script.
3. Razorpay sends the person back to `/app/?screen=access` with a signed result. `razorpay-verify` checks the signature and marks the link paid. The congregation becomes **active** and `payment_date` is set.
4. `razorpay-webhook` receives the same payment from Razorpay's servers and records it again. It is safe to receive twice, and it still works if the person closes the tab right after paying.

## Not covered yet

- Access does not expire one year after payment; an active workspace stays active until you change it in the Command centre.
- Refunds are made in the Razorpay dashboard and do not change the workspace status automatically.
- No GST invoice is generated; Razorpay emails a payment receipt.
- The Command centre does not list payments yet. Run `select * from ca_private.payments order by created_at desc` in the SQL editor, or check the Razorpay dashboard.
