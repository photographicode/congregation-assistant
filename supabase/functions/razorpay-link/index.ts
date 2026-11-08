import { acceptsOrigin, corsHeaders } from "../_shared/origins.ts";
import { linkIdPattern } from "../_shared/razorpay.ts";
/* Creates a Razorpay Payment Link for the signed-in main administrator. The amount comes from the database
   and the key secret never leaves this function. The browser only receives Razorpay's page address. */
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const LINK_LIFETIME_SECONDS = 24 * 60 * 60;
const razorpayPage = (value: string) => {
  try {
    const page = new URL(value);
    return page.protocol === "https:" && (page.hostname === "rzp.io" || page.hostname.endsWith(".razorpay.com"));
  } catch {
    return false;
  }
};
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (!acceptsOrigin(origin)) return new Response("Origin not allowed", { status: 403 });
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers });
  const keyId = Deno.env.get("RAZORPAY_KEY_ID"), keySecret = Deno.env.get("RAZORPAY_KEY_SECRET"),
    url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    returnUrl = Deno.env.get("CA_PAYMENT_RETURN_URL") || "https://congregationassistant.com/app/?screen=access";
  if (!keyId || !keySecret || !url || !anon || !service)
    return Response.json({ error: "Online payment is not set up yet." }, { status: 503, headers });
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return Response.json({ error: "Sign in first." }, { status: 401, headers });
  let cong = "";
  try { cong = String((await req.json())?.cong_id ?? ""); } catch { /* an unreadable body is refused below */ }
  if (cong.length < 1 || cong.length > 100) return Response.json({ error: "Choose a congregation." }, { status: 400, headers });

  const user = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: begin, error } = await user.rpc("ca_payment_begin", { p_cong_id: cong });
  if (error) {
    // Fixed wording: database error text never reaches the browser.
    if (error.code === "42501") return Response.json({ error: "Only the main administrator can pay for the congregation." }, { status: 403, headers });
    if (error.code === "PT429") return Response.json({ error: "Too many attempts. Wait an hour and try again." }, { status: 429, headers });
    return Response.json({ error: "The payment could not start. Try again." }, { status: 400, headers });
  }
  if (!begin?.email) return Response.json({ error: "Your account has no email address. Sign in again with Google." }, { status: 400, headers });

  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(keyId + ":" + keySecret), "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: begin.amount_paise,
      currency: begin.currency,
      accept_partial: false,
      reference_id: "ca" + crypto.randomUUID().replaceAll("-", ""),
      description: ("Congregation Assistant · one year · " + begin.name).slice(0, 2048),
      customer: { email: begin.email },
      notify: { email: true, sms: false },
      reminder_enable: false,
      notes: { cong_id: begin.cong_id },
      callback_url: returnUrl,
      callback_method: "get",
      expire_by: Math.floor(Date.now() / 1000) + LINK_LIFETIME_SECONDS,
    }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const link = response?.ok ? await response.json().catch(() => null) : null;
  if (!link || !linkIdPattern.test(link.id) || link.amount !== begin.amount_paise || !razorpayPage(String(link.short_url)))
    return Response.json({ error: "Razorpay did not create the payment page. Try again in a minute." }, { status: 502, headers });

  const db = createClient(url, service, { auth: { persistSession: false } });
  const { error: saveError } = await db.rpc("ca_payment_link_created", { p_cong_id: begin.cong_id, p_link_id: link.id, p_amount_paise: link.amount, p_email: begin.email });
  if (saveError) {
    // An unrecorded link could still be paid from Razorpay's email, so cancel it.
    const cancelled = await fetch("https://api.razorpay.com/v1/payment_links/" + link.id + "/cancel", {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(keyId + ":" + keySecret) },
      signal: AbortSignal.timeout(15000),
    }).then((r) => r.ok).catch(() => false);
    if (!cancelled) console.error("Unrecorded Razorpay link could not be cancelled", link.id);
    return Response.json({ error: "The payment could not be saved. Try again." }, { status: 503, headers });
  }
  return Response.json({ url: link.short_url }, { headers });
});
