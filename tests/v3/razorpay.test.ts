import { it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { hmacHex, sameText, verifyPaymentLinkSignature, verifyWebhookSignature, linkIdPattern, paymentIdPattern } from "../../supabase/functions/_shared/razorpay";
import { corsHeaders } from "../../supabase/functions/_shared/origins";

const secret = "test_secret_not_real";
const sign = (message: string) => createHmac("sha256", secret).update(message).digest("hex");
const ret = { linkId: "plink_ABC123", referenceId: "ca0123", status: "paid", paymentId: "pay_DEF456" };

it("computes the same HMAC as Node's crypto", async () => {
  expect(await hmacHex(secret, "a|b")).toBe(sign("a|b"));
});

it("accepts only Razorpay's return signature for that link, reference, status and payment", async () => {
  const good = sign("plink_ABC123|ca0123|paid|pay_DEF456");
  expect(await verifyPaymentLinkSignature(secret, { ...ret, signature: good })).toBe(true);
  expect(await verifyPaymentLinkSignature(secret, { ...ret, paymentId: "pay_OTHER1", signature: good })).toBe(false);
  expect(await verifyPaymentLinkSignature(secret, { ...ret, status: "created", signature: good })).toBe(false);
  expect(await verifyPaymentLinkSignature("wrong_secret", { ...ret, signature: good })).toBe(false);
  expect(await verifyPaymentLinkSignature(secret, { ...ret, signature: "" })).toBe(false);
  expect(await verifyPaymentLinkSignature("", { ...ret, signature: good })).toBe(false);
});

it("accepts only a webhook body signed with the webhook secret", async () => {
  const body = JSON.stringify({ event: "payment_link.paid" });
  expect(await verifyWebhookSignature(secret, body, sign(body))).toBe(true);
  expect(await verifyWebhookSignature(secret, body + " ", sign(body))).toBe(false);
  expect(await verifyWebhookSignature(secret, body, null)).toBe(false);
});

it("compares texts exactly", () => {
  expect(sameText("abc", "abc")).toBe(true);
  expect(sameText("abc", "abd")).toBe(false);
  expect(sameText("abc", "abcd")).toBe(false);
});

it("recognises Razorpay ids only", () => {
  expect(linkIdPattern.test("plink_ABC123")).toBe(true);
  expect(linkIdPattern.test("plink_ABC123'; drop")).toBe(false);
  expect(paymentIdPattern.test("pay_DEF456")).toBe(true);
  expect(paymentIdPattern.test("plink_DEF456")).toBe(false);
});

it("answers CORS only for accepted browser origins", () => {
  expect(corsHeaders("https://congregationassistant.com")["Access-Control-Allow-Origin"]).toBe("https://congregationassistant.com");
  expect(corsHeaders("https://evil.test")).toEqual({});
  expect(corsHeaders(null)).toEqual({});
});
