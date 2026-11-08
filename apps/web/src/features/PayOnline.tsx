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
// The signed result waits in this tab until the server confirms it, so a failed check can be retried.
const RETURN_STORE = "ca-payment-return";
function takeReturn(): Record<string, string> | null {
  const params = new URLSearchParams(location.search);
  if (params.has("razorpay_payment_link_id")) {
    const result = Object.fromEntries(RETURN_KEYS.map((key) => [key, params.get(key) || ""]));
    for (const key of RETURN_KEYS) params.delete(key);
    // Keep the screen but drop the payment details, so a shared address does not carry them.
    const rest = params.toString();
    history.replaceState(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    try { sessionStorage.setItem(RETURN_STORE, JSON.stringify(result)); } catch { /* still checked once below */ }
    return result;
  }
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(RETURN_STORE) || "null");
    return saved && typeof saved === "object" ? (saved as Record<string, string>) : null;
  } catch {
    return null;
  }
}
function forgetReturn() {
  try { sessionStorage.removeItem(RETURN_STORE); } catch { /* nothing stored */ }
}

export function PayOnline({ context: c }: { context: Context }) {
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [paid, setPaid] = React.useState(false),
    [pending, setPending] = React.useState<Record<string, string> | null>(null);
  const enabled = config.paymentsEnabled && c.roles.includes("admin");
  const confirm = React.useCallback((result: Record<string, string>) => {
    setBusy(true);
    setError("");
    invokeFunction("razorpay-verify", result)
      .then(() => {
        forgetReturn();
        setPending(null);
        setPaid(true);
      })
      .catch((failure: Error) => {
        setPending(result);
        setError(failure.message);
      })
      .finally(() => setBusy(false));
  }, []);
  React.useEffect(() => {
    const result = enabled ? takeReturn() : null;
    if (result) confirm(result);
  }, [enabled, confirm]);
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
      {pending && !busy && (
        <Button onClick={() => confirm(pending)} type="button">{"Check payment again"}</Button>
      )}
    </div>
  );
}
