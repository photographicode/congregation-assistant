import {useRoute,useRouteField,clearRouteAction} from "../useRoute";
import {useScheduleWeek} from "../useScheduleWeek";
import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import {
  dutyRosterLines,
  type DutyWorkspace,
} from "../../../../packages/core/duty-roster";
import { missingReportMonths } from "../../../../packages/core/pdf-accuracy";
import { watchtowerWeek } from "./publication-data";
import React from "react";
import { format } from "date-fns";
import { programSchema } from "../../../../packages/core/meeting";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import {
  selectPublishers,
  unionPublishers,
  isSFTS,
  type PublisherGroup,
} from "../../../../packages/core/publisher-selection";
import { t } from "../../../../packages/core/i18n";
import { useQuery } from "@tanstack/react-query";
import { storeFor, demo, rpc } from "./client";
import { repositories } from "../../../../packages/core/repositories";
import {
  publisherRecord,
  reportRecord,
  families,
} from "../../../../packages/pdf/snapshot";
import { runPDF } from "./pdf-worker-client";
import { offerPDF, pdfName, deliverPDF } from "./pdf-download";
import type { Context } from "../context";
import { handleError } from "../../../../packages/core/errors";
import { preferenceStorage } from "../../../../packages/core/storage";

const documents:Array<[string,string]> = [
  ["s21", "S-21 publisher records"],
  ["s3", "S-3-E monthly attendance"],
  ["s88", "S-88-E yearly attendance"],
  ["emergency", "Emergency contacts"],
  ["midweek", "Midweek schedule"],
  ["weekend", "Weekend schedule"],
  ["duties", "Duty roster"],
];
const sample = demoPublishers;
export default function PdfStudio({ context: c }: { context: Context }) {
  const locationRoute=useRoute();
  const departments = ["av", "attendant", "cleaning"].filter(
    (role) => c.roles.includes("admin") || c.roles.includes(role),
  );
  const admin = c.roles.includes("admin"),
    people = admin || c.roles.includes("field_service"),
    attendance = admin || c.roles.includes("attendance"),
    schedule = admin || c.roles.includes("oclm"),
    weekend = admin || c.roles.includes("weekend");
  const available = documents.filter(([id]) =>
    id === "s21"
      ? people || c.roles.includes("group_overseer")
      : id === "emergency"
        ? people
        : ["s3", "s88"].includes(id)
          ? attendance
          : id === "weekend"
            ? weekend
            : id === "duties"
              ? departments.length > 0
              : schedule,
  );
  const [groups, setGroups] = React.useState<PublisherGroup[]>(["all"]),
    [missingMonths, setMissingMonths] = React.useState(3),
    [reportState, setReportState] = React.useState<"missing" | "no-activity">(
      "missing",
    ),
    [output, setOutput] = React.useState(() =>
      preferenceStorage.getItem("ca-s21-format") === "zip" ? "zip" : "merged",
    ),
    [, setZipBytes] = React.useState<Uint8Array | null>(null);
  const [scheduleWeek,setScheduleWeek]=useScheduleWeek();
  const [selectionGroup, setSelectionGroup] =
      React.useState<PublisherGroup>("all"),
    [individual, setIndividual] = React.useState("");
  const initialMonth=new Date();initialMonth.setDate(1);initialMonth.setMonth(initialMonth.getMonth()-1);
  const [selectionMonth,setSelectionMonth]=useRouteField("month",format(initialMonth,"yyyy-MM"));
  const savedKind=preferenceStorage.getItem("ca-pdf-kind")||"s21";
  const [requestedKind,setKind]=useRouteField("doc",savedKind);
  const kind=available.some(([id])=>id===requestedKind)?requestedKind:available[0]?.[0]||"s21";
  const [year, setYear] = React.useState(
      new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0),
    ),
    [month, setMonth] = React.useState(new Date().getMonth()),
    [demoScripts, setDemoScripts] = React.useState(false),
    [query, setQuery] = React.useState(""),
    [selected, setSelected] = React.useState<string[]>([]),
    [large, setLarge] = React.useState(false),
    [printLayout, setPrintLayout] = React.useState("list"),
    [busy, setBusy] = React.useState(false),
    [progress, setProgress] = React.useState(0),
    [error, setError] = React.useState(""),
    [, setBytes] = React.useState<Uint8Array | null>(null);
  const abort = React.useRef<AbortController | null>(null),
    repo = React.useMemo(
      () => repositories(storeFor(c.cong, c.roles), c.cong, demo),
      [c.cong],
    );
  const data = useQuery({
    queryKey: [
      "pdf-data",
      c.cong,
      kind,
      year,
      month,
      demoScripts,
      selectionMonth,
      selectionGroup,
      groups.join(","),
      scheduleWeek,
    ],
    queryFn: async () => {
      if (demo)
        return {
          publishers: [
            ...sample,
            ...(demoScripts
              ? [
                  "हिन्दी प्रकाशक",
                  "മലയാളം പ്രസാധകൻ",
                  "தமிழ் பிரஸ்தாபி",
                  "తెలుగు ప్రచారకుడు",
                  "ಕನ್ನಡ ಪ್ರಚಾರಕ",
                  "ગુજરાતી પ્રકાશક",
                  "বাংলা প্রকাশক",
                  "ਪੰਜਾਬੀ ਪ੍ਰਕਾਸ਼ਕ",
                ].map((name, i) => ({
                  id: "script-" + i,
                  name,
                  gender: "Male",
                }))
              : []),
          ].map(publisherRecord),
          reports: sample.flatMap((p) =>
            [year, year - 1].flatMap((reportYear) =>
              Array.from({ length: 12 }, (_, m) => ({
                id: p.id + reportYear + "-" + m,
                pubId: p.id,
                serviceYear: reportYear,
                month: m,
                hours: p.id === "anna" ? 30 : 0,
                studies: 2,
                isAP:
                  p.id === "maria" && m === Number(selectionMonth.slice(5)) - 1,
                sharedInMinistry: p.id !== "samuel",
              })),
            ),
          ),
          attendance: Array.from({ length: 24 }, (_, i) => ({
            id: `demo_${year - (i < 12 ? 1 : 0)}_${i % 12}`,
            service_year: year - (i < 12 ? 1 : 0),
            month: i % 12,
            w1_mid: "100",
            w1_end: "115",
          })),
          schedule:
            kind === "duties"
              ? {
                  departmentSections: [
                    {
                      heading: "Audio Video · " + scheduleWeek,
                      lines: ["Audio desk: Fictional Daniel"],
                    },
                  ],
                }
              : null,
          weekend: null,
        };
      if (["s21", "emergency"].includes(kind)) {
        const [publishers, reports] = await Promise.all([
          repo.people.list(),
          kind === "s21"
            ? Promise.all(
                [
                  ...new Set([
                    year,
                    ...(groups.some((group) =>
                      ["auxiliary", "inactive"].includes(group),
                    )
                      ? [
                          Number(selectionMonth.slice(0, 4)) +
                            (Number(selectionMonth.slice(5)) >= 9 ? 1 : 0),
                        ]
                      : []),
                    ...(groups.includes("inactive")
                      ? [
                          Number(selectionMonth.slice(0, 4)) +
                            (Number(selectionMonth.slice(5)) >= 9 ? 1 : 0) -
                            1,
                        ]
                      : []),
                  ]),
                ].map((y) => repo.reports.year(y)),
              ).then((rows) => rows.flat())
            : Promise.resolve([]),
        ]);
        return {
          publishers: publishers.map(publisherRecord),
          reports: reports.map(reportRecord),
          attendance: [],
          schedule: null,
          weekend: null,
        };
      }
      if (["s3", "s88"].includes(kind))
        return {
          publishers: [],
          reports: [],
          attendance: await repo.attendance.all(),
          schedule: null,
          weekend: null,
        };
      if (kind === "weekend") {
        const data = await rpc("ca_v2_get_weekend", {
          p_cong_id: c.cong,
          p_week: (() => {
            const d = new Date();
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })(),
        });
        const source = await watchtowerWeek(
          (() => {
            const d = new Date();
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })(),
        );
        return {
          publishers: [],
          reports: [],
          attendance: [],
          schedule: null,
          weekend: {
            ...data?.data,
            ...(source
              ? {
                  articleTitle: source.articleTitle,
                  watchtowerSongs: source.songs?.join(" · ") || "",
                }
              : {}),
          },
        };
      }
      if (kind === "duties") {
        const workspaces = await Promise.all(
          departments.map(async (department) => ({
            department,
            value: (await rpc("get_department_workspace", {
              p_cong_id: c.cong,
              p_department: department,
            })) as DutyWorkspace,
          })),
        );
        return {
          publishers: [],
          reports: [],
          attendance: [],
          schedule: {
            departmentSections: workspaces.map(({ department, value }) => ({
              heading: department + " · " + scheduleWeek,
              lines: dutyRosterLines(value, scheduleWeek),
            })),
          },
          weekend: null,
        };
      }
      return {
        publishers: [],
        reports: [],
        attendance: [],
        schedule: (await repo.schedules.get()).draft,
        weekend: null,
      };
    },
    enabled: available.length > 0,
  });
  React.useEffect(() => {
    setBytes(null);
    setSelected([]);
    try {
      preferenceStorage.setItem("ca-pdf-kind", kind);
    } catch (error) { handleError(error, {scope:"features/PdfStudio.tsx",severity:'warning'}); }
  }, [kind, year, month]);
  React.useEffect(() => () => abort.current?.abort(), []);
  React.useEffect(
    () => setBytes(null),
    [selected, query, printLayout, large, data.data],
  );
  React.useEffect(() => {
    setSelected([]);
    setBytes(null);
    setZipBytes(null);
  }, [
    selectionGroup,
    selectionMonth,
    individual,
    groups,
    missingMonths,
    reportState,
  ]);
  React.useEffect(() => {
    if(!locationRoute.person)return;
    setSelectionGroup("individual");setGroups(["individual"]);setSelected([]);setIndividual(locationRoute.person);
  }, [locationRoute.person]);
  React.useEffect(()=>{
    if(locationRoute.action!=="export")return;
    setSelectionGroup("all");setGroups(["all"]);setSelected([]);setQuery("");setIndividual("");
    clearRouteAction("export");
  },[locationRoute.action]);
  const eligible =
    kind === "s21"
      ? unionPublishers(
          data.data?.publishers || [],
          data.data?.reports || [],
          groups,
          {
            period: selectionMonth,
            individual,
            months: missingMonths,
            reportState,
          },
        )
      : data.data?.publishers || [];
  const filtered = eligible.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase()),
    ),
    chosen = selected.length
      ? filtered.filter((p) => selected.includes(p.id))
      : filtered;
  async function generate(action: "download" | "print" | "share" = "download") {
    if (!data.data) return;
    setBusy(true);
    setError("");
    setProgress(0);
    abort.current = new AbortController();
    try {
      const snapshot = { ...data.data, id: c.cong, name: c.name };
      const engine = (method:string,...args:unknown[]) => runPDF(method,snapshot,args,{signal:abort.current!.signal,onProgress:setProgress});
      let result;
      if (kind === "s21") {
        if (!chosen.length)
          throw Error(
            "Add a publisher or change your search before exporting.",
          );
        if (output === "zip" && action === "download") {
          result = await runPDF("s21Zip", snapshot, [chosen, year], {
            signal: abort.current.signal,
            onProgress: setProgress,
          });
          setZipBytes(result);
          if (action === "download")
            offerPDF(
              result,
              "S-21_" + groups.join("-") + "_" + year + ".zip",
              "application/zip",
            );
        } else {
          result = await engine("s21",chosen, year);
          setZipBytes(null);
        }
      } else if (kind === "s3") result = await engine("s3",year, month, c.name);
      else if (kind === "s88") result = await engine("s88",year);
      else if (kind === "midweek") {
        const draft = data.data.schedule as any;
        const parsed = programSchema.safeParse(draft?.programs?.[scheduleWeek]);
        if (!parsed.success) throw Error(t("oclm.noProgram"));
        result = await runPDF(
          "meetingPDF",
          null,
          [
            {
              name: c.name,
              week: scheduleWeek,
              date: parsed.data.meetingDate,
              program: parsed.data,
              assignments: draft.assignments,
              people: draft.personnel,
              start: parsed.data.startTime || "19:00",
            },
          ],
          { signal: abort.current.signal },
        );
      } else if (kind === "emergency")
        result = await engine("emergency",families(chosen), c.name);
      else {
        const draft: any = data.data.schedule;
        const sections: { heading: string; lines: string[] }[] =
          kind === "duties"
            ? draft?.departmentSections || []
            : kind === "weekend"
              ? Object.entries(
                  data.data.weekend ||
                    (demo
                      ? {
                          Chairman: "Fictional Daniel",
                          Speaker: "Fictional Visitor",
                        }
                      : {}),
                )
                  .filter(
                    ([, v]) => typeof v === "string" || typeof v === "number",
                  )
                  .map(([k, v]) => ({ heading: k, lines: [String(v)] }))
              : Object.entries(
                  draft?.assignments ||
                    (demo
                      ? {
                          "This week": {
                            BibleStudy: {
                              personId: "daniel",
                              customTitle: "Congregation Bible study",
                            },
                          },
                        }
                      : {}),
                ).map(([week, parts]) => ({
                  heading: week,
                  lines: Object.entries(parts as Record<string, any>)
                    .filter(
                      ([id]) => kind !== "duties" || id.startsWith("Duty_"),
                    )
                    .map(
                      ([id, p]) =>
                        `${p.customTitle || id}: ${draft?.personnel?.find((person: any) => person.id === p.personId)?.name || (demo ? "Fictional Daniel" : "Unassigned")}`,
                    ),
                }));
        if (!sections.length || sections.every((s) => !s.lines.length))
          throw Error(
            "There are no assignments to print. Add assignments in the schedule, then retry.",
          );
        result = await engine("schedule",
          `${c.name} · ${kind} schedule${large ? " · large print" : ""}`,
          sections,
          { largePrint: large, layout: printLayout },
        );
      }
      if (abort.current.signal.aborted) return;
      setBytes(result);
      setProgress(100);
      const filename =
        kind === "s21"
          ? "S-21_" +
            (chosen.length === 1 ? pdfName(chosen[0]!.name) : groups.join("-")) +
            "_" +
            year +
            ".pdf"
          : kind + "_" + year + ".pdf";
      let delivered: "download" | "print" | "share" | "cancel" = action;
      if (kind !== "s21" || output !== "zip" || action !== "download")
        delivered = await deliverPDF(result, filename, action);
      if (delivered === "cancel") return;
      const attention =
        kind === "s21"
          ? chosen.filter(
              (p) => missingReportMonths(p.id, year, data.data.reports) > 0,
            ).length
          : 0;
      c.notify(
        kind === "s21"
          ? (delivered === "download"
              ? "Downloaded "
              : delivered === "print"
                ? "Prepared for printing: "
                : "Share opened for ") +
              chosen.length +
              " records" +
              (attention ? " · " + attention + " need attention" : "") +
              " · Review in Reports"
          : delivered === "download"
            ? "Document downloaded"
            : delivered === "print"
              ? "Document prepared for printing"
              : "Share opened",
      );
    } catch (e) {
      setError(
        (e as Error).name === "AbortError"
          ? "Generation cancelled. Your selections are kept."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!available.length)
    return (
      <section className="card">
        <h1>{t("ui.print.pdf.541714a2")}</h1>
        <p>{t("ui.your.role.does.not.have.document.export.ac.c7390453")}</p>
      </section>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t("ui.print.pdf.541714a2")}</div>
          <h1>{t("ui.forms.to.share.2ebe5a1f")}</h1>
          <p>{t("ui.choose.your.document.and.download.it.in.on.816b9b89")}</p>
        </div>
      </div>
      <div className="grid">
        <section className="card stack">
          <div className="ui-field">
            
            <LegacySelect
              aria-label={t("ui.document.d6bd8c0a")}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              {available.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </LegacySelect>
          </div>
          <div className="form-grid">
            <label>
              {t("ui.service.year.25e93d2c")}
              <input
                type="number"
                min={1900}
                max={2200}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
            {kind === "s3" && (
              <div className="ui-field">
                
                <LegacySelect
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))} aria-label={t("ui.month.310ca503")}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>
                      {new Intl.DateTimeFormat("en", { month: "long" }).format(
                        new Date(2000, i, 1),
                      )}
                    </option>
                  ))}
                </LegacySelect>
              </div>
            )}
          </div>
          {kind === "s21" && (
            <div className="stack">
              <div className="ui-field">
                
                <LegacySelect
                  aria-label={t("s21.group")}
                  value={selectionGroup}
                  onChange={(e) => {
                    const group = e.target.value as PublisherGroup;
                    setSelectionGroup(group);
                    setGroups([group]);
                  }}
                >
                  {(
                    [
                      "all",
                      "auxiliary",
                      "regular",
                      "individual",
                      "inactive",
                      "elders",
                      "ms",
                      "sfts",
                    ] as const
                  ).map((id) => (
                    <option
                      key={id}
                      value={id}
                      disabled={
                        id === "sfts" && !data.data?.publishers.some(isSFTS)
                      }
                    >
                      {t(`s21.${id}`)} ·{" "}
                      {
                        selectPublishers(
                          data.data?.publishers || [],
                          data.data?.reports || [],
                          {
                            group: id,
                            period: selectionMonth,
                            individual,
                            months: missingMonths,
                            reportState,
                          },
                        ).length
                      }
                    </option>
                  ))}
                </LegacySelect>
              </div>
              <fieldset>
                <legend>{t("ui.combine.groups.union.0a319224")}</legend>
                <div className="form-grid">
                  {(
                    [
                      "all",
                      "auxiliary",
                      "regular",
                      "individual",
                      "inactive",
                      "elders",
                      "ms",
                      "sfts",
                    ] as const
                  ).map((group) => (
                    <label className="check" key={group}>
                      <input
                        type="checkbox"
                        disabled={
                          group === "sfts" &&
                          !data.data?.publishers.some(isSFTS)
                        }
                        checked={groups.includes(group)}
                        onChange={(e) =>
                          setGroups((list) =>
                            e.target.checked
                              ? [...list, group]
                              : list.filter((id) => id !== group),
                          )
                        }
                      />
                      {t(`s21.${group}`)}
                    </label>
                  ))}
                </div>
              </fieldset>
              {!data.data?.publishers.some(isSFTS) && (
                <p>{t("ui.mark.someone.as.sfts.in.their.profile.fb507ff6")}</p>
              )}
              {groups.some((group) =>
                ["auxiliary", "inactive"].includes(group),
              ) && (
                <label>
                  {t(
                    selectionGroup === "auxiliary"
                      ? "s21.auxMonth"
                      : "s21.inactiveMonth",
                  )}
                  <input
                    type="month"
                    required
                    value={selectionMonth}
                    onChange={(e) => {
                      if (/^\d{4}-\d{2}$/.test(e.target.value))
                        setSelectionMonth(e.target.value);
                    }}
                  />
                </label>
              )}
              {groups.includes("inactive") && (
                <>
                  <label>
                    {t("ui.months.without.reports.798268b5")}
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={missingMonths}
                      onChange={(e) =>
                        setMissingMonths(
                          Math.max(
                            1,
                            Math.min(12, Number(e.target.value) || 3),
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="ui-field">
                    
                    <LegacySelect
                      aria-label={t("ui.report.state.db798be1")}
                      value={reportState}
                      onChange={(e) =>
                        setReportState(e.target.value as typeof reportState)
                      }
                    >
                      <option value="missing">
                        {t("ui.no.report.submitted.a949e466")}
                      </option>
                      <option value="no-activity">
                        {t("ui.reported.but.no.activity.c89d7f38")}
                      </option>
                    </LegacySelect>
                  </div>
                  <p>{t("s21.inactiveExplanation")}</p>
                </>
              )}
              {groups.includes("individual") && (
                <div className="ui-field">
                  
                  <LegacySelect
                    aria-label={t("s21.person")}
                    value={individual}
                    onChange={(e) => setIndividual(e.target.value)}
                  >
                    <option value="">{t("common.choose")}</option>
                    {data.data?.publishers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </LegacySelect>
                </div>
              )}
              <div className="ui-field">
                
                <LegacySelect
                  value={output}
                  onChange={(e) => {
                    setOutput(e.target.value);
                    preferenceStorage.setItem("ca-s21-format", e.target.value);
                    setBytes(null);
                    setZipBytes(null);
                  }} aria-label={t("ui.download.format.a4902f0f")}
                >
                  <option value="merged">{t("ui.merged.pdf.382cc825")}</option>
                  <option value="zip">
                    {t("ui.zip.of.individual.pdfs.3ef61c30")}
                  </option>
                </LegacySelect>
              </div>
              <p role="status">
                {chosen.length} {t("s21.matched")}
              </p>
            </div>
          )}
          {["s21", "emergency"].includes(kind) && (
            <Disclosure>
              <DisclosureLabel>
                {t("ui.choose.publishers.c306bfbb")}
                {chosen.length} {t("ui.records.a94e7bcf")}
              </DisclosureLabel>
              <div className="stack">
                <label>
                  {t("ui.find.a.publisher.b295f7a3")}
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <p>
                  {t("ui.with.none.selected.all.search.results.are..d9062524")}
                </p>
                {demo && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={demoScripts}
                      onChange={(e) => {
                        setDemoScripts(e.target.checked);
                        setBytes(null);
                        setSelected([]);
                      }}
                    />
                    {t("ui.include.eight.fictional.script.samples.17b75cc6")}
                  </label>
                )}
                {filtered.slice(0, 50).map((p) => (
                  <label className="check" key={p.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, p.id]
                            : ids.filter((id) => id !== p.id),
                        )
                      }
                    />
                    {p.name}
                  </label>
                ))}
              </div>
            </Disclosure>
          )}
          {kind === "midweek" && (
            <label>
              {t("oclm.week")}
              <input
                type="week"
                value={scheduleWeek}
                onChange={(e) => {
                  if (e.target.value) {
                    setScheduleWeek(e.target.value);
                    setBytes(null);
                  }
                }}
              />
            </label>
          )}
          {["weekend", "duties"].includes(kind) && (
            <Disclosure>
              <DisclosureLabel>{t("ui.print.layout.628f0fe9")}</DisclosureLabel>
              <div className="ui-field">
                
                <LegacySelect
                  value={printLayout}
                  onChange={(e) => {
                    setPrintLayout(e.target.value);
                    setBytes(null);
                  }} aria-label={t("ui.layout.a5119091")}
                >
                  <option value="list">{t("ui.weekly.list.f93ceecb")}</option>
                  <option value="grid">{t("ui.month.grid.82c6e1de")}</option>
                  <option value="booklet">{t("ui.a5.booklet.5e40d183")}</option>
                </LegacySelect>
              </div>
              {printLayout === "booklet" && (
                <p>
                  {t("ui.print.landscape.with.double.sided.short.ed.37a45137")}
                </p>
              )}
            </Disclosure>
          )}
          {["midweek", "weekend", "duties"].includes(kind) && (
            <label className="check">
              <input
                type="checkbox"
                checked={large}
                onChange={(e) => {
                  setLarge(e.target.checked);
                  setBytes(null);
                }}
              />
              {t("ui.large.print.8855a768")}
            </label>
          )}
          {data.isLoading && (
            <p role="status">{t("ui.loading.records.c3b4579a")}</p>
          )}
          {(error || data.error) && (
            <p role="alert" className="error">
              {error || data.error?.message}
            </p>
          )}
          <div className="actions">
            <Button
              className="primary"
              disabled={
                busy ||
                data.isLoading ||
                !!data.error ||
                !Number.isInteger(year) ||
                year < 1900 ||
                year > 2200
              }
              onClick={() => void generate()} type="button"
            >
              {busy ? "Preparing…" : "Download"}
            </Button>
            <Disclosure>
              <DisclosureLabel>{t("ui.print.share.e31afdd0")}</DisclosureLabel>
              <Button
                disabled={busy || data.isLoading}
                onClick={() => void generate("print")} type="button"
              >
                {t("ui.print.df0fe798")}
              </Button>
              <Button
                disabled={busy || data.isLoading}
                onClick={() => void generate("share")} type="button"
              >
                {t("ui.share.29887a5f")}
              </Button>
            </Disclosure>
          </div>
          {busy && (
            <>
              <progress
                value={progress}
                max={100}
                aria-label={t("ui.pdf.generation.abfc7308")}
              />
              <Button onClick={() => abort.current?.abort()} type="button">
                {t("ui.cancel.generation.12ad4ee6")}
              </Button>
            </>
          )}
          <p className="muted">{t("refine.pdfPrivacy")}</p>
        </section>
        <section className="card">
          <h2>{t("ui.accuracy.guard.c7262bfe")}</h2>
          <p>{t("ui.missing.reports.remain.blank.and.never.blo.169f911e")}</p>
          <Button
            onClick={() => {
              const url = new URL(location.href);
              url.searchParams.set("screen", "reports");
              location.assign(url);
            }} type="button"
          >
            {t("ui.review.reports.5356c355")}
          </Button>
        </section>
      </div>
    </>
  );
}
