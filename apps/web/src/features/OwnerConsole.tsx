import {
  Disclosure,
  DisclosureLabel, Button, Chip, Segmented, Stack } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { storeFor, demo, rpc } from "./client";
import { Dialog } from "../../../../packages/ui/Dialog";
import type { Context } from "../context";
import { OwnerPayments } from "./OwnerPayments";
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
const territoryRequest = z
  .object({
    id: z.string(),
    contact_name: z.string(),
    contact_email: z.string(),
    congregation_name: z.string(),
    phone: z.string().nullable().optional(),
    details: z.string(),
    status: z.enum(["new", "in_progress", "done", "declined"]),
    created_at: z.string(),
  })
  .passthrough();
const territoryStatuses = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "declined", label: "Declined" },
];
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
const DAY = 86_400_000,
  SOON_DAYS = 7,
  ID_MAX = 60,
  statusLabel: Record<string, string> = { trial: "Trial", active: "Active", expired: "Paused" },
  statusTone: Record<string, "warn" | "ok" | "danger"> = { trial: "warn", active: "ok", expired: "danger" };
// Days until a trial ends; negative once it has lapsed.
function trialDaysLeft(row: { created_at: string; trial_days: number }) {
  return Math.ceil((Date.parse(row.created_at) + row.trial_days * DAY - Date.now()) / DAY);
}
function trialNote(row: { status: string; created_at: string; trial_days: number }) {
  if (row.status !== "trial") return "";
  const left = trialDaysLeft(row);
  return left >= 0 ? `Trial ends in ${left} days` : "Trial ended";
}
// A readable permanent ID from the congregation name, e.g. "River Park" → "river-park".
function suggestId(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, ID_MAX);
}
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
    [statusFilter, setStatusFilter] = React.useState("all"),
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
    [demoTerritory, setDemoTerritory] = React.useState<z.infer<typeof territoryRequest>[]>([
      {
        id: "00000000-0000-4000-8000-000000000002",
        contact_name: "Fictional Overseer",
        contact_email: "overseer@example.invalid",
        congregation_name: "Fictional Hillside",
        phone: null,
        details: "We have our boundary as a KML file and need it split into about 30 territories with printed cards.",
        status: "new" as const,
        created_at: new Date().toISOString(),
      },
    ]),
    [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const tenants = useQuery({
      queryKey: ["owner", "congregations"],
      queryFn: async () => {
        if (demo) return sample;
        // Members can no longer read email or billing columns; the owner reads them through this function.
        // shortcut: falls back to the table until the 2026-11-04 migration runs, remove the fallback after.
        try {
          return z.array(tenant).parse(await rpc("ca_owner_congregations"));
        } catch (failure) {
          if (!/ca_owner_congregations|PGRST202|could not find/i.test((failure as Error)?.message || "")) throw failure;
        }
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
  const territory = useQuery({
    queryKey: ["owner", "territory-requests"],
    queryFn: async () =>
      demo ? demoTerritory : z.array(territoryRequest).parse(await rpc("get_territory_requests")),
  });
  React.useEffect(() => {
    if (demo) qc.setQueryData(["owner", "mail-health"], demoMail);
  }, [demoMail]);
  React.useEffect(() => {
    if (demo) qc.setQueryData(["owner", "territory-requests"], demoTerritory);
  }, [demoTerritory, qc]);
  const territoryErrorText = /PGRST202|could not find/i.test(territory.error?.message || "")
    ? "Territory requests turn on after the 2026-11-04 database update is run."
    : "Territory requests could not load. ";
  async function setTerritoryStatus(id: string, status: string) {
    if (demo) {
      setDemoTerritory((rows) => rows.map((r) => (r.id === id ? { ...r, status: status as typeof r.status } : r)));
      return;
    }
    await rpc("update_territory_request", { p_id: id, p_status: status, p_note: null });
    await qc.invalidateQueries({ queryKey: ["owner", "territory-requests"] });
  }
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
    all = tenants.data || [],
    count = (status: string) => all.filter((t) => t.status === status).length,
    endingSoon = all.filter((t) => {
      const left = trialDaysLeft(t);
      return t.status === "trial" && left >= 0 && left <= SOON_DAYS;
    }).length,
    list = all.filter(
      (t) =>
        (statusFilter === "all" || t.status === statusFilter) &&
        (t.name + " " + t.id + " " + t.email)
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
  return (
    <Stack>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("ui.owner.account.b6440118")}</div>
          <h1>{t("ui.command.centre.44cd32e8")}</h1>
          <p>{t("ui.manage.workspace.requests.billing.status.a.2bb31c60")}</p>
        </div>
        <Button
          className="primary"
          onClick={() => {
            setError("");
            setDirty(false);
            setEditing({
              id: "",
              name: "",
              email: "",
              status: "trial",
              trial_days: 30,
              payment_date: "",
            });
          }} type="button"
        >
          {t("ui.add.congregation.b66889a4")}
        </Button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {/* The owner's day starts with these numbers; each tile filters the list below. */}
      <div className="dashboard-kpis owner-kpis" aria-busy={tenants.isLoading}>
        {[
          { label: "Total", value: all.length, filter: "all" },
          { label: "Active", value: count("active"), filter: "active" },
          { label: "On trial", value: count("trial"), detail: `${endingSoon} end this week`, filter: "trial" },
          { label: "Paused", value: count("expired"), filter: "expired" },
        ].map((tile) => (
          <button
            key={tile.filter}
            className="card kpi"
            aria-pressed={statusFilter === tile.filter}
            onClick={() => setStatusFilter(tile.filter)}
            type="button"
          >
            <span className="kpi-label">{tile.label}</span>
            <strong>{tenants.isLoading || tenants.error ? "—" : tile.value}</strong>
            {tile.detail && <span>{tile.detail}</span>}
          </button>
        ))}
      </div>
      <div className="grid">
        <section className="card stack">
          <h2>
            {pending.length === 1 ? "1 workspace request" : `${pending.length} workspace requests`}
          </h2>
          {requests.error ? (
            <p role="alert">
              {t("ui.requests.could.not.load.2692df29")}
              <Button onClick={() => void requests.refetch()} type="button">
                {t("ui.retry.942087cc")}
              </Button>
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
                <Button
                  onClick={() => {
                    setSelectedRequest({ ...r, newId: suggestId(r.congregation_name) });
                    setError("");
                  }} type="button"
                >
                  {t("ui.review.request.dcea8abb")}
                </Button>
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
              {`${mail.data.sent} sent · ${mail.data.queued} queued · ${mail.data.failed} failed in the last seven days`}
            </p>
          ) : (
            <p>
              {t("ui.delivery.status.could.not.load.d1e76d07")}
              <Button onClick={() => void mail.refetch()} type="button">
                {t("ui.retry.942087cc")}
              </Button>
            </p>
          )}
          <p>{t("ui.a.queued.message.is.not.proof.of.delivery..afbd1ada")}</p>
        </section>
      </div>
      {/* Territory maps are made outside the app; requests come from the public form and are tracked here. */}
      <section className="card stack">
        <h2>
          {(() => {
            const open = (territory.data || []).filter((r) => r.status === "new" || r.status === "in_progress").length;
            return open === 1 ? "1 open territory map request" : `${open} open territory map requests`;
          })()}
        </h2>
        <p>
          {"Public form: "}
          <a href={location.origin + import.meta.env.BASE_URL + "?request=territory"} target="_blank" rel="noreferrer">
            {location.origin + import.meta.env.BASE_URL + "?request=territory"}
          </a>
        </p>
        {territory.error && (
          <p role="alert">
            {territoryErrorText}
            <Button onClick={() => void territory.refetch()} type="button">
              {t("ui.retry.942087cc")}
            </Button>
          </p>
        )}
        {!territory.error && (territory.data?.length ? (
          territory.data.map((r) => (
            <article className="stack territory-request" key={r.id}>
              <div>
                <strong>{r.congregation_name}</strong>
                <p>
                  {r.contact_name} · <a href={"mailto:" + r.contact_email}>{r.contact_email}</a>
                  {r.phone ? ` · ${r.phone}` : ""}
                  {" · "}
                  {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <p>{r.details}</p>
              </div>
              <Segmented
                label={`Status for ${r.congregation_name}`}
                value={r.status}
                options={territoryStatuses}
                onChange={(status) => void run(() => setTerritoryStatus(r.id, status))}
              />
            </article>
          ))
        ) : (
          <p>{"No territory map requests yet."}</p>
        ))}
      </section>
      <OwnerPayments />
      <section className="card stack">
        <h2>{t("ui.congregations.6c2258e5")}</h2>
        <label>
          {t("ui.find.a.congregation.bd6524e5")}
          <input
            type="search"
            placeholder={"Name, ID or email"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Segmented
          label={"Show"}
          value={statusFilter}
          options={[
            { value: "all", label: "All" },
            { value: "active", label: "Active" },
            { value: "trial", label: "Trial" },
            { value: "expired", label: "Paused" },
          ]}
          onChange={setStatusFilter}
        />
        {tenants.isLoading ? (
          <p role="status">{t("ui.loading.congregations.6bfc9b37")}</p>
        ) : tenants.error ? (
          <p role="alert">
            {t("ui.the.directory.could.not.load.a9cf9bf9")}
            <Button onClick={() => void tenants.refetch()} type="button">
              {t("ui.retry.942087cc")}
            </Button>
          </p>
        ) : list.length ? (
          list.map((workspaceRow) => (
            <article className="list-row" key={workspaceRow.id}>
              <div>
                <strong>{workspaceRow.name}</strong>{" "}
                <Chip tone={statusTone[workspaceRow.status]}>{statusLabel[workspaceRow.status]}</Chip>
                <p>
                  {workspaceRow.email || "Administrator not recorded"}
                </p>
                <p>
                  {[
                    workspaceRow.id,
                    "Joined " + new Date(workspaceRow.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
                    trialNote(workspaceRow),
                    workspaceRow.payment_date ? "Paid " + workspaceRow.payment_date : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditing({
                    ...workspaceRow,
                    payment_date: workspaceRow.payment_date || "",
                  });
                  setDirty(false);
                  setError("");
                }} type="button"
              >
                {t("ui.manage.congregation.2b347b3f")}
              </Button>
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
                  const name = e.target.value;
                  // New congregations get a readable ID from their name until the owner edits it.
                  setEditing((v: any) =>
                    all.some((t) => t.id === v.id) || v.idEdited
                      ? { ...v, name }
                      : { ...v, name, id: suggestId(name) },
                  );
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
                  setEditing((v: any) => ({ ...v, id: e.target.value, idEdited: true }));
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
                <Segmented
                  label={t("ui.status.920e413c")}
                  value={editing.status}
                  options={[
                    { value: "trial", label: t("ui.trial.98a66e97") },
                    { value: "active", label: t("ui.active.92340695") },
                    { value: "expired", label: t("ui.paused.e159b061") },
                  ]}
                  onChange={(status) => {
                    setEditing((v: any) => ({ ...v, status }));
                    setDirty(true);
                  }}
                />
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
            <Button className="primary" disabled={busy} type="submit">
              {t("ui.save.congregation.9547ae26")}
            </Button>
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
            <Button
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
              } type="button"
            >
              {t("ui.approve.request.9ed200ae")}
            </Button>
            <Button
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
              } type="button"
            >
              {t("ui.decline.request.72740f4a")}
            </Button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </Stack>
  );
}
