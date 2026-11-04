import { acceptsOrigin, corsHeaders } from "../_shared/origins.ts";
import { linkIdPattern, paymentIdPattern, verifyPaymentLinkSignature } from "../_shared/razorpay.ts";
/* Return page: Razorpay sends the person back with a signed result. This checks the signature, then opens
   the workspace. The webhook confirms the same payment independently, so a closed tab still works. */
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!acceptsOrigin(origin)) return new Response("Origin not allowed", { status: 403 });
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET"), url = Deno.env.get("SUPABASE_URL"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!keySecret || !url || !service) return Response.json({ error: "Online payment is not set up yet." }, { status: 503, headers });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* refused below */ }
  const r = {
    linkId: String(body.razorpay_payment_link_id ?? ""),
    referenceId: String(body.razorpay_payment_link_reference_id ?? ""),
    status: String(body.razorpay_payment_link_status ?? ""),
    paymentId: String(body.razorpay_payment_id ?? ""),
    signature: String(body.razorpay_signature ?? ""),
  };
  if (!linkIdPattern.test(r.linkId) || !paymentIdPattern.test(r.paymentId) || !(await verifyPaymentLinkSignature(keySecret, r)))
    return Response.json({ error: "The payment could not be confirmed here. If money left your account, it will be confirmed automatically or refunded by Razorpay." }, { status: 400, headers });
  if (r.status !== "paid") return Response.json({ error: "The payment was not completed. Nothing was charged." }, { status: 400, headers });
  const db = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await db.rpc("ca_payment_mark_paid", { p_link_id: r.linkId, p_payment_id: r.paymentId, p_amount_paise: null });
  if (error) return Response.json({ error: "Payment received, but the workspace could not be updated yet. It will update automatically." }, { status: 503, headers });
  return Response.json({ paid: true }, { headers });
});
