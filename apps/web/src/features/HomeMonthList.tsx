import React from "react";
import { periodLabel } from "./period-label";

type Person = { id: string; name: string; service_group?: string | null };
type Report = { pub_id: string; studies?: number | null; hours?: number | string | null };

// Every publisher's report for the chosen month, grouped by field service group, missing reports first.
export function HomeMonthList({ people, reports, period }: { people: Person[]; reports: Report[]; period: string }) {
  const byPerson = new Map(reports.map((r) => [r.pub_id, r]));
  const groups = new Map<string, Person[]>();
  for (const person of people) {
    const group = person.service_group || "No group";
    groups.set(group, [...(groups.get(group) || []), person]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const sent = people.filter((p) => byPerson.has(p.id)).length;
  return (
    <section className="card stack" aria-labelledby="month-list-title">
      <h2 id="month-list-title">{"Every publisher · " + periodLabel(period)}</h2>
      <p>{`${sent} of ${people.length} have reported.`}</p>
      {sorted.map(([group, members]) => (
        <div className="stack" key={group}>
          <h3>{group}</h3>
          <div className="list">
            {[...members]
              .sort((a, b) => Number(byPerson.has(a.id)) - Number(byPerson.has(b.id)) || a.name.localeCompare(b.name))
              .map((person) => {
                const report = byPerson.get(person.id);
                const hours = Number(report?.hours) || 0;
                return (
                  <article className="list-row" key={person.id}>
                    <strong translate="no">{person.name}</strong>
                    <span className={report ? "muted" : "chip"}>
                      {report
                        ? [`${report.studies || 0} ${report.studies === 1 ? "study" : "studies"}`, hours > 0 ? `${hours} hours` : ""].filter(Boolean).join(" · ")
                        : "Not reported yet"}
                    </span>
                  </article>
                );
              })}
          </div>
        </div>
      ))}
      {people.length === 0 && <p>{"Add publishers to see their reports here."}</p>}
    </section>
  );
}
