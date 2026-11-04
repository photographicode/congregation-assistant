import { linkIdPattern, paymentIdPattern, verifyWebhookSignature } from "../_shared/razorpay.ts";
/* Razorpay server-to-server events. Deploy with --no-verify-jwt: Razorpay signs the body instead.
   Only payment_link.paid changes anything; other events are acknowledged and ignored. */
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
type Entity = { id?: string; amount?: number; amount_paid?: number; currency?: string; status?: string };
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET"), url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || !url || !service) return new Response("Payments not configured", { status: 503 });
  const raw = await req.text();
  if (raw.length > 100_000 || !(await verifyWebhookSignature(secret, raw, req.headers.get("x-razorpay-signature"))))
    return new Response("Invalid signature", { status: 401 });
  let event: { event?: string; payload?: { payment_link?: { entity?: Entity }; payment?: { entity?: Entity } } };
  try { event = JSON.parse(raw); } catch { return new Response("Invalid body", { status: 400 }); }
  if (event.event !== "payment_link.paid") return Response.json({ ignored: true });
  const link = event.payload?.payment_link?.entity, payment = event.payload?.payment?.entity;
  if (!link || !payment || link.status !== "paid" || payment.status !== "captured" || payment.currency !== "INR" ||
    !linkIdPattern.test(link.id ?? "") || !paymentIdPattern.test(payment.id ?? "") || !Number.isInteger(payment.amount))
    return Response.json({ ignored: true });
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await db.rpc("ca_payment_mark_paid", { p_link_id: link.id, p_payment_id: payment.id, p_amount_paise: payment.amount });
  // A link this app did not create belongs to another integration on the same account: acknowledge it.
  if (error?.code === "P0002") return Response.json({ ignored: true });
  // Any other failure asks Razorpay to retry later.
  if (error) return new Response("Not recorded", { status: 500 });
  return Response.json({ recorded: true });
});
