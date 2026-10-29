import {navigateRoute,useRouteField} from "../useRoute";
import { HomeGroupLinks } from "./HomeGroupLinks";
import React from "react";
import {
  isSFTS,
  sftsTotals,
} from "../../../../packages/core/publisher-selection";
import { HomeKpis } from "../../../../packages/ui/HomePreview";
import { Segmented, Button, Card, Stack, Inline } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BarChart3,
  FileDown,
  Plus,
  MessageCircle,
  CalendarDays,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { repositories } from "../../../../packages/core/repositories";
import { demo, storeFor } from "./client";
import { useAppearance } from "./store";
import { Scene } from "./Scene";
import { ExperiencePicker } from "./ExperiencePicker";
import {
  dashboardSummary,
  previousReportingPeriod,
} from "./dashboard-model.mjs";
import type { Context } from "../context";
type DashboardPerson = {
  id: string;
  name: string;
  service_group?: string | null;
  is_rp?: boolean | null;
  is_sp?: boolean | null;
  is_fm?: boolean | null;
  is_sfts?: boolean | null;
  is_elder?: boolean | null;
  is_ms?: boolean | null;
  transferred_at?: unknown;
};
const fictionalPeople: DashboardPerson[] = [
  { id: "daniel", name: "Daniel Thomas", service_group: "North", is_rp: true },
  { id: "maria", name: "Maria Thomas", service_group: "North" },
  { id: "samuel", name: "Samuel George", service_group: "South" },
  { id: "anna", name: "Anna Joseph", service_group: "South", is_sfts: true },
];
const fictionalReports = [
  {
    pub_id: "daniel",
    hours: 50,
    studies: 3,
    is_ap: false,
    shared_in_ministry: true,
  },
  {
    pub_id: "maria",
    hours: 15,
    studies: 1,
    is_ap: true,
    shared_in_ministry: true,
  },
  {
    pub_id: "samuel",
    hours: 0,
    studies: 0,
    is_ap: false,
    shared_in_ministry: false,
  },
];
export function Dashboard({
  context: c,
  go,
  setup,
  addPublisher,
}: {
  context: Context;
  go: (s: string) => void;
  setup: any;
  addPublisher: () => void;
}) {
  const a = useAppearance(),
    repo = React.useMemo(
      () => repositories(storeFor(c.cong, c.roles), c.cong, demo),
      [c.cong],
    );
  const canReports = c.roles.some((r) =>
      ["admin", "field_service", "group_overseer"].includes(r),
    ),
    admin = c.roles.includes("admin"),
    canPDF = c.roles.some((r) =>
      ["admin", "field_service", "attendance", "oclm", "weekend"].includes(r),
    ),
    canSchedule = c.roles.some((r) =>
      [
        "admin",
        "oclm",
        "weekend",
        "attendance",
        "attendant",
        "av",
        "cleaning",
        "publisher",
      ].includes(r),
    );
  const [period,setPeriod]=useRouteField("month",previousReportingPeriod(new Date(),setup.timezone));
  const [filter, setFilter] = React.useState("all"),
    [search, setSearch] = React.useState("");
  const [y=new Date().getFullYear(), m=new Date().getMonth()+1] = period.split("-").map(Number),
    month = m - 1,
    year = y + (month >= 8 ? 1 : 0);
  const people = useQuery({
    queryKey: ["dashboard-people", c.cong],
    queryFn: () => repo.people.list(),
    enabled: !demo && canReports,
  });
  const reports = useQuery({
    queryKey: ["reports", c.cong, year, month],
    queryFn: () => repo.reports.list(year, month),
    enabled: !demo && canReports,
  });
  const summary = dashboardSummary(
    demo ? fictionalPeople : people.data || [],
    demo ? fictionalReports : reports.data || [],
  );
  const loading =
      !demo && canReports && (people.isPending || reports.isPending),
    error = people.error || reports.error;
  const livePeople = (demo ? fictionalPeople : people.data || []).filter(
      (p) => !p.transferred_at,
    ),
    liveReports = demo
      ? fictionalReports.map((row) => ({ ...row, service_year: year, month }))
      : reports.data || [],
    special = sftsTotals(livePeople, liveReports, period);
  const roster = (demo ? fictionalPeople : people.data || [])
    .filter((p) => !p.transferred_at)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) =>
      filter === "pending"
        ? summary.missing.some((q: DashboardPerson) => q.id === p.id)
        : filter === "submitted"
          ? summary.rows.some((r) => r.pub_id === p.id)
        : filter === "regular"
          ? Boolean(p.is_rp || p.is_sp || p.is_fm)
          : filter === "auxiliary" || filter === "ap-review"
            ? summary.rows.some((r) => r.pub_id === p.id && r.is_ap)
            : filter === "elders"
              ? Boolean(p.is_elder)
              : filter === "ms"
                ? Boolean(p.is_ms)
                : filter === "sfts"
                  ? isSFTS(p)
                  : filter.startsWith("group:")
                    ? p.service_group === filter.slice(6)
                    : true,
    );
  const groups = [...new Set(livePeople.map((p) => p.service_group).filter(Boolean))] as string[];
  const openReports = (action: string) => {navigateRoute({screen:"reports",action,month:period});};
  return (
    <Stack className="dashboard">
      {!a.experienceChosen && (
        <Card>
          <ExperiencePicker />
        </Card>
      )}
      <section className="dashboard-hero">
        <Inline className="dashboard-context">
          <label>
            {t("ui.reporting.month.04bf8d83")}
            <input
              type="month"
              required
              value={period}
              onChange={(e) => {
                if (e.target.value) setPeriod(e.target.value);
              }}
            />
          </label>
          <span className="chip">
            {demo
              ? "Fictional sample data"
              : !navigator.onLine
                ? "Offline"
                : loading
                  ? "Loading records…"
                  : error
                    ? "Sync needs attention"
                    : canReports
                      ? "Records loaded"
                      : "Connected"}
          </span>
          {canReports && !demo && (
            <Button
              aria-label={t("ui.refresh.dashboard.d612730f")}
              onClick={() => {
                void people.refetch();
                void reports.refetch();
              }} type="button"
            >
              <RefreshCw /> {t("ui.refresh.0e916101")}
            </Button>
          )}
        </Inline>
      </section>
      <HomeGroupLinks context={c} period={period} />
      {error && (
        <p className="error" role="alert">
          {t("ui.records.could.not.load.refresh.to.try.agai.7090d449")}
        </p>
      )}
      {a.style === "calm" && (
        <Card className="stack">
          <h2>{t("home.nextTask")}</h2>
          <p>{t("home.previewTask")}</p>
          <div className="dashboard-actions">
            {canReports && (
              <Button onClick={() => openReports("bulk")} type="button">
                {t("tool.month")}
              </Button>
            )}
            {canSchedule && (
              <Button onClick={() => go("schedule")} type="button">
                {t("tool.midweek")}
              </Button>
            )}
            {canPDF && (
              <Button onClick={() => go("pdf")} type="button">{t("tool.s21")}</Button>
            )}
          </div>
        </Card>
      )}
      <div className="home-rich-details" aria-label={t("home.allTools")}>
        {canReports && (
          <HomeKpis
            summary={summary}
            loading={loading}
            error={!!error}
            charts={a.charts}
            onSelect={(filter) => {
              setFilter(filter);
              document
                .getElementById("dashboard-submissions")
                ?.scrollIntoView({ block: "start" });
            }}
          />
        )}
        {canReports && !loading && !error && special.publishers > 0 && (
          <Card className="stack">
            <h2>{t("sfts.summary")}</h2>
            <p>
              {period} · {special.submitted} / {special.publishers}{" "}
              {t("ui.submitted.1202e3f2")}
              {special.hours} {t("home.hours")} · {special.studies}{" "}
              {t("home.studies")}
            </p>
            <div className="list">
              {livePeople.filter(isSFTS).map((person) => {
                const report = liveReports.find(
                  (row) => row.pub_id === person.id,
                );
                return (
                  <article className="list-row" key={person.id}>
                    <strong>{person.name}</strong>
                    <span>
                      {report
                        ? `${report.hours || 0} ${t("home.hours")} · ${report.studies || 0} ${t("home.studies")}`
                        : "Awaiting report"}
                    </span>
                  </article>
                );
              })}
            </div>
            <Button onClick={() => openReports("review")} type="button">
              {t("ui.open.monthly.reports.0436ae79")}
            </Button>
          </Card>
        )}
        <Card>
          <h2>{t("ui.your.tools.close.at.hand.66b5ceca")}</h2>
          <div className="dashboard-actions">
            {canReports && (
              <>
                <Button onClick={() => openReports("bulk")} type="button">
                  <Plus />
                  {t("ui.bulk.entry.bc2ab04d")}
                </Button>
                <Button
                  onClick={() => {
                    setFilter("pending");
                    document
                      .getElementById("dashboard-submissions")
                      ?.scrollIntoView();
                  }} type="button"
                >
                  <MessageCircle />
                  {t("ui.missing.reports.remind.6a80d46e")}
                </Button>
              </>
            )}
            {canPDF && (
              <Button onClick={() => go("pdf")} type="button">
                <FileDown />
                {t("ui.download.reports.b6a9809c")}
              </Button>
            )}
            {admin && (
              <Button onClick={addPublisher} type="button">
                <Users />
                {t("ui.add.publisher.b13cc36b")}
              </Button>
            )}
            {admin && (
              <Button onClick={() => go("access")} type="button">
                <ArrowUpRight />
                {t("ui.report.links.c7ccf54c")}
              </Button>
            )}
            {canSchedule && (
              <Button onClick={() => go("schedule")} type="button">
                <CalendarDays />
                {t("ui.this.week.s.schedule.fbe36acb")}
              </Button>
            )}
            {admin && (
              <Button onClick={() => go("messages")} type="button">
                <MessageCircle />
                {t("ui.messages.04d7b483")}
              </Button>
            )}
            <Button onClick={() => go("settings")} type="button">
              <Plus />
              {t("ui.install.app.all.settings.15eaa3f0")}
            </Button>
          </div>
        </Card>
        {canReports && (
          <Card className="stack" id="dashboard-submissions">
            <div>
              <span className="eyebrow">{period}</span>
              <h2>{t("ui.monthly.submissions.3126c8db")}</h2>
              <p>
                {summary.pending === 0 && summary.publishers > 0
                  ? `All ${summary.publishers} reports are in — nicely done.`
                  : "A clear view of what’s in and who may need a reminder."}
              </p>
            </div>
            <Stack>
              <label>
                {t("ui.find.publisher.9607fbc9")}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  type="search"
                />
              </label>
              <Segmented
                label={t("ui.show.0df6f1ca")}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("ui.everyone.da2e5dc5") },
                  { value: "submitted", label: "Submitted" },
                  { value: "pending", label: t("ui.missing.reports.e12d4dd9") },
                  {
                    value: "regular",
                    label: t("ui.regular.pioneers.ea3147c8"),
                  },
                  {
                    value: "auxiliary",
                    label: t("ui.auxiliary.pioneers.0b40b93d"),
                  },
                  { value: "ap-review", label: t("refine.apTitle") },
                  { value: "ms", label: "MS" },
                  { value: "elders", label: "Elders" },
                  ...(special.publishers ? [{ value: "sfts", label: "SFTS" }] : []),
                  ...groups.map((group) => ({ value: `group:${group}`, label: group })),
                ]}
              />
            </Stack>
            {!loading && !error && roster.length > 0 && (
              <div className="people-table-wrap">
              <table className="people-table">
                <thead><tr><th>{"Name"}</th><th>{"Roles"}</th><th>{"Report"}</th><th>{"Studies"}</th><th>{"Hours"}</th><th>{"Actions"}</th></tr></thead>
                <tbody>
              {roster.slice(0, 50).map((p) => {
                const r = summary.rows.find((row) => row.pub_id === p.id);
                const pioneer = Boolean(p.is_rp || p.is_sp || p.is_fm || r?.is_ap || isSFTS(p));
                const roles = [p.is_elder && "Elder", p.is_ms && "MS", (p.is_rp || p.is_sp || p.is_fm) && "RP", r?.is_ap && "AP", isSFTS(p) && "SFTS"].filter(Boolean);
                return (
                  <tr className={r ? "" : "not-submitted"} key={p.id} tabIndex={0}>
                    <td data-label="Name"><strong translate="no">{p.name}</strong><span className="group-chip">{p.service_group || "No group"}</span></td>
                    <td data-label="Roles">{roles.length ? roles.map((role) => <span className="role-chip" key={String(role)}>{role}</span>) : <span>{"Publisher"}</span>}</td>
                    <td data-label="Report">{r ? (r.shared_in_ministry ? `Shared${r.comments ? " · Comment" : ""}` : "Did not share") : "Not submitted"}</td>
                    <td className="number" translate="no" data-label="Studies">{r?.studies ?? "—"}</td>
                    <td className="number" translate="no" data-label="Hours">{pioneer && r ? r.hours || 0 : "—"}</td>
                    <td data-label="Actions"><div className="actions row-actions">
                      <Button className="tonal" onClick={() => { navigateRoute({screen:"pdf",doc:"s21",person:p.id}); }} type="button">{"S-21"}</Button>
                      {!r && (
                        <Button className="tonal warning"
                          onClick={async () => {
                            const text = `Hello ${p.name}, a friendly reminder to submit your ${period} ministry report. Thank you.`;
                            try {
                              if (navigator.share)
                                await navigator.share({ text });
                              else {
                                await navigator.clipboard.writeText(text);
                                c.notify(
                                  "Reminder copied. Choose where to send it.",
                                );
                              }
                            } catch (e) {
                              if ((e as Error).name !== "AbortError")
                                c.notify(
                                  "Sharing is unavailable. You can use Messages to prepare a reminder.",
                                );
                            }
                          }} type="button"
                        >
                          {t("ui.remind.3aec36bb")}
                        </Button>
                      )}
                    </div></td>
                  </tr>
                );
              })}
                </tbody>
                <tfoot><tr><th data-label="Name">{"Total"}</th><td data-label="Roles">{roster.length}{" publishers"}</td><td data-label="Report">{roster.filter((p) => summary.rows.some((r) => r.pub_id === p.id)).length}{" submitted"}</td><td className="number" data-label="Studies">{roster.reduce((total,p) => total + (summary.rows.find((r) => r.pub_id === p.id)?.studies || 0),0)}</td><td className="number" data-label="Hours">{roster.reduce((total,p) => total + (summary.rows.find((r) => r.pub_id === p.id)?.hours || 0),0)}</td><td /></tr></tfoot>
              </table></div>
            )}
            {roster.length > 50 && (
              <Button onClick={() => openReports("review")} type="button">
                {t("ui.open.all.reports.a7845883")}
              </Button>
            )}
            {!loading && !error && !roster.length && (
              <div className="empty-scene">
                <Scene kind={summary.publishers ? "caughtUp" : "publishers"} />
                <p>
                  {summary.publishers
                    ? "No publishers match this view. Try another filter."
                    : "Add your first publisher to start seeing reporting progress."}
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </Stack>
  );
}
