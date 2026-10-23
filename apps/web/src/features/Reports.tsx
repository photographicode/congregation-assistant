import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import {
  keepReportDraft,
  loadReportDraft,
  clearReportDraft,
  offlineReportMessage,
  offlineUnstoredMessage,
} from "../../../../packages/core/report-draft";
import { Toast } from "../../../../packages/ui/Notices";
import {
  ServiceReportFields,
  ReportReceipt,
} from "../../../../packages/ui/ServiceReportFields";
import { S21Button } from "./S21Button";
import React from "react";
import { useDemoReports } from "./demo-reports";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import {
  isSFTS,
  sftsTotals,
  type Publisher,
} from "../../../../packages/core/publisher-selection";
import { t } from "../../../../packages/core/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseDelimited } from "./model.mjs";
import { csvRecords } from "./export.mjs";
import {
  reportTotals,
  reportDraft,
  reportPayload,
  annualReportMonths,
  reviewReportImport,
} from "./report-model.mjs";
import { storeFor, demo } from "./client";
import {
  repositories,
  type Report,
} from "../../../../packages/core/repositories";
import type { Context } from "../context";
import { Dialog } from "../../../../packages/ui/Dialog";
function reportingPeriod(date: Date) {
  const month = date.getMonth();
  return { month, year: date.getFullYear() + (month >= 8 ? 1 : 0) };
}
const sample = demoPublishers;
export function Reports({ context: c }: { context: Context }) {
  const local = useDemoReports((s) => s.rows),
    setLocal = useDemoReports((s) => s.update);
  const repo = React.useMemo(
    () => repositories(storeFor(c.cong, c.roles), c.cong, demo),
    [c.cong],
  );
  const cache = useQueryClient();
  const personal =
    c.roles.includes("publisher") &&
    !c.roles.some((role) =>
      ["admin", "field_service", "group_overseer"].includes(role),
    );
  const canWrite = c.roles.some((r) =>
    ["admin", "field_service", "group_overseer"].includes(r),
  );
  const canService = c.roles.some((r) =>
    ["admin", "field_service", "group_overseer", "publisher"].includes(r),
  );
  const canAttendance = c.roles.some((r) =>
    ["admin", "attendance"].includes(r),
  );
  const apManager = c.roles.some((r) => ["admin", "field_service"].includes(r));
  const groupWriter =
    c.roles.includes("group_overseer") &&
    !c.roles.some((r) => ["admin", "field_service"].includes(r));
  const [revokeTarget, setRevokeTarget] = React.useState<Report | null>(null),
    [apError, setAPError] = React.useState("");
  const revoking = React.useRef(false);
  const [apUndo, setAPUndo] = React.useState<{
      id: string;
      row: Report;
      deadline: number;
    } | null>(null),
    [undoExpired, setUndoExpired] = React.useState(false);
  React.useEffect(() => {
    if (!apUndo) return;
    setUndoExpired(false);
    const timer = setTimeout(
      () => setUndoExpired(true),
      Math.max(0, apUndo.deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [apUndo]);
  const [closeReport, setCloseReport] = React.useState(false),
    [receipt, setReceipt] = React.useState<"confirmed" | "pending" | null>(
      null,
    ),
    [reportDirty, setReportDirty] = React.useState(false);
  const saving = React.useRef(false),
    pendingNavigation = React.useRef<null | (() => void)>(null);

  const [reportGroup, setReportGroup] = React.useState<
    "all" | "regular" | "sfts"
  >("all");
  const [bulk, setBulk] = React.useState(false),
    [bulkRows, setBulkRows] = React.useState<any[]>([]),
    [bulkFilter, setBulkFilter] = React.useState(""),
    [bulkLimit, setBulkLimit] = React.useState(25),
    [annualOpen, setAnnualOpen] = React.useState(false);
  const launch = React.useMemo(() => {
    try {
      const value = JSON.parse(
        sessionStorage.getItem("ca-report-action") || "null",
      );
      return value &&
        typeof value === "object" &&
        ["bulk", "review", "attendance", "annual", "service", "entry"].includes(
          value.action,
        )
        ? {
            action: String(value.action),
            period:
              typeof value.period === "string" &&
              /^\d{4}-\d{2}$/.test(value.period)
                ? value.period
                : undefined,
          }
        : null;
    } catch {
      return null;
    }
  }, []);
  React.useEffect(() => {
    sessionStorage.removeItem("ca-report-action");
    if (launch?.action === "annual") setAnnualOpen(true);
  }, []);
  const initial = new Date();
  initial.setDate(1);
  initial.setMonth(initial.getMonth() - 1);
  const [period, setPeriod] = React.useState(
      launch?.period ||
        `${initial.getFullYear()}-${String(initial.getMonth() + 1).padStart(2, "0")}`,
    ),
    [tab, setTab] = React.useState(
      canAttendance && (launch?.action === "attendance" || !canService)
        ? "attendance"
        : "service",
    ),
    [editing, setEditing] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [person, setPerson] = React.useState(""),
    [form, setForm] = React.useState({
      shared: true,
      studies: 0,
      hours: 0,
      comments: "",
      auxiliary: false,
    }),
    [counts, setCounts] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      const entry = document.querySelector<HTMLFormElement>(
        ".service-report-form",
      );
      entry?.scrollIntoView({ block: "start" });
      entry
        ?.querySelector<HTMLElement>("select,input")
        ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);
  React.useEffect(() => {
    if (!editing || !reportDirty) return;
    const leave = (event: Event) => {
      event.preventDefault();
      pendingNavigation.current = (event as CustomEvent<() => void>).detail;
      setCloseReport(true);
    };
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("ca:before-navigate", leave);
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("ca:before-navigate", leave);
      window.removeEventListener("beforeunload", unload);
    };
  }, [editing, reportDirty]);
  const [y, m] = period.split("-").map(Number);
  const month = m - 1,
    year = y + (month >= 8 ? 1 : 0);
  const reportScope =
    "private:" +
    c.account +
    ":" +
    c.cong +
    ":" +
    person +
    ":" +
    year +
    ":" +
    month;
  React.useEffect(() => {
    if (!editing || !person || reportDirty) return;
    let active = true;
    void loadReportDraft(reportScope).then((draft) => {
      if (active && draft) {
        setForm(draft);
        setReportDirty(true);
      }
    });
    return () => {
      active = false;
    };
  }, [editing, person, period]);
  const people = useQuery({
    queryKey: ["report-people", c.cong, personal],
    queryFn: () => (personal ? repo.reports.family() : repo.people.list()),
    enabled: !demo && canService,
  });
  const rows = useQuery({
    queryKey: ["reports", c.cong, year, month],
    queryFn: () => repo.reports.list(year, month),
    enabled: !demo && !personal && canService && tab === "service",
  });
  const own = useQuery({
    queryKey: ["own-report", c.cong, person],
    queryFn: () => repo.reports.own(person),
    enabled: !demo && personal && !!person,
  });
  const annual = useQuery({
    queryKey: ["annual-reports", c.cong, year],
    queryFn: () => repo.reports.year(year),
    enabled: !demo && !personal && canService && annualOpen,
  });
  const attendance = useQuery({
    queryKey: ["attendance", c.cong, year, month],
    queryFn: () => repo.attendance.list(year, month),
    enabled: !demo && canAttendance && tab === "attendance",
  });
  React.useEffect(() => {
    if (attendance.data?.[0])
      setCounts(
        Object.fromEntries(
          Object.entries(attendance.data[0])
            .filter(([k]) => /^w[1-5]_(mid|end)$/.test(k))
            .map(([k, v]) => [k, String(v ?? "")]),
        ),
      );
    else setCounts({});
  }, [attendance.data, period]);
  React.useEffect(() => {
    const r = own.data?.report.record as any;
    if (r && !reportDirty)
      setForm({
        shared: !!r.shared,
        studies: r.studies || 0,
        hours: Number(r.hours) || 0,
        comments: r.comments || "",
        auxiliary: !!r.auxiliaryPioneer,
      });
  }, [own.data]);
  const allPersons: (Publisher & { service_group?: string | null })[] = demo
      ? (personal || groupWriter ? sample.slice(0, 2) : sample).map((p) => ({
          ...p,
          service_group: p.group,
        }))
      : people.data || [],
    persons = allPersons.filter(
      (p) =>
        reportGroup === "all" || (reportGroup === "sfts" ? isSFTS(p) : p.is_rp),
    ),
    reports = (demo ? local : rows.data || []).filter((r) =>
      persons.some((p) => p.id === r.pub_id),
    );
  React.useEffect(() => {
    if (launch?.action === "bulk" && canWrite && (demo || people.isSuccess)) {
      setBulkRows(
        persons.map((p) =>
          reportDraft(
            p,
            submitted.find((r) => r.pub_id === p.id),
          ),
        ),
      );
      setBulk(true);
    }
  }, [people.isSuccess]);
  React.useEffect(() => {
    const open = (event: Event) => {
      const destination = (event as CustomEvent).detail;
      if (destination === "attendance" && canAttendance) setTab("attendance");
      else if (destination === "service" && canService) setTab("service");
      else if (destination === "annual" && canService) {
        setTab("service");
        setAnnualOpen(true);
      }
    };
    window.addEventListener("ca:open-tool", open);
    return () => window.removeEventListener("ca:open-tool", open);
  }, [canAttendance, canService]);
  React.useEffect(() => {
    if (launch?.action === "entry" && (demo || people.isSuccess)) {
      setPerson(persons[0]?.id || "");
      setReceipt(null);
      setReportDirty(false);
      setError("");
      setEditing(true);
    }
    const quick = (event: Event) => {
      if ((event as CustomEvent).detail === "entry" && (canWrite || personal)) {
        setForm(valuesFor(persons[0]?.id || ""));
        setPerson(persons[0]?.id || "");
        setReceipt(null);
        setReportDirty(false);
        setError("");
        setEditing(true);
      }
    };
    window.addEventListener("ca:quick-action", quick);
    return () => window.removeEventListener("ca:quick-action", quick);
  }, [people.isSuccess, canWrite, personal]);
  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      if (!person) throw Error("Choose a publisher.");
      if (!demo && !navigator.onLine) {
        const kept = await keepReportDraft(reportScope, form);
        throw Error(kept ? offlineReportMessage : offlineUnstoredMessage);
      }
      const row = reportPayload(
        {
          pub_id: person,
          shared_in_ministry: form.shared,
          studies: form.studies,
          hours: form.hours,
          comments: form.comments,
          is_ap: form.auxiliary,
        },
        c.cong,
        year,
        month,
        crypto.randomUUID(),
      );
      if (demo)
        setLocal((old) => [
          ...old.filter(
            (r) =>
              !(
                r.pub_id === person &&
                r.service_year === year &&
                r.month === month
              ),
          ),
          row,
        ]);
      else if (personal) {
        if (!own.data)
          throw Error("Wait for the current reporting period to load.");
        await repo.reports.submit({
          p_publisher_id: person,
          p_shared: form.shared,
          p_studies: form.studies,
          p_hours: form.hours,
          p_comments: form.comments,
          p_expected: {
            period: own.data.report.period,
            record: own.data.report.record,
          },
        });
      } else if (groupWriter) await repo.reports.groupSave(year, month, [row]);
      else await repo.reports.save([row]);
      await cache.invalidateQueries({
        queryKey: personal ? ["own-report"] : ["reports"],
      });
      await cache.invalidateQueries({ queryKey: ["annual-reports"] });
      await clearReportDraft(reportScope);
      setReceipt("confirmed");
      setReportDirty(false);
      c.notify("Report saved.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function invalidateReports() {
    await Promise.all(
      ["reports", "annual-reports", "home-group-links", "pdf-data"].map((key) =>
        cache.invalidateQueries({ queryKey: [key] }),
      ),
    );
  }
  async function revokeAP() {
    if (!revokeTarget || revoking.current || !apManager) return;
    revoking.current = true;
    setBusy(true);
    setAPError("");
    try {
      const row = revokeTarget,
        started = Date.now();
      let id = "demo",
        remaining = 10000;
      if (demo)
        setLocal((old) =>
          old.map((r) => (r.id === row.id ? { ...r, is_ap: false } : r)),
        );
      else {
        const result = await repo.reports.revokeAP(row);
        id = result.actionId;
        remaining = Math.max(
          0,
          Math.min(
            10000,
            Date.parse(result.expiresAt) - Date.parse(result.serverTime),
          ),
        );
      }
      setAPUndo({ id, row, deadline: started + remaining });
      setRevokeTarget(null);
      await invalidateReports();
    } catch (e) {
      setAPError((e as Error).message);
    } finally {
      revoking.current = false;
      setBusy(false);
    }
  }
  async function undoAP() {
    if (!apUndo || revoking.current || !apManager) return;
    revoking.current = true;
    setBusy(true);
    setAPError("");
    try {
      if (Date.now() > apUndo.deadline) throw Error(t("refine.apUndoExpired"));
      if (demo) {
        const current = local.find((r) => r.id === apUndo.row.id);
        if (
          !current ||
          JSON.stringify(current) !==
            JSON.stringify({ ...apUndo.row, is_ap: false })
        )
          throw Error(t("refine.apChanged"));
        setLocal((old) =>
          old.map((r) => (r.id === apUndo.row.id ? apUndo.row : r)),
        );
      } else await repo.reports.undoAP(apUndo.id);
      setAPUndo(null);
      await invalidateReports();
      c.notify(t("refine.apRestored"));
    } catch (e) {
      setAPError((e as Error).message);
    } finally {
      revoking.current = false;
      setBusy(false);
    }
  }
  async function saveBulk() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const selected = bulkRows.filter((row) => row.include);
      if (selected.some((row) => row.errors?.length))
        throw Error("Fix or exclude rows with import errors before saving.");
      if (!selected.length)
        throw Error("Select at least one publisher’s report to save.");
      if (groupWriter && selected.length > 250)
        throw Error("Save up to 250 assigned-group reports at a time.");
      const payload = selected.map((row) =>
        reportPayload(row, c.cong, year, month, crypto.randomUUID()),
      );
      if (demo)
        setLocal((old) => [
          ...old.filter(
            (r) =>
              !payload.some(
                (row) =>
                  row.pub_id === r.pub_id &&
                  row.service_year === r.service_year &&
                  row.month === r.month,
              ),
          ),
          ...payload,
        ]);
      else if (groupWriter) await repo.reports.groupSave(year, month, payload);
      else await repo.reports.save(payload);
      await cache.invalidateQueries({ queryKey: ["reports"] });
      await cache.invalidateQueries({ queryKey: ["annual-reports"] });
      setBulk(false);
      c.notify(
        payload.length +
          " report" +
          (payload.length === 1 ? "" : "s") +
          " saved.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function exportCSV(values: any[], name: string) {
    const url = URL.createObjectURL(
        new Blob([csvRecords(values)], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const submitted = reports.filter(
      (r) => r.service_year === year && r.month === month,
    ),
    missing = persons.filter((p) => !submitted.some((r) => r.pub_id === p.id));
  const monthlyAP = (demo ? local : rows.data || []).filter(
    (row) =>
      row.service_year === year &&
      row.month === month &&
      row.is_ap &&
      allPersons.some((person) => person.id === row.pub_id),
  );
  function valuesFor(id: string) {
    if (personal && id === person && own.data?.report.record) {
      const r = own.data.report.record as any;
      return {
        shared: !!r.shared,
        studies: r.studies || 0,
        hours: Number(r.hours) || 0,
        comments: r.comments || "",
        auxiliary: !!r.auxiliaryPioneer,
      };
    }
    const r = submitted.find((row) => row.pub_id === id);
    return r
      ? {
          shared: !!r.shared_in_ministry,
          studies: r.studies || 0,
          hours: Number(r.hours) || 0,
          comments: r.comments || "",
          auxiliary: !!r.is_ap,
        }
      : { shared: true, studies: 0, hours: 0, comments: "", auxiliary: false };
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("ui.reports.dacca3cb")}</div>
          <h1>{t("ui.keep.reporting.simple.121c40d1")}</h1>
        </div>
        {!personal && (
          <label>
            {t("ui.reporting.month.04bf8d83")}
            <input
              type="month"
              required
              disabled={editing || busy}
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setRevokeTarget(null);
                setAPError("");
                setError("");
              }}
            />
          </label>
        )}
      </div>
      {!personal && canService && tab === "service" && (
        <div className="ui-field">
          
          <LegacySelect
            disabled={editing || busy}
            value={reportGroup}
            onChange={(e) =>
              setReportGroup(e.target.value as "all" | "regular" | "sfts")
            } aria-label={t("sfts.filter")}
          >
            <option value="all">{t("sfts.all")}</option>
            <option value="regular">{t("sfts.rp")}</option>
            {allPersons.some(isSFTS) && (
              <option value="sfts">{t("sfts.name")}</option>
            )}
          </LegacySelect>
        </div>
      )}
      {reportGroup === "sfts" && tab === "service" && (
        <section className="card">
          <h2>{t("sfts.summary")}</h2>
          <p>
            {(() => {
              const totals = sftsTotals(
                allPersons,
                demo ? local : rows.data || [],
                period,
              );
              return `${totals.submitted}/${totals.publishers} · ${totals.hours} ${t("home.hours")} · ${totals.studies} ${t("home.studies")}`;
            })()}
          </p>
        </section>
      )}
      {canAttendance && (
        <div className="segmented">
          {(canService ? ["service", "attendance"] : ["attendance"]).map(
            (t) => (
              <Button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)} type="button"
              >
                {t === "service" ? "Service reports" : "Attendance"}
              </Button>
            ),
          )}
        </div>
      )}
      {(error ||
        people.error ||
        rows.error ||
        own.error ||
        attendance.error) && (
        <p role="alert" className="banner">
          {error ||
            (people.error || rows.error || own.error || attendance.error)
              ?.message}
        </p>
      )}
      {tab === "attendance" ? (
        <section className="card stack">
          <h2>{t("ui.weekly.meeting.counts.ee13db25")}</h2>
          {[1, 2, 3, 4, 5].map((w) => (
            <div className="form-grid" key={w}>
              {["mid", "end"].map((kind) => (
                <label key={kind}>
                  {t("ui.week.88fb6def")}
                  {w} · {kind === "mid" ? "Midweek" : "Weekend"}
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    value={counts[`w${w}_${kind}`] || ""}
                    onChange={(e) =>
                      setCounts({
                        ...counts,
                        [`w${w}_${kind}`]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ))}
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                if (!demo)
                  await repo.attendance.save({
                    id: `${c.cong}_${year}_${month}`,
                    service_year: year,
                    month,
                    ...counts,
                  });
                c.notify("Attendance saved.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }} type="button"
          >
            {t("ui.save.attendance.15e51ffc")}
          </Button>
          <Button onClick={() => window.print()} type="button">
            {t("ui.print.attendance.2d133c42")}
          </Button>
        </section>
      ) : (
        <>
          <div className="grid">
            <section className="card">
              <h2>{personal ? "Household reports" : "Monthly submissions"}</h2>
              <p>
                {personal
                  ? t("refine.linkedIntro")
                  : `${submitted.length} submitted · ${missing.length} missing`}
              </p>
              {!personal && (
                <p>
                  {submitted.reduce((sum, r) => sum + (r.studies || 0), 0)}{" "}
                  {t("ui.bible.studies.1e5a8cd0")}
                  {submitted.reduce((sum, r) => sum + Number(r.hours), 0)}{" "}
                  {t("ui.hours.404314b1")}
                </p>
              )}
              {(canWrite || personal) && (
                <Button
                  className="primary"
                  disabled={editing || busy}
                  onClick={() => {
                    setReceipt(null);
                    setReportDirty(false);
                    setError("");
                    setEditing(true);
                    setPerson(persons[0]?.id || "");
                    setForm(valuesFor(persons[0]?.id || ""));
                  }} type="button"
                >
                  {t("ui.enter.report.63ad9d6b")}
                </Button>
              )}
            </section>
            <section className="card">
              <h2>{personal ? "My report" : "Missing reports"}</h2>
              {personal ? (
                <p>
                  {own.data?.report.submitted
                    ? "Submitted. You can review and correct your report."
                    : "Choose a publisher to submit or review their report."}
                </p>
              ) : (
                <div className="list">
                  {missing.map((p) => (
                    <div className="list-row" key={p.id}>
                      {p.name}
                      <S21Button context={c} person={{ ...p }} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="card" style={{ marginTop: "1.25rem" }}>
            <h2>{personal ? "Linked publishers" : "Submitted reports"}</h2>
            <div className="list">
              {personal
                ? persons.map((p) => (
                    <div className="list-row" key={p.id}>
                      <strong>{p.name}</strong>
                      <Button
                        disabled={editing || busy}
                        onClick={() => {
                          setPerson(p.id);
                          setReceipt(null);
                          setReportDirty(false);
                          setError("");
                          setEditing(true);
                        }} type="button"
                      >
                        {t("ui.review.report.d515fdd2")}
                      </Button>
                    </div>
                  ))
                : submitted.map((r) => (
                    <div className="list-row" key={r.id}>
                      <div>
                        <strong>
                          {persons.find((p) => p.id === r.pub_id)?.name ||
                            "Publisher"}
                        </strong>
                        <p>
                          {r.shared_in_ministry
                            ? t("report.shared")
                            : t("report.didNotShare")}
                          {" · "}
                          <span className="report-metric">
                            {r.studies || 0} {t("units.studies")}
                          </span>
                          {" · "}
                          <span className="report-metric">
                            {r.hours} {t("units.hours")}
                          </span>
                        </p>
                        {r.is_ap && (
                          <span className="chip">{t("refine.apStatus")}</span>
                        )}
                        <p>{r.comments}</p>
                      </div>
                      {canWrite && (
                        <Button
                          disabled={editing || busy}
                          onClick={() => {
                            setPerson(r.pub_id);
                            setForm({
                              shared: !!r.shared_in_ministry,
                              studies: r.studies || 0,
                              hours: r.hours,
                              comments: r.comments || "",
                              auxiliary: !!r.is_ap,
                            });
                            setReceipt(null);
                            setReportDirty(false);
                            setError("");
                            setEditing(true);
                          }} type="button"
                        >
                          {t("ui.edit.report.b81811d5")}
                        </Button>
                      )}
                    </div>
                  ))}
            </div>
            <Button onClick={() => window.print()} type="button">
              {t("ui.print.monthly.roster.103bec84")}
            </Button>
          </section>
        </>
      )}
      {apManager && tab === "service" && (
        <section className="card stack" aria-label={t("refine.apReview")}>
          <h2>{t("refine.apTitle")}</h2>
          <p>{t("refine.apSubtitle")}</p>
          <p>
            <strong>
              {t("ui.reporting.month.c996f10c")}
              {period}
            </strong>
          </p>
          <p>{t("refine.retain")}</p>
          <p>
            {monthlyAP.length} {t("ui.auxiliary.pioneers.a250aa99")}
            {monthlyAP.reduce((sum, r) => sum + Number(r.hours), 0)}{" "}
            {t("ui.hours.0227f1a3")}
            {monthlyAP.reduce((sum, r) => sum + (r.studies || 0), 0)}{" "}
            {t("ui.studies.48d492d0")}
          </p>
          <div className="ap-review-list">
            <div className="ap-review-head" aria-hidden="true">
              <strong>{t("refine.publisher")}</strong>
              <strong>{t("refine.hours")}</strong>
              <strong>{t("refine.studies")}</strong>
              <strong>{t("refine.adminAction")}</strong>
            </div>
            {monthlyAP.map((row) => (
              <article className="ap-review-row" key={row.id}>
                <div>
                  <strong>
                    {allPersons.find((p) => p.id === row.pub_id)?.name ||
                      t("refine.publisher")}
                  </strong>
                  <p>
                    {allPersons.find((p) => p.id === row.pub_id)
                      ?.service_group || ""}
                  </p>
                </div>
                <div className="ap-review-number">
                  <span className="ap-review-mobile-label">
                    {t("refine.hours")}
                  </span>
                  {row.hours}
                </div>
                <div className="ap-review-number">
                  <span className="ap-review-mobile-label">
                    {t("refine.studies")}
                  </span>
                  {row.studies || 0}
                </div>
                <div>
                  <span className="ap-review-mobile-label">
                    {t("refine.adminAction")}
                  </span>
                  <Button
                    disabled={busy || editing}
                    onClick={() => {
                      c.notify("");
                      setError("");
                      setAPError("");
                      setRevokeTarget(row);
                    }}
                    aria-label={
                      t("refine.revokeAPFor") +
                      (allPersons.find((p) => p.id === row.pub_id)?.name ||
                        t("refine.publisher"))
                    } type="button"
                  >
                    {t("refine.revoke")}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!monthlyAP.length && <p>{t("refine.noAP")}</p>}
          {apUndo && (
            <Toast
              key={apUndo.id + apUndo.deadline}
              className="banner"
              duration={10000}
              message={t("refine.apRevoked")}
              onClose={() => setAPUndo(null)}
            >
              {!undoExpired && (
                <Button disabled={busy} onClick={() => void undoAP()} type="button">
                  {t("common.undo")}
                </Button>
              )}
              {undoExpired && <span>{t("refine.apUndoExpired")}</span>}
            </Toast>
          )}
          {apError && (
            <p role="alert" className="error">
              {apError}
            </p>
          )}
          {busy && revoking.current && (
            <p role="status">{t("refine.apPending")}</p>
          )}
          {revokeTarget && (
            <section
              className="banner stack"
              aria-label={t("ui.confirm.ap.revocation.d97a3f2d")}
            >
              <p>{t("refine.confirmAPQuestion")}</p>
              <p>
                <strong>
                  {allPersons.find((p) => p.id === revokeTarget.pub_id)?.name}
                </strong>{" "}
                · {period}
              </p>
              <p>{t("refine.retain")}</p>
              <div className="actions">
                <Button
                  disabled={busy}
                  className="danger"
                  onClick={() => void revokeAP()} type="button"
                >
                  {busy ? t("refine.revoking") : t("refine.confirmAP")}
                </Button>
                <Button onClick={() => setRevokeTarget(null)} type="button">
                  {busy ? t("common.close") : t("refine.keepAP")}
                </Button>
              </div>
            </section>
          )}
        </section>
      )}
      {!personal && tab === "service" && (
        <section className="card stack">
          <Disclosure>
            <DisclosureLabel>{t("ui.month.tools.9e7446f2")}</DisclosureLabel>
            <div className="actions">
              {canWrite && (
                <Button
                  onClick={() => {
                    setError("");
                    setBulkRows(
                      persons.map((p) =>
                        reportDraft(
                          p,
                          submitted.find((r) => r.pub_id === p.id),
                        ),
                      ),
                    );
                    setBulkFilter("");
                    setBulkLimit(25);
                    setBulk(true);
                  }} type="button"
                >
                  {t("ui.enter.several.reports.d52f2dc2")}
                </Button>
              )}
              {canWrite && (
                <>
                  <label>
                    {t("ui.import.report.csv.7e6296d0")}
                    <input
                      type="file"
                      accept=".csv,.tsv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void (async () => {
                          try {
                            if (file.size > 8 * 1024 * 1024)
                              throw Error(
                                "Choose a report file smaller than 8 MB.",
                              );
                            const reviewed = reviewReportImport(
                              parseDelimited(await file.text()),
                              persons,
                              period,
                              year,
                              month,
                            );
                            if (!reviewed.length)
                              throw Error(
                                "The file has no report rows. Download the template first.",
                              );
                            setBulkRows(reviewed);
                            setBulkFilter("");
                            setBulkLimit(25);
                            setError("");
                            setBulk(true);
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        })();
                      }}
                    />
                  </label>
                  <Button
                    onClick={() =>
                      exportCSV(
                        [
                          {
                            publisher_id: persons[0]?.id || "",
                            publisher_name:
                              persons[0]?.name || "Fictional Publisher",
                            reporting_month: period,
                            shared_in_ministry: "Yes",
                            studies: 0,
                            hours: 0,
                            is_ap: "No",
                            comments: "",
                          },
                        ],
                        "report-template.csv",
                      )
                    } type="button"
                  >
                    {t("ui.download.report.template.b3244755")}
                  </Button>
                </>
              )}
              <Button
                onClick={() =>
                  exportCSV(
                    submitted.map((r) => ({
                      ...r,
                      reporting_month: period,
                      name: persons.find((p) => p.id === r.pub_id)?.name || "",
                    })),
                    "reports-" + period + ".csv",
                  )
                } type="button"
              >
                {t("ui.download.month.csv.88a02790")}
              </Button>
              <Button
                onClick={() =>
                  exportCSV(
                    missing.map((p) => ({ name: p.name, id: p.id })),
                    "missing-" + period + ".csv",
                  )
                } type="button"
              >
                {t("ui.download.missing.list.f112f557")}
              </Button>
            </div>
          </Disclosure>
          <Disclosure open={annualOpen}>
            <DisclosureLabel>
              {t("ui.service.year.totals.pioneer.logs.5912ad86")}
            </DisclosureLabel>
            {annual.error ? (
              <p role="alert">
                {t("ui.annual.records.could.not.load.6eee18a8")}
                <Button onClick={() => void annual.refetch()} type="button">
                  {t("ui.retry.942087cc")}
                </Button>
              </p>
            ) : (
              <div className="stack">
                <div className="list">
                  {annualReportMonths(demo ? local : annual.data || []).map(
                    (row) => (
                      <article className="list-row" key={row.month}>
                        <div>
                          <strong>
                            {new Intl.DateTimeFormat("en", {
                              month: "long",
                            }).format(new Date(2000, row.month, 1))}
                          </strong>
                          <p>
                            {row.submitted} {t("ui.submitted.1202e3f2")}
                            {row.shared} {t("ui.shared.bb9befd1")}
                            {row.studies} {t("ui.studies.873d50da")}
                            {row.hours} {t("ui.hours.0227f1a3")}
                            {row.auxiliary} {t("ui.auxiliary.49143cc8")}
                          </p>
                        </div>
                      </article>
                    ),
                  )}
                </div>
                <Disclosure>
                  <DisclosureLabel>
                    {t("ui.individual.pioneer.logs.b8cc9c8d")}
                  </DisclosureLabel>
                  <div className="stack">
                    {persons
                      .filter(
                        (p) =>
                          p.is_rp ||
                          isSFTS(p) ||
                          (demo ? local : annual.data || []).some(
                            (r) => r.pub_id === p.id && r.is_ap,
                          ),
                      )
                      .map((p) => (
                        <Disclosure key={p.id}>
                          <DisclosureLabel>{p.name}</DisclosureLabel>
                          <div className="list">
                            {[8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7].map((m) => {
                              const r = (demo ? local : annual.data || []).find(
                                (r) =>
                                  r.pub_id === p.id &&
                                  r.month === m &&
                                  r.service_year === year,
                              );
                              return (
                                <div className="list-row" key={m}>
                                  <strong>
                                    {new Intl.DateTimeFormat("en", {
                                      month: "long",
                                    }).format(new Date(2000, m, 1))}
                                  </strong>
                                  <span>
                                    {r
                                      ? `${r.hours} hours${r.is_ap ? " · auxiliary" : ""}`
                                      : "Not submitted"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </Disclosure>
                      ))}
                    {!persons.some(
                      (p) =>
                        p.is_rp ||
                        isSFTS(p) ||
                        (demo ? local : annual.data || []).some(
                          (r) => r.pub_id === p.id && r.is_ap,
                        ),
                    ) && (
                      <p>
                        {t(
                          "ui.no.pioneer.entries.appear.in.this.service..d25e46e9",
                        )}
                      </p>
                    )}
                  </div>
                </Disclosure>
                <p>
                  {t("ui.regular.special.pioneer.and.field.missiona.22b2d7a9")}
                </p>
                <Button
                  onClick={() =>
                    exportCSV(
                      (demo ? local : annual.data || []).map((r) => ({
                        ...r,
                        name:
                          persons.find((p) => p.id === r.pub_id)?.name || "",
                      })),
                      "service-year-" + year + ".csv",
                    )
                  } type="button"
                >
                  {t("ui.download.service.year.csv.08f82185")}
                </Button>
              </div>
            )}
          </Disclosure>
        </section>
      )}
      <Dialog
        open={bulk}
        onClose={() => setBulk(false)}
        title={t("ui.enter.several.reports.d52f2dc2")}
        dirty={!busy && bulkRows.some((r) => r.include)}
      >
        {busy && <p role="status">{t("refine.busyLeave")}</p>}
        <fieldset
          className="stack report-fields"
          disabled={busy}
          aria-label={t("refine.monthlyActivity")}
        >
          <p>
            {period}
            {t("ui.only.selected.rows.are.saved.existing.repo.1c93e1a9")}
          </p>
          <label>
            {t("ui.find.a.publisher.b295f7a3")}
            <input
              value={bulkFilter}
              onChange={(e) => setBulkFilter(e.target.value)}
            />
          </label>
          {bulkRows
            .filter((r) =>
              r.name.toLowerCase().includes(bulkFilter.toLowerCase()),
            )
            .slice(0, bulkLimit)
            .map((row) => (
              <Disclosure key={row.pub_id}>
                <DisclosureLabel>
                  {row.name}
                  {row.include ? " · selected" : ""}
                </DisclosureLabel>
                <div className="stack">
                  {row.errors?.map((message: string) => (
                    <p className="error" key={message}>
                      {message}{" "}
                      {t(
                        "ui.exclude.this.row.and.correct.it.in.the.csv.9c6acada",
                      )}
                    </p>
                  ))}
                  {(
                    [
                      ["include", "Save this report"],
                      ["shared_in_ministry", "Shared in ministry"],
                      ["is_ap", "Auxiliary pioneer"],
                    ] as const
                  ).map(([key, label]) => (
                    <label className="check" key={key}>
                      <input
                        type="checkbox"
                        checked={row[key]}
                        onChange={(e) =>
                          setBulkRows((rows) =>
                            rows.map((r) =>
                              r.pub_id === row.pub_id
                                ? {
                                    ...r,
                                    [key]: e.target.checked,
                                    ...(key === "include"
                                      ? {}
                                      : { include: true }),
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <div className="form-grid">
                    {(["studies", "hours"] as const).map((key) => (
                      <label key={key}>
                        {key === "studies"
                          ? t("refine.studies")
                          : t("refine.hours")}
                        <input
                          type="number"
                          min={0}
                          max={key === "studies" ? 1000 : 744}
                          step={key === "hours" ? ".25" : "1"}
                          value={row[key]}
                          onChange={(e) =>
                            setBulkRows((rows) =>
                              rows.map((r) =>
                                r.pub_id === row.pub_id
                                  ? {
                                      ...r,
                                      [key]: Number(e.target.value),
                                      include: true,
                                    }
                                  : r,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    {t("refine.comments")}
                    <textarea
                      value={row.comments}
                      maxLength={4000}
                      onChange={(e) =>
                        setBulkRows((rows) =>
                          rows.map((r) =>
                            r.pub_id === row.pub_id
                              ? {
                                  ...r,
                                  comments: e.target.value,
                                  include: true,
                                }
                              : r,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </Disclosure>
            ))}
          {bulkRows.filter((r) =>
            r.name.toLowerCase().includes(bulkFilter.toLowerCase()),
          ).length > bulkLimit && (
            <Button onClick={() => setBulkLimit((n) => n + 25)} type="button">
              {t("ui.show.more.publishers.5d5de480")}
            </Button>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button
            className="primary"
            disabled={busy}
            onClick={() => void saveBulk()} type="button"
          >
            {t("ui.save.selected.reports.1c455ac2")}
          </Button>
        </fieldset>
      </Dialog>
      {editing && (
        <section
          className="card stack service-report-page"
          aria-label={t("ui.service.report.21254eb0")}
        >
          <div className="page-heading">
            <div>
              <div className="eyebrow">{t("refine.monthlyActivity")}</div>
              <h2>{t("refine.reportTitle")}</h2>
              <p>{t("refine.reportIntro")}</p>
            </div>
            <Button
              onClick={() => {
                if (reportDirty) {
                  pendingNavigation.current = null;
                  setCloseReport(true);
                } else {
                  setEditing(false);
                  setReceipt(null);
                }
              }} type="button"
            >
              {t("refine.cancelReport")}
            </Button>
          </div>
          {receipt ? (
            <ReportReceipt
              onDone={() => {
                setEditing(false);
                setReceipt(null);
              }}
              pending={receipt === "pending"}
              onAnother={() => {
                setReceipt(null);
                setPerson(persons.length === 1 ? (persons[0]?.id ?? "") : "");
                setForm({
                  shared: true,
                  studies: 0,
                  hours: 0,
                  comments: "",
                  auxiliary: false,
                });
                setError("");
              }}
            />
          ) : (
            <form
              className="stack service-report-form"
              aria-busy={busy}
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <fieldset
                className="stack report-fields"
                disabled={busy}
                aria-label={t("refine.reportTitle")}
              >
                <div className="ui-field">
                  
                  <LegacySelect
                    aria-label={t("ui.publisher.21378545")}
                    required
                    value={person}
                    onChange={(e) => {
                      const next = e.target.value;
                      const select = () => {
                        setPerson(next);
                        setEditing(true);
                        setForm(valuesFor(next));
                        setReportDirty(false);
                        setError("");
                      };
                      if (reportDirty) {
                        pendingNavigation.current = select;
                        setCloseReport(true);
                      } else select();
                    }}
                  >
                    <option value="">{t("refine.choosePublisher")}</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </LegacySelect>
                </div>
                <p>
                  <strong>
                    {t("ui.reporting.month.c996f10c")}
                    {personal && !demo
                      ? own.data?.report.period ||
                        "Loading current reporting month…"
                      : period}
                  </strong>
                </p>
                <ServiceReportFields
                  value={form}
                  onChange={(value) => {
                    setForm(value);
                    setReportDirty(true);
                  }}
                  canAP={canWrite}
                  commentLimit={500}
                />
                {error && <p role="alert">{error}</p>}
                <Button
                  className="primary"
                  disabled={busy || (!demo && personal && !own.data)} type="submit"
                >
                  {busy ? t("refine.submitting") : t("refine.submit")}
                </Button>
              </fieldset>
            </form>
          )}
        </section>
      )}
      <Dialog
        open={closeReport}
        onClose={() => {
          pendingNavigation.current = null;
          setCloseReport(false);
        }}
        title={t("refine.discardReport")}
      >
        <p>{busy ? t("refine.busyLeave") : t("refine.discardReportBody")}</p>
        <div className="actions">
          <Button
            onClick={() => {
              pendingNavigation.current = null;
              setCloseReport(false);
            }} type="button"
          >
            {t("ui.keep.editing.e76fd2ad")}
          </Button>
          <Button
            className="danger"
            onClick={() => {
              setCloseReport(false);
              setEditing(false);
              setReportDirty(false);
              setReceipt(null);
              const proceed = pendingNavigation.current;
              pendingNavigation.current = null;
              proceed?.();
            }} type="button"
          >
            {busy ? t("refine.leaveForm") : "Discard changes"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
