import React from "react";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";

import {
  localCommand,
  type LocalPlan,
} from "../../../../packages/core/local-command";
import { reportSchema } from "../../../../packages/core/repositories";
import { t } from "../../../../packages/core/i18n";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import { rpc, demo } from "./client";
import { publisherS21 } from "./pdf-download";
import { useDemoReports } from "./demo-reports";
import type { Context } from "../main";
import { PersonPicker } from "../../../../packages/ui/components";
import { commandRegistry } from "../../../../packages/core/command-registry";
export function LocalAssistant({
  context: c,
  onExport,
  compact = false,
}: {
  context: Context;
  onExport: () => void;
  compact?: boolean;
}) {
  const [input, setInput] = React.useState(""),
    [plan, setPlan] = React.useState<LocalPlan | null>(null),
    [publisher, setPublisher] = React.useState(""),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    cache = useQueryClient(),
    demoRows = useDemoReports((s) => s.rows),
    updateDemo = useDemoReports((s) => s.update);
  const people = {
    data: demo
      ? demoPublishers
      : cache.getQueryData<Array<{ id: string; name: string }>>([
          "assistant-people",
          c.account,
          c.cong,
        ]) || [],
    isPending: false,
    error: null as Error | null,
  };
  const lock = React.useRef(false);
  const [meeting, setMeeting] = React.useState<
    | {
        date: string;
        kind: string;
        canSubmit: boolean;
        count: number | null;
        timezone: string;
      }
    | undefined
  >();
  const year =
      plan?.kind === "report"
        ? Number(plan.period.slice(0, 4)) +
          (Number(plan.period.slice(5)) >= 9 ? 1 : 0)
        : 0,
    month = plan?.kind === "report" ? Number(plan.period.slice(5)) - 1 : 0;
  const rows = demo
    ? demoRows
    : cache.getQueryData<Array<z.infer<typeof reportSchema>>>([
        "assistant-records",
        c.account,
        c.cong,
      ]) || [];
  const current = {
    data:
      rows.find(
        (r) =>
          r.pub_id === publisher &&
          r.service_year === year &&
          r.month === month,
      ) || null,
    isPending: false,
    error: null as Error | null,
    refetch: async () => {},
  };
  async function confirm() {
    if (!c.roles.includes("admin") || lock.current || !plan) return;
    if (plan.kind === "s21-person") {
      await download(publisher);
      return;
    }
    if (plan.kind === "attendance") {
      if (
        !meeting?.canSubmit ||
        !["midweek", "weekend"].includes(meeting.kind) ||
        (plan.meeting && plan.meeting !== meeting.kind)
      ) {
        setError(
          "No matching current meeting. Open Attendance to review the calendar.",
        );
        return;
      }
      lock.current = true;
      setBusy(true);
      try {
        if (!demo)
          await rpc("ca_v3_submit_attendance", {
            p_cong_id: c.cong,
            p_date: meeting.date,
            p_count: plan.count,
          });
        cache.setQueryData(["assistant-meeting", c.account, c.cong], {
          ...meeting,
          count: plan.count,
        });
        await cache.invalidateQueries({ queryKey: ["attendance"] });
        await cache.invalidateQueries({ queryKey: ["current-meeting"] });
        setPlan(null);
        setInput("");
        c.notify(
          demo
            ? "Demo attendance recorded for this preview."
            : "Attendance saved.",
        );
      } catch (error) {
        setError((error as Error).message);
      } finally {
        lock.current = false;
        setBusy(false);
      }
      return;
    }
    if (plan.kind === "s21-all") {
      onExport();
      return;
    }
    if (!publisher || current.isPending || current.error) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const previous = current.data,
        expected = previous
          ? {
              shared: previous.shared_in_ministry ?? false,
              hours: Number(previous.hours || 0),
              studies: previous.studies || 0,
              comments: previous.comments || "",
              auxiliary: previous.is_ap ?? false,
            }
          : null;
      if (demo)
        updateDemo((rows) => [
          ...rows.filter(
            (row) =>
              !(
                row.pub_id === publisher &&
                row.service_year === year &&
                row.month === month
              ),
          ),
          {
            id: previous?.id || crypto.randomUUID(),
            cong_id: c.cong,
            pub_id: publisher,
            service_year: year,
            month,
            hours: plan.hours,
            studies: plan.studies,
            shared_in_ministry: true,
            comments:
              previous?.comments === "Not Participated"
                ? ""
                : previous?.comments || "",
            is_ap: previous?.is_ap || false,
          },
        ]);
      else
        await rpc("ca_v3_save_assistant_report", {
          p_cong_id: c.cong,
          p_publisher_id: publisher,
          p_year: year,
          p_month: month,
          p_hours: plan.hours,
          p_studies: plan.studies,
          p_expected: expected,
        });
      await cache.invalidateQueries({ queryKey: ["reports"] });
      await cache.invalidateQueries({ queryKey: ["annual-reports"] });
      await cache.invalidateQueries({ queryKey: ["assistant-current"] });
      setPlan(null);
      setInput("");
      c.notify(t("assistant.saved"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function download(id: string) {
    if (!c.roles.includes("admin") || !id || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await publisherS21(
        c,
        id,
        demo ? demoPublishers.find((p) => p.id === id) : undefined,
      );
      setPlan(null);
      setInput("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!c.roles.includes("admin")) return null;
  return (
    <div className="stack">
      {!compact && (
        <>
          <div className="assistant-privacy">
            <p>{t("refine.assistantPrivacy0")}</p>
            <p>{t("refine.assistantPrivacy1")}</p>
            <p>{t("refine.assistantPrivacy2")}</p>
            <p>{t("refine.assistantPrivacy3")}</p>
            <p>{t("refine.assistantPrivacy4")}</p>
          </div>
          <section>
            <h3>{t("refine.assistantExamples")}</h3>
            <ul>
              <li>{t("refine.assistantExample0")}</li>
              <li>{t("refine.assistantExample1")}</li>
            </ul>
          </section>
        </>
      )}
      {compact && <p>{t("assistant.localSummary")}</p>}
      {compact && (
        <div className="actions assistant-suggestions">
          {commandRegistry
            .filter((command) =>
              ["pdf.s21", "attendance.save", "report.save"].includes(
                command.name,
              ),
            )
            .flatMap((command) => command.examples.slice(0, 1))
            .map((suggestion) => (
              <button
                type="button"
                className="subtle"
                key={suggestion}
                onClick={() => {
                  setInput(suggestion);
                  setPlan(null);
                  setError("");
                }}
              >
                {suggestion}
              </button>
            ))}
        </div>
      )}
      <label>
        {t("assistant.command")}
        <textarea
          disabled={busy}
          aria-label={t("assistant.command")}
          maxLength={500}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setPlan(null);
            setError("");
          }}
        />
      </label>
      <button
        disabled={people.isPending || !!people.error || busy || !input.trim()}
        onClick={() => {
          setError("");
          try {
            const next = localCommand(input, people.data || []);
            if (next.kind === "attendance")
              setMeeting(
                cache.getQueryData(["assistant-meeting", c.account, c.cong]),
              );
            setPlan(next);
            setPublisher(
              (next.kind === "report" || next.kind === "s21-person") &&
                next.people.length === 1
                ? next.people[0].id
                : "",
            );
            if (next.kind === "s21-person" && next.people.length === 1)
              void download(next.people[0].id);
          } catch (error) {
            setError((error as Error).message);
          }
        }}
      >
        {t("assistant.review")}
      </button>
      {(error || people.error || current.error) && (
        <p role="alert">
          {error || people.error?.message || current.error?.message}
          {current.error && (
            <button onClick={() => void current.refetch()}>
              {t("search.retry")}
            </button>
          )}
        </p>
      )}
      {plan?.kind === "s21-person" && plan.people.length > 1 && (
        <section className="card stack">
          <h3>{t("assistant.choosePublisher")}</h3>
          <p>{t("assistant.ambiguous")}</p>
          {plan.people.map((person) => (
            <button
              key={person.id}
              disabled={busy}
              onClick={() => void download(person.id)}
            >
              {t("assistant.downloadPerson")} {person.name}
            </button>
          ))}
        </section>
      )}
      {plan?.kind === "attendance" && (
        <section className="card stack">
          <h3>{t("assistant.attendanceReview")}</h3>
          <p>
            {meeting?.date} · {meeting?.kind} · {meeting?.timezone}
          </p>
          <p>
            {t("assistant.attendanceCount")} {plan.count}
            {meeting?.count != null ? ` (previously ${meeting.count})` : ""}
          </p>
          {!meeting?.canSubmit ||
          (plan.meeting && plan.meeting !== meeting?.kind) ? (
            <p role="alert">{t("assistant.noCurrentMeeting")}</p>
          ) : (
            <button disabled={busy} onClick={() => void confirm()}>
              {t("assistant.attendanceSave")}
            </button>
          )}
        </section>
      )}
      {plan?.kind === "s21-all" && (
        <section className="card">
          <h3>{t("assistant.exportTitle")}</h3>
          <p>{t("assistant.exportExplanation")}</p>
          <button onClick={() => void confirm()}>
            {t("assistant.openExport")}
          </button>
        </section>
      )}
      {plan?.kind === "report" && (
        <section className="card stack">
          <h3>{t("assistant.preview")}</h3>
          <PersonPicker
            label={t("s21.person")}
            value={publisher}
            onChange={setPublisher}
            people={plan.people}
          />
          <dl>
            <dt>{t("assistant.period")}</dt>
            <dd>{plan.period}</dd>
            <dt>{t("home.hours")}</dt>
            <dd>{plan.hours}</dd>
            <dt>{t("home.studies")}</dt>
            <dd>{plan.studies}</dd>
          </dl>
          <p>{t("assistant.participation")}</p>
          {current.data && (
            <p>
              {t("assistant.previous")}: {current.data.hours} {t("home.hours")}{" "}
              · {current.data.studies || 0} {t("home.studies")}
            </p>
          )}
          <button
            disabled={
              !publisher || busy || current.isPending || !!current.error
            }
            onClick={() => void confirm()}
          >
            {t(current.data ? "assistant.update" : "assistant.confirm")}
          </button>
        </section>
      )}
    </div>
  );
}
