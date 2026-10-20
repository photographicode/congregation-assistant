import {
  Disclosure,
  DisclosureLabel,
} from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { storeFor, demo, rpc } from "./client";
import { Dialog } from "../../../../packages/ui/Dialog";
import type { Context } from "../main";
const tenant = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    status: z.enum(["trial", "active", "expired"]),
    trial_days: z.number(),
    created_at: z.string(),
    payment_date: z.string().nullable(),
  })
  .passthrough();
const request = z
  .object({
    id: z.string(),
    congregation_name: z.string(),
    contact_name: z.string(),
    contact_email: z.string(),
    admin_email: z.string(),
    status: z.enum(["pending", "approved", "declined"]),
    cong_id: z.string().nullable().optional(),
  })
  .passthrough();
const input = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(2).max(150),
  email: z.email(),
  status: z.enum(["trial", "active", "expired"]),
  trial_days: z.coerce.number().int().min(1).max(365),
  payment_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export default function OwnerConsole({ context: c }: { context: Context }) {
  const qc = useQueryClient(),
    [sample, setSample] = React.useState<any[]>([
      {
        id: "fictional-park",
        name: "Fictional River Park",
        email: "admin@example.invalid",
        status: "trial",
        trial_days: 30,
        created_at: new Date().toISOString(),
        payment_date: null,
      },
    ]),
    [editing, setEditing] = React.useState<any>(null),
    [dirty, setDirty] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [search, setSearch] = React.useState(""),
    [localRequests, setLocalRequests] = React.useState<any[]>([
      {
        id: "00000000-0000-4000-8000-000000000001",
        congregation_name: "Fictional Valley",
        contact_name: "Fictional Contact",
        contact_email: "contact@example.invalid",
        admin_email: "admin@example.invalid",
        status: "pending",
        cong_id: null,
      },
    ]),
    [demoMail, setDemoMail] = React.useState({ queued: 0, failed: 0, sent: 0 }),
    [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const tenants = useQuery({
      queryKey: ["owner", "congregations"],
      queryFn: async () => {
        if (demo) return sample;
        return storeFor("").read(
          {
            source: {
              kind: "table",
              name: "congregations",
              columns:
                "id,name,email,status,trial_days,created_at,payment_date,feature_attendance,feature_emergency_contacts,feature_oclm,wipe_requested_at",
              order: "created_at",
              ascending: false,
              limit: 1000,
            },
          },
          z.array(tenant),
        );
      },
    }),
    requests = useQuery({
      queryKey: ["owner", "requests"],
      queryFn: async () =>
        demo
          ? localRequests
          : z.array(request).parse(await rpc("get_workspace_applications")),
    }),
    mail = useQuery({
      queryKey: ["owner", "mail-health"],
      queryFn: async () =>
        demo
          ? demoMail
          : z
              .object({
                queued: z.number(),
                failed: z.number(),
                sent: z.number(),
              })
              .parse(await rpc("get_mail_delivery_health")),
    });
  React.useEffect(() => {
    if (demo) qc.setQueryData(["owner", "congregations"], sample);
  }, [sample]);
  React.useEffect(() => {
    if (demo) qc.setQueryData(["owner", "requests"], localRequests);
  }, [localRequests]);
  React.useEffect(() => {
    if (demo) qc.setQueryData(["owner", "mail-health"], demoMail);
  }, [demoMail]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        "This action did not complete. Your entries are kept. " +
          (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const value = input.parse({
        ...editing,
        email: editing.email.trim().toLowerCase(),
        payment_date: editing.payment_date || null,
      }),
      exists = (tenants.data || []).some((t) => t.id === value.id);
    if (!exists && !/^[a-zA-Z0-9_-]{2,100}$/.test(value.id))
      throw Error(
        "Use 2–100 letters, numbers, hyphens or underscores for the new ID.",
      );
    if (!demo) {
      if (exists)
        await rpc("update_congregation_owner", {
          p_cong_id: value.id,
          p_changes: {
            name: value.name,
            status: value.status,
            trial_days: value.trial_days,
            payment_date: value.payment_date,
            email: value.email,
          },
        });
      else
        await rpc("provision_congregation", {
          p_cong: {
            id: value.id,
            name: value.name,
            trial_days: value.trial_days,
            payment_date: value.payment_date,
          },
          p_admin_email: value.email,
        });
    } else
      setSample((rows) =>
        exists
          ? rows.map((r) => (r.id === value.id ? { ...r, ...value } : r))
          : [...rows, { ...value, created_at: new Date().toISOString() }],
      );
    if (!demo)
      await qc.invalidateQueries({ queryKey: ["owner", "congregations"] });
    setDirty(false);
    setEditing(null);
    c.notify(
      exists
        ? "Congregation details saved."
        : "Congregation created. Its Google administrator account can now sign in.",
    );
  }
  const pending = (requests.data || []).filter((r) => r.status === "pending"),
    list = (tenants.data || []).filter((t) =>
      (t.name + " " + t.id + " " + t.email)
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("ui.owner.account.b6440118")}</div>
          <h1>{t("ui.command.centre.44cd32e8")}</h1>
          <p>{t("ui.manage.workspace.requests.billing.status.a.2bb31c60")}</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setError("");
            setDirty(false);
            setEditing({
              id: crypto.randomUUID(),
              name: "",
              email: "",
              status: "trial",
              trial_days: 30,
              payment_date: "",
            });
          }}
        >
          {t("ui.add.congregation.b66889a4")}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="grid">
        <section className="card stack">
          <h2>
            {pending.length} {t("ui.workspace.requests.11aa2f5f")}
          </h2>
          {requests.error ? (
            <p role="alert">
              {t("ui.requests.could.not.load.2692df29")}
              <button onClick={() => void requests.refetch()}>
                {t("ui.retry.942087cc")}
              </button>
            </p>
          ) : pending.length ? (
            pending.map((r) => (
              <article className="list-row" key={r.id}>
                <div>
                  <strong>{r.congregation_name}</strong>
                  <p>
                    {r.contact_name} · {r.admin_email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRequest(r);
                    setError("");
                  }}
                >
                  {t("ui.review.request.dcea8abb")}
                </button>
              </article>
            ))
          ) : (
            <p>{t("ui.new.requests.appear.here.after.the.website.52c84a00")}</p>
          )}
        </section>
        <section className="card">
          <h2>{t("ui.mail.delivery.fe1ffc44")}</h2>
          {mail.data ? (
            <p>
              {mail.data.queued} {t("ui.queued.276fc89a")}
              {mail.data.failed} {t("ui.failed.b36fc229")}
              {mail.data.sent} {t("ui.sent.in.the.last.seven.days.ee69a6a8")}
            </p>
          ) : (
            <p>
              {t("ui.delivery.status.could.not.load.d1e76d07")}
              <button onClick={() => void mail.refetch()}>
                {t("ui.retry.942087cc")}
              </button>
            </p>
          )}
          <p>{t("ui.a.queued.message.is.not.proof.of.delivery..afbd1ada")}</p>
        </section>
      </div>
      <section className="card stack">
        <h2>{t("ui.congregations.6c2258e5")}</h2>
        <label>
          {t("ui.find.a.congregation.bd6524e5")}
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        {tenants.isLoading ? (
          <p role="status">{t("ui.loading.congregations.6bfc9b37")}</p>
        ) : tenants.error ? (
          <p role="alert">
            {t("ui.the.directory.could.not.load.a9cf9bf9")}
            <button onClick={() => void tenants.refetch()}>
              {t("ui.retry.942087cc")}
            </button>
          </p>
        ) : list.length ? (
          list.map((workspaceRow) => (
            <article className="list-row" key={workspaceRow.id}>
              <div>
                <strong>{workspaceRow.name}</strong>
                <p>
                  {workspaceRow.id} · {workspaceRow.status} ·{" "}
                  {workspaceRow.email || "Administrator not recorded"}
                </p>
              </div>
              <button
                onClick={() => {
                  setEditing({
                    ...workspaceRow,
                    payment_date: workspaceRow.payment_date || "",
                  });
                  setDirty(false);
                  setError("");
                }}
              >
                {t("ui.manage.congregation.2b347b3f")}
              </button>
            </article>
          ))
        ) : (
          <p>{t("ui.no.matching.congregation.change.your.searc.b423c255")}</p>
        )}
      </section>
      <Dialog
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setDirty(false);
        }}
        title={
          (tenants.data || []).some((t) => t.id === editing?.id)
            ? "Manage congregation"
            : "Add congregation"
        }
        dirty={dirty}
      >
        {editing && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(save);
            }}
          >
            <label>
              {t("ui.congregation.name.d818e870")}
              <input
                required
                value={editing.name}
                onChange={(e) => {
                  setEditing((v: any) => ({ ...v, name: e.target.value }));
                  setDirty(true);
                }}
              />
            </label>
            <label>
              {t("ui.permanent.workspace.id.6e5c7a0e")}
              <input
                required
                disabled={(tenants.data || []).some((t) => t.id === editing.id)}
                value={editing.id}
                onChange={(e) => {
                  setEditing((v: any) => ({ ...v, id: e.target.value }));
                  setDirty(true);
                }}
              />
            </label>
            <label>
              {(tenants.data || []).some((t) => t.id === editing.id)
                ? "Congregation contact email"
                : "Main administrator’s Google account email"}
              <input
                type="email"
                required
                value={editing.email || ""}
                onChange={(e) => {
                  setEditing((v: any) => ({ ...v, email: e.target.value }));
                  setDirty(true);
                }}
              />
            </label>
            <Disclosure>
              <DisclosureLabel>
                {t("ui.trial.billing.details.10e0dbe3")}
              </DisclosureLabel>
              <div className="stack">
                <label>
                  {t("ui.status.920e413c")}
                  <LegacySelect
                    value={editing.status}
                    onChange={(e) => {
                      setEditing((v: any) => ({
                        ...v,
                        status: e.target.value,
                      }));
                      setDirty(true);
                    }}
                  >
                    <option value="trial">{t("ui.trial.98a66e97")}</option>
                    <option value="active">{t("ui.active.92340695")}</option>
                    <option value="expired">{t("ui.paused.e159b061")}</option>
                  </LegacySelect>
                </label>
                <label>
                  {t("ui.trial.length.in.days.cdeeccb2")}
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={editing.trial_days}
                    onChange={(e) => {
                      setEditing((v: any) => ({
                        ...v,
                        trial_days: e.target.value,
                      }));
                      setDirty(true);
                    }}
                  />
                </label>
                <label>
                  {t("ui.payment.date.65d5165f")}
                  <input
                    type="date"
                    value={editing.payment_date || ""}
                    onChange={(e) => {
                      setEditing((v: any) => ({
                        ...v,
                        payment_date: e.target.value,
                      }));
                      setDirty(true);
                    }}
                  />
                </label>
                <p>
                  {t("ui.pausing.removes.access.to.meeting.report.t.b4de8796")}
                </p>
              </div>
            </Disclosure>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {t("ui.save.congregation.9547ae26")}
            </button>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title={t("ui.review.workspace.request.e06965d7")}
      >
        {selectedRequest && (
          <div className="stack">
            <h2>{selectedRequest.congregation_name}</h2>
            <p>
              {selectedRequest.contact_name} · {selectedRequest.contact_email}
            </p>
            <p>
              {t("ui.main.administrator.597a77ce")}
              {selectedRequest.admin_email}
            </p>
            <label>
              {t("ui.new.permanent.workspace.id.3c1fa65f")}
              <input
                value={selectedRequest.newId || ""}
                onChange={(e) =>
                  setSelectedRequest((r: any) => ({
                    ...r,
                    newId: e.target.value,
                  }))
                }
              />
            </label>
            <p>{t("refine.ownerCreate")}</p>
            <p>{t("refine.ownerPermission")}</p>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (
                    !/^[a-zA-Z0-9_-]{2,100}$/.test(selectedRequest.newId || "")
                  )
                    throw Error("Enter a permanent workspace ID.");
                  if (!demo)
                    await rpc("review_workspace_application", {
                      p_id: selectedRequest.id,
                      p_cong_id: selectedRequest.newId,
                      p_approve: true,
                    });
                  else {
                    setLocalRequests((rows) =>
                      rows.map((r) =>
                        r.id === selectedRequest.id
                          ? {
                              ...r,
                              status: "approved",
                              cong_id: selectedRequest.newId,
                            }
                          : r,
                      ),
                    );
                    setSample((rows) => [
                      ...rows,
                      {
                        id: selectedRequest.newId,
                        name: selectedRequest.congregation_name,
                        email: selectedRequest.admin_email,
                        status: "trial",
                        trial_days: 30,
                        created_at: new Date().toISOString(),
                        payment_date: null,
                      },
                    ]);
                    setDemoMail((value) => ({
                      ...value,
                      queued: value.queued + 2,
                    }));
                  }
                  setSelectedRequest(null);
                  if (!demo)
                    await qc.invalidateQueries({ queryKey: ["owner"] });
                  c.notify(
                    "Request approved. Check mail delivery before saying the email was received.",
                  );
                })
              }
            >
              {t("ui.approve.request.9ed200ae")}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!demo)
                    await rpc("review_workspace_application", {
                      p_id: selectedRequest.id,
                      p_cong_id: null,
                      p_approve: false,
                    });
                  else
                    setLocalRequests((rows) =>
                      rows.map((r) =>
                        r.id === selectedRequest.id
                          ? { ...r, status: "declined" }
                          : r,
                      ),
                    );
                  setSelectedRequest(null);
                  if (!demo)
                    await qc.invalidateQueries({
                      queryKey: ["owner", "requests"],
                    });
                  c.notify("Request declined.");
                })
              }
            >
              {t("ui.decline.request.72740f4a")}
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
