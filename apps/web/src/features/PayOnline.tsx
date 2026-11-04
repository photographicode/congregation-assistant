import React from "react";
import { Button } from "../../../../packages/ui/components";
import { config, invokeFunction } from "./client";
import type { Context } from "../context";

// Razorpay Payment Links: the server creates the payment page and its amount; the person pays on Razorpay's
// own site and is sent back here with a signed result, which the server checks. No Razorpay script runs here.
const RETURN_KEYS = ["razorpay_payment_id", "razorpay_payment_link_id", "razorpay_payment_link_reference_id", "razorpay_payment_link_status", "razorpay_signature"] as const;
const razorpayPage = (value: string) => {
  try {
    const host = new URL(value).hostname;
    return value.startsWith("https://") && (host === "rzp.io" || host.endsWith(".razorpay.com"));
  } catch {
    return false;
  }
};
function takeReturn(): Record<string, string> | null {
  const params = new URLSearchParams(location.search);
  if (!params.has("razorpay_payment_link_id")) return null;
  const result = Object.fromEntries(RETURN_KEYS.map((key) => [key, params.get(key) || ""]));
  for (const key of RETURN_KEYS) params.delete(key);
  // Keep the screen but drop the payment details, so a reload or a shared address does not resend them.
  const rest = params.toString();
  history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
  return result;
}

export function PayOnline({ context: c }: { context: Context }) {
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [paid, setPaid] = React.useState(false);
  const enabled = config.paymentsEnabled && c.roles.includes("admin");
  React.useEffect(() => {
    const result = enabled ? takeReturn() : null;
    if (!result) return;
    setBusy(true);
    invokeFunction("razorpay-verify", result)
      .then(() => setPaid(true))
      .catch((failure: Error) => setError(failure.message))
      .finally(() => setBusy(false));
  }, [enabled]);
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const { url } = await invokeFunction<{ url: string }>("razorpay-link", { cong_id: c.cong });
      if (!razorpayPage(url)) throw Error("Razorpay did not return a payment page. Try again.");
      location.assign(url);
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  }
  // Off until the owner finishes Razorpay setup; only the main administrator pays.
  if (!enabled) return null;
  if (paid)
    return (
      <div className="stack" role="status">
        <p>{"Payment received. Thank you. Your workspace is open for the year."}</p>
        <Button className="primary" onClick={() => location.reload()} type="button">{"Continue"}</Button>
      </div>
    );
  return (
    <div className="stack">
      <Button className="primary" disabled={busy} onClick={() => void pay()} type="button">
        {busy ? "Please wait…" : "Pay online"}
      </Button>
      <p className="muted">{"You pay on Razorpay’s page by UPI, card or net banking, then come back here. Razorpay emails a receipt."}</p>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
