import { t } from "../../../../packages/core/i18n";
import React from "react";
import { ExperiencePicker } from "./ExperiencePicker";
import { useQuery } from "@tanstack/react-query";
import { client, demo, rpc } from "./client";
import type { Context } from "../main";
import { Greeting } from "../../../../packages/ui/Greeting";
import { useAppearance } from "./store";
export function PublisherHome({
  context: c,
  go,
}: {
  context: Context;
  go: (route: string) => void;
}) {
  const appearance = useAppearance();
  const home = useQuery({
    queryKey: ["publisher-home", c.cong],
    queryFn: () => rpc("get_my_publisher_home", { p_cong_id: c.cong }),
    enabled: !demo,
  });
  const data = demo
    ? {
        name: "Daniel Thomas",
        report: { period: "September 2026", submitted: false },
        assignments: [
          {
            week: "This week",
            title: "Congregation Bible study",
            personName: "Daniel Thomas",
          },
        ],
      }
    : home.data;
  return (
    <>
      {!appearance.experienceChosen && (
        <section className="card">
          <ExperiencePicker />
        </section>
      )}
      <Greeting
        name={data?.name?.split(" ")[0] || c.firstName}
        clock={appearance.clock}
      />
      {home.error && (
        <p role="alert" className="banner">
          {home.error.message}
        </p>
      )}
      <div className="grid">
        <section className="card stack">
          <h2>{t("ui.my.service.report.4d770684")}</h2>
          <p>
            {data?.report?.period || "Your current reporting period"} ·{" "}
            {data?.report?.submitted ? "Submitted" : "Ready to report"}
          </p>
          <button className="primary" onClick={() => go("reports")}>
            {t("ui.open.household.reports.e625ea75")}
          </button>
        </section>
        <section className="card stack">
          <h2>{t("ui.my.assignments.3a57df89")}</h2>
          {(data?.assignments || []).map((a: any, i: number) => (
            <div className="list-row" key={i}>
              <div>
                <strong>
                  {a.title ||
                    a.customTitle ||
                    a.part ||
                    a.slot ||
                    "Meeting assignment"}
                </strong>
                <p>{a.week || a.date}</p>
              </div>
            </div>
          ))}
          {!data?.assignments?.length && (
            <p>{t("ui.no.published.assignments.are.available.ac5d3d10")}</p>
          )}
          <button onClick={() => go("schedule")}>
            {t("ui.open.schedule.2a724cdf")}
          </button>
        </section>
      </div>
    </>
  );
}
