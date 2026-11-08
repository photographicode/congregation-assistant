import React from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../../packages/ui/components";
import { rpc, demo } from "./client";

// Online payments recorded by the Razorpay functions. Razorpay's own dashboard stays the record for refunds.
const payment = z.object({
  id: z.string(),
  name: z.string(),
  payment_id: z.string().nullable(),
  amount_paise: z.number(),
  status: z.enum(["created", "paid"]),
  requested_by: z.string(),
  created_at: z.string(),
  paid_at: z.string().nullable(),
});
type Payment = z.infer<typeof payment>;
const sample: Payment[] = [
  { id: "p1", name: "River Park Congregation", payment_id: "pay_SAMPLE0001", amount_paise: 149900, status: "paid", requested_by: "admin@example.com", created_at: "2026-11-02T09:00:00Z", paid_at: "2026-11-02T09:03:00Z" },
  { id: "p2", name: "Hill View Congregation", payment_id: null, amount_paise: 149900, status: "created", requested_by: "secretary@example.com", created_at: "2026-11-05T15:20:00Z", paid_at: null },
];
const PAISE_PER_RUPEE = 100, SHOWN_PAYMENTS = 20;
const rupees = (paise: number) => "₹" + (paise / PAISE_PER_RUPEE).toLocaleString("en-IN");
const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const RAZORPAY_DASHBOARD = "https://dashboard.razorpay.com/app/payments";

export function OwnerPayments() {
  const query = useQuery({
    queryKey: ["owner", "payments"],
    queryFn: async () => (demo ? sample : z.array(payment).parse(await rpc("ca_owner_payments"))),
  });
  const rows = query.data || [];
  const paid = rows.filter((r) => r.status === "paid");
  const year = new Date().getFullYear();
  const thisYear = paid.filter((r) => new Date(r.paid_at || r.created_at).getFullYear() === year);
  const missingFunction = /PGRST202|could not find/i.test(query.error?.message || "");
  return (
    <section className="card stack" aria-labelledby="owner-payments-title">
      <h2 id="owner-payments-title">{"Payments"}</h2>
      <p>
        {`${rupees(thisYear.reduce((sum, r) => sum + r.amount_paise, 0))} collected in ${year} · ${paid.length} paid · ${rows.length - paid.length} waiting`}
      </p>
      <p>
        <a href={RAZORPAY_DASHBOARD} target="_blank" rel="noreferrer">{"Open the Razorpay dashboard"}</a>
        {" for refunds, settlements and receipts."}
      </p>
      {query.error && (
        <p role="alert">
          {missingFunction
            ? "Online payments appear here after the Razorpay database update is run."
            : "Payments could not load. "}
          {!missingFunction && (
            <Button onClick={() => void query.refetch()} type="button">{"Retry"}</Button>
          )}
        </p>
      )}
      {!query.error && rows.length === 0 && !query.isPending && <p>{"No online payments yet."}</p>}
      {rows.length > 0 && (
        <div className="list">
          {rows.slice(0, SHOWN_PAYMENTS).map((r) => (
            <article className="list-row" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p className="muted">
                  {r.requested_by} · {day(r.paid_at || r.created_at)}
                  {r.payment_id ? ` · ${r.payment_id}` : ""}
                </p>
              </div>
              <span className="chip">{r.status === "paid" ? `Paid ${rupees(r.amount_paise)}` : "Link sent, not paid"}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
