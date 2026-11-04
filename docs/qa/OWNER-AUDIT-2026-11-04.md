# Superadmin (Command centre) audit — 4 Nov 2026

Reviewed on `?demo=owner` at phone (390 px) and desktop widths, and against `apps/web/src/features/OwnerConsole.tsx`. Real owner data was not visible: that needs the owner's own Google sign-in.

## Fixed in this change

| Issue | Before | Now |
| --- | --- | --- |
| No overview | The page opened on a request list; you had to count rows to know how many congregations exist | Four tiles: Total, Active, On trial (with "N end this week"), Paused. Tapping a tile filters the list |
| Raw status | Rows read `fictional-park · trial · admin@…` | A coloured Trial / Active / Paused chip next to the name |
| No dates | Nothing showed when a congregation joined or when its trial ends | "Joined 4 Nov 2026 · Trial ends in 30 days · Paid 2026-10-10" |
| No filter | Search only | Search plus All / Active / Trial / Paused buttons |
| Hidden status choice | Status was a dropdown inside a collapsed section | Three buttons |
| Random IDs | New congregations got a UUID as their permanent ID; request approval started with an empty ID that had to be typed | The ID is filled in from the name (`River Park` → `river-park`) and can still be edited |
| Grammar | "1 workspace requests" | "1 workspace request" |
| Mail numbers | "0 queued · 0 failed · 0 sent in the / last seven days" broke across lines | "0 sent · 0 queued · 0 failed in the last seven days" |
| Cards touching | The request/mail cards sat flush against the Congregations card | Normal spacing between all sections |

## Still open

1. **No way to delete a test congregation.** There is no server function to erase a workspace (`wipe_requested_at` is read but never used). Removing test accounts needs a reviewed database function with a backup first, or a manual delete in the Supabase dashboard.
2. **Owner sees a congregation name in the header** ("River Park Congregation · Owner") in demo. Real owners without a congregation see "Owner account".
3. **No payment records.** Only a single `payment_date` per congregation exists. There is no amount, plan, invoice or Razorpay reference. See Payments below.
4. **No activity view.** Last sign-in, publisher count and last report month per congregation would show which ones are really used.
5. **Feature switches are invisible.** `feature_attendance`, `feature_emergency_contacts` and `feature_oclm` are loaded but cannot be seen or changed here.
6. **Request review shows no message or date.** The owner cannot see when a request arrived or anything the requester wrote.
7. **`scripts/check-owner-browser.cjs` is stale.** It looks for a "Manage accounts" button that does not exist and is not run in CI.

## Payments (Razorpay)

Nothing is connected yet. `pricing.json` names Razorpay as the provider, but there is no Razorpay code, no keys and no webhook. The owner checklist (docs/REQUIREMENTS.md) requires key secrets in the server secret store and a verified webhook, and never charging from the browser.

A payments dashboard needs, in order:

1. In Razorpay: KYC done and the account activated. Create API keys (test first) and a webhook secret.
2. In Supabase → Edge Functions → Secrets: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. These never go in the repository or chat.
3. A `payments` table (congregation, amount, currency, plan, Razorpay payment/order ID, status, paid at) — an additive migration with a down script.
4. A `razorpay-webhook` edge function that verifies the signature and records `payment.captured` / `payment.failed` / `refund.processed`.
5. A Payments section in the Command centre: this month's revenue, payments list, failed payments, and which congregations are paid up or overdue.

Until then the payment date field is the only record.
