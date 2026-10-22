import {createReportLink} from './link-action';
import { LegacySelect, Button } from "../../../../packages/ui/components";
import { HomeGroupLinks } from "./HomeGroupLinks";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { rpc, demo } from "./client";
import { t } from "../../../../packages/core/i18n";
import type { Context } from "../context";
export function ReportLinks({ context: c }: { context: Context }) {
  const reportAllowed = c.roles.some((role) =>
      ["admin", "field_service", "group_overseer"].includes(role),
    ),
    attendanceAllowed = c.roles.some((role) =>
      ["admin", "attendance"].includes(role),
    ),
    groupOnly =
      c.roles.includes("group_overseer") &&
      !c.roles.some((role) => ["admin", "field_service"].includes(role)),
    [group, setGroup] = React.useState(""),
    [link, setLink] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const groups = useQuery({
    queryKey: ["link-groups", c.cong],
    enabled: reportAllowed,
    queryFn: async () =>
      demo
        ? [
            { id: "group1", name: "Group 1" },
            { id: "group2", name: "Group 2" },
          ].slice(0, groupOnly ? 1 : 2)
        : z
            .array(z.object({ id: z.string(), name: z.string() }))
            .parse(await rpc("ca_v3_report_groups", { p_cong_id: c.cong })),
  });
  React.useEffect(() => {
    if (groupOnly && !group && groups.data?.length)
      setGroup(groups.data[0].name);
  }, [groups.data, groupOnly, group]);
  async function create(kind: "report" | "attendance") {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        c.notify(t("links.demo"));
        return;
      }
      const result = z.object({ token: z.string() }).parse(
        await createReportLink(c.cong,kind,group||null),
      );
      setLink(
        location.origin +
          import.meta.env.BASE_URL +
          "?form=" +
          kind +
          "#token=" +
          encodeURIComponent(result.token),
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="card stack">
        <h2>{t("links.title")}</h2>
        <p>{t("refine.linkHelp0")}</p>
        <p>{t("refine.linkHelp1")}</p>
        <p>{t("refine.linkHelp2")}</p>
        {reportAllowed && (
          <>
            <div className="ui-field">
              
              <LegacySelect
                value={group}
                onChange={(e) => {
                  setGroup(e.target.value);
                  setLink("");
                }} aria-label={t("links.group")}
              >
                {!groupOnly && <option value="">{t("s21.all")}</option>}
                {groups.data?.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </LegacySelect>
            </div>
            <Button
              disabled={
                busy ||
                groups.isLoading ||
                !!groups.error ||
                (groupOnly && !group)
              }
              onClick={() => void create("report")} type="button"
            >
              {t("links.report")}
            </Button>
          </>
        )}
        {attendanceAllowed && (
          <Button disabled={busy} onClick={() => void create("attendance")} type="button">
            {t("links.attendance")}
          </Button>
        )}
        {(error || groups.error) && (
          <p role="alert">{error || groups.error?.message}</p>
        )}
        {link && (
          <>
            <label>
              {t("links.protected")}
              <input readOnly value={link} />
            </label>
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => c.notify(t("common.copied")))
                  .catch(() => setError(t("oclm.copyFailed")))
              } type="button"
            >
              {t("common.copy")}
            </Button>
            <a href={link} target="_blank" rel="noreferrer">
              {t("links.open")}
            </a>
          </>
        )}
      </section>
      {reportAllowed && (
        <HomeGroupLinks
          context={c}
          manage
          period={(() => {
            const date = new Date();
            date.setDate(1);
            date.setMonth(date.getMonth() - 1);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          })()}
        />
      )}
    </>
  );
}
