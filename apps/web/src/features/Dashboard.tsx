import { HomeAssistant } from "./HomeAssistant";
import { HomeGroupLinks } from "./HomeGroupLinks";
import { HomeSuggestions } from "./HomeSuggestions";
import React from "react";
import {
  isSFTS,
  sftsTotals,
} from "../../../../packages/core/publisher-selection";
import { HomeKpis } from "../../../../packages/ui/HomePreview";
import { Button, Card, Stack, Inline, Tabs } from "../../../../packages/ui/components";
import { HomeMonthList } from "./HomeMonthList";
import { t } from "../../../../packages/core/i18n";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BarChart3,
  FileDown,
  Plus,
  Settings,
  MessageCircle,
  CalendarDays,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { repositories } from "../../../../packages/core/repositories";
import { demo, storeFor } from "./client";
import { useDemoReports } from "./demo-reports";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import { useAppearance } from "./store";
import { Scene } from "./Scene";
import { ExperiencePicker } from "./ExperiencePicker";
import { Greeting } from "../../../../packages/ui/Greeting";
import {
  dashboardSummary,
  previousReportingPeriod,
} from "./dashboard-model.mjs";
import { periodLabel } from "./period-label";
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
// Demo Home reads the same fictional people and reports as the Reports screen.
const fictionalPeople: DashboardPerson[] = demoPublishers.map((p) => ({ ...p, service_group: p.group }));
export function Dashboard({
  context: c,
  go,
  setup,
  addPublisher,
  setupEntry,
  updates,
}: {
  context: Context;
  setupEntry?: React.ReactNode;
  updates?: React.ReactNode;
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
  const [homeTab, setHomeTab] = React.useState("overview");
  const [period, setPeriod] = React.useState(() =>
      previousReportingPeriod(new Date(), setup.timezone),
    );
  const [y = 0, m = 1] = period.split("-").map(Number),
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
  const demoRows = useDemoReports((s) => s.rows),
    fictionalReports = demoRows.filter((r) => r.service_year === year && r.month === month);
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
      ? fictionalReports
      : reports.data || [],
    special = sftsTotals(livePeople, liveReports, period);
  const remind = async (name: string) => {
    const text = `Hello ${name}, a friendly reminder to submit your ${period} ministry report. Thank you.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        c.notify("Reminder copied. Choose where to send it.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError")
        c.notify("Sharing is unavailable. You can use Messages to prepare a reminder.");
    }
  };
  const openReports = (action: string) => {
    sessionStorage.setItem(
      "ca-report-action",
      JSON.stringify({ action, period }),
    );
    go("reports");
  };
  const overview = (
    <div className="stack">
      <div className="home-rich-details" aria-label={t("home.allTools")}>
        {canReports && (
          <HomeKpis
            summary={summary}
            loading={loading}
            error={!!error}
            charts={a.charts}
            onSelect={() => openReports("review")}
          />
        )}
        {canReports && (
          <Card className="stack" id="dashboard-submissions">
            {/* Home shows who still has to report; the full list, filters and totals live in Reports. */}
            <div>
              <span className="eyebrow">{periodLabel(period)}</span>
              <h2>{t("ui.monthly.submissions.3126c8db")}</h2>
              {/* The count is already in the Submitted figure above, so this card names who is missing. */}
              <p>
                {summary.pending > 0
                  ? "Still to report:"
                  : summary.publishers > 0 && `All ${summary.publishers} reports are in — nicely done.`}
              </p>
            </div>
            {!loading && !error && summary.missing.length > 0 && (
              <div className="list">
                {summary.missing.slice(0, 5).map((p: DashboardPerson) => (
                  <article className="list-row" key={p.id}>
                    <strong translate="no">{p.name}</strong>
                    <Button className="tonal warning" onClick={() => void remind(p.name)} type="button">
                      {t("ui.remind.3aec36bb")}
                    </Button>
                  </article>
                ))}
              </div>
            )}
            {!loading && !error && !summary.publishers && (
              <div className="empty-scene">
                <Scene kind="publishers" />
                <p>{"Add your first publisher to start seeing reporting progress."}</p>
              </div>
            )}
            <Button onClick={() => openReports("review")} type="button">
              {t("ui.open.monthly.reports.0436ae79")}
            </Button>
          </Card>
        )}
      </div>
      {/* V4.1: the month's work comes first; links, updates and the assistant follow it. */}
      <HomeGroupLinks context={c} period={period} />
      {updates}
      <HomeAssistant context={c} go={go} />
      <HomeSuggestions
        context={c}
        period={period}
        missing={summary.pending}
        ready={!loading && !error}
        go={go}
      />
    </div>
  );
  return (
    <Stack className="dashboard">
      {!a.experienceChosen && (
        <Card>
          <ExperiencePicker />
        </Card>
      )}
      <section className="dashboard-hero">
        <Greeting
          name={c.firstName}
          timezone={setup.timezone}
          locale={setup.language}
          clock={a.clock}
        />
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
      {error && (
        <p className="error" role="alert">
          {t("ui.records.could.not.load.refresh.to.try.agai.7090d449")}
        </p>
      )}
      {/* Until setup is finished it is the first thing a new admin sees; it disappears afterwards. */}
      {setupEntry}
      {/* Home stays short: today's figures and who is missing. Every publisher's report sits in its own tab. */}
      {canReports ? (
        <Tabs
          label={"Home"}
          value={homeTab}
          onChange={setHomeTab}
          tabs={[
            { value: "overview", label: "Overview", content: overview },
            {
              value: "month",
              label: "Reports this month",
              content: (
                <div className="stack">
        {canReports && !loading && !error && special.publishers > 0 && (
          <Card className="stack">
            <h2>{t("sfts.summary")}</h2>
            <p>
              {periodLabel(period)} · {special.submitted} / {special.publishers}{" "}
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
                  <HomeMonthList people={livePeople} reports={liveReports} period={period} />
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
              <Settings />
              {t("ui.install.app.all.settings.15eaa3f0")}
            </Button>
          </div>
        </Card>
                </div>
              ),
            },
          ]}
        />
      ) : (
        overview
      )}
    </Stack>
  );
}
