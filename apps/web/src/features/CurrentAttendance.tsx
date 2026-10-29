import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { rpc, demo } from "./client";
import { t } from "../../../../packages/core/i18n";
import type { Context } from "../context";
import { Button } from "../../../../packages/ui/components";

const schema = z
  .object({
    configured: z.boolean(),
    date: z.string().optional(),
    kind: z.string().nullable().optional(),
    timezone: z.string().optional(),
    count: z.number().nullable().optional(),
    canSubmit: z.boolean().optional(),
    message: z.string().optional(),
  })
  .passthrough();
export function CurrentAttendance({ context: c, today=false }: { context: Context; today?: boolean }) {
  const [dirty, setDirty] = React.useState(false),
    [entryDate, setEntryDate] = React.useState(""),
    [count, setCount] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const query = useQuery({
    queryKey: ["current-meeting", c.cong],
    queryFn: async () =>
      schema.parse(
        demo
          ? {
              configured: true,
              date: new Date().toISOString().slice(0, 10),
              kind: "midweek",
              timezone: "UTC",
              count: null,
              canSubmit: true,
            }
          : await rpc("ca_v3_meeting_context", { p_cong_id: c.cong }),
      ),
    refetchInterval: 60000,
  });
  React.useEffect(() => {
    if (query.data?.date !== entryDate) {
      setEntryDate(query.data?.date || "");
      setCount(query.data?.count == null ? "" : String(query.data.count));
      setDirty(false);
    } else if (!dirty)
      setCount(query.data?.count == null ? "" : String(query.data.count));
  }, [query.data]);
  const value = query.data;
  return (
    <section className={today?"card stack today-attendance":"card stack"}>
      <h2>{t(today?"ux.today.countAttendance":"attendance.today")}</h2>
      {!today&&<p>{t("attendance.automatic")}</p>}
      {value && (
        <p>
          {value.date} ·{" "}
          {value.kind
            ? t(
                value.kind === "midweek"
                  ? "attendance.midweek"
                  : "attendance.weekend",
              )
            : t("attendance.noMeeting")}{" "}
          · {value.timezone}
        </p>
      )}
      {(error || query.error) && (
        <p role="alert">{error || query.error?.message}</p>
      )}
      {value?.configured &&
      value.canSubmit &&
      ["midweek", "weekend"].includes(value.kind || "") ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.date || value.date !== entryDate) return;
            setBusy(true);
            setError("");
            void (async () => {
              if (
                !Number.isInteger(Number(count)) ||
                count === "" ||
                Number(count) < 0 ||
                Number(count) > 99999
              )
                throw Error(t("attendance.invalid"));
              if (!demo)
                await rpc("ca_v3_submit_attendance", {
                  p_cong_id: c.cong,
                  p_date: value.date,
                  p_count: Number(count),
                });
              setDirty(false);
              c.notify(t("attendance.saved"));
              if (!demo) await query.refetch();
            })()
              .catch((error) => setError(error.message))
              .finally(() => setBusy(false));
          }}
        >
          <label>
            {t("attendance.count")}
            <input
              type="number"
              min={0}
              max={99999}
              required
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <Button disabled={busy} type="submit">{t(today?"ui.save.attendance.15e51ffc":"attendance.save")}</Button>
        </form>
      ) : (
        <p>
          {value?.configured
            ? t("attendance.noMeeting")
            : t("attendance.configure")}
        </p>
      )}
    </section>
  );
}
