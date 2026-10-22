import { LegacySelect, Button } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { ReportLinks } from "./ReportLinks";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { storeFor, demo, rpc } from "./client";
import { repositories } from "../../../../packages/core/repositories";
import type { Context } from "../main";
const roleLabels: Record<string, string> = {
  admin: "Main administrator",
  field_service: "Field service overseer",
  oclm: "Midweek overseer",
  weekend: "Weekend overseer",
  group_overseer: "Group overseer",
  attendance: "Attendance recorder",
  attendant: "Attendant",
  av: "Audio & video",
  cleaning: "Cleaning overseer",
};
const roles = [
  "admin",
  "field_service",
  "oclm",
  "weekend",
  "group_overseer",
  "attendance",
  "attendant",
  "av",
  "cleaning",
];
export function Access({
  context: c,
  accountsOnly = false,
}: {
  context: Context;
  accountsOnly?: boolean;
}) {
  const repo = React.useMemo(
    () => repositories(storeFor(c.cong, c.roles), c.cong, demo),
    [c.cong],
  );
  const query = useQuery({
    queryKey: ["access", c.cong],
    queryFn: () => repo.access.list(),
    enabled: !demo && c.roles.includes("admin"),
  });
  const [email, setEmail] = React.useState(""),
    [role, setRole] = React.useState("oclm"),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [local, setLocal] = React.useState<any[]>([]),
    [link, setLink] = React.useState(""),
    [group, setGroup] = React.useState("");
  const groups = useQuery({
    queryKey: ["access-groups", c.cong],
    queryFn: async () =>
      demo
        ? [
            { id: "fictional-1", name: "Group 1" },
            { id: "fictional-2", name: "Group 2" },
          ]
        : z
            .array(z.object({ id: z.string(), name: z.string() }))
            .parse(await rpc("ca_v2_groups", { p_cong_id: c.cong })),
    enabled: role === "group_overseer",
  });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="grid">
      {c.roles.includes("admin") && (
        <section className="card stack">
          <h2>{t("ui.approved.accounts.95844014")}</h2>
          <p>{t("refine.roleHelp0")}</p>
          <p>{t("refine.roleHelp1")}</p>
          {(error || query.error) && (
            <p role="alert" className="error">
              {error || query.error?.message}
            </p>
          )}
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const normalized = z.email().parse(email.trim().toLowerCase());
                if (role === "group_overseer" && !group)
                  throw Error("Choose the group this overseer may report for.");
                if (demo)
                  setLocal([
                    ...local,
                    {
                      id: crypto.randomUUID(),
                      email: normalized,
                      role,
                      service_group: role === "group_overseer" ? group : null,
                      active: true,
                    },
                  ]);
                else {
                  await repo.access.approve({
                    email: normalized,
                    role,
                    service_group: role === "group_overseer" ? group : null,
                    active: true,
                  });
                  await query.refetch();
                }
                setEmail("");
                c.notify("Account access approved.");
              });
            }}
          >
            <label>
              {t("ui.email.969ccbd3")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              {t("ui.role.14736a2e")}
              <LegacySelect
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </LegacySelect>
            </label>
            {role === "group_overseer" && (
              <label>
                {t("ui.assigned.group.3395b08d")}
                <LegacySelect
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  <option value="">{t("ui.choose.a.group.005a6177")}</option>
                  {groups.data?.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </LegacySelect>
              </label>
            )}
            <Button disabled={busy || !c.roles.includes("admin")} type="submit">
              {t("ui.approve.account.b593d6e2")}
            </Button>
          </form>
          <div className="list">
            {(demo ? local : query.data || []).map((a) => (
              <div className="list-row" key={a.id}>
                <div>
                  <strong>{a.email}</strong>
                  <p>
                    {roleLabels[a.role] || a.role}
                    {a.service_group ? " · " + a.service_group : ""} ·{" "}
                    {a.active ? "Active" : "Revoked"}
                  </p>
                </div>
                {a.active && (
                  <Button
                    disabled={busy}
                    onClick={() => {
                      if (
                        !confirm(
                          "Revoke " +
                            (roleLabels[a.role] || a.role) +
                            " access for " +
                            a.email +
                            "? They will lose these tools; downloaded copies will remain.",
                        )
                      )
                        return;
                      void run(async () => {
                        if (demo)
                          setLocal(
                            local.map((x) =>
                              x.id === a.id ? { ...x, active: false } : x,
                            ),
                          );
                        else {
                          await repo.access.revoke(a.id);
                          await query.refetch();
                        }
                        c.notify("Access revoked.");
                      });
                    }} type="button"
                  >
                    {t("ui.revoke.87e6d00b")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {!accountsOnly && <ReportLinks context={c} />}
    </div>
  );
}
