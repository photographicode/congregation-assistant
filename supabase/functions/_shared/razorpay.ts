// Razorpay signature checks (https://razorpay.com/docs/payments/payment-links/apis/#verify-signature).
// Pure Web Crypto so the same code runs in Deno edge functions and in Node tests.
const encoder = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
  return Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Constant-time comparison, so a wrong signature takes as long to reject as a nearly right one.
export function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export type LinkReturn = { linkId: string; referenceId: string; status: string; paymentId: string; signature: string };

/** Return page: Razorpay signs "link_id|reference_id|status|payment_id" with the key secret. */
export async function verifyPaymentLinkSignature(keySecret: string, r: LinkReturn): Promise<boolean> {
  if (!keySecret || !r.linkId || !r.referenceId || !r.status || !r.paymentId || !r.signature) return false;
  return sameText(await hmacHex(keySecret, [r.linkId, r.referenceId, r.status, r.paymentId].join("|")), r.signature);
}

/** Webhook: Razorpay signs the raw request body with the webhook secret. */
export async function verifyWebhookSignature(webhookSecret: string, rawBody: string, signature: string | null): Promise<boolean> {
  if (!webhookSecret || !signature) return false;
  return sameText(await hmacHex(webhookSecret, rawBody), signature);
}

export const linkIdPattern = /^plink_[A-Za-z0-9]{6,40}$/;
export const paymentIdPattern = /^pay_[A-Za-z0-9]{6,40}$/;
