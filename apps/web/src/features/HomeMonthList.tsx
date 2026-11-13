import React from "react";
import { periodLabel } from "./period-label";

type Person = { id: string; name: string; service_group?: string | null; is_rp?: boolean | null; isRP?: boolean };
type Report = {
  pub_id: string;
  studies?: number | null;
  hours?: number | string | null;
  shared_in_ministry?: boolean | null;
  is_ap?: boolean | null;
  comments?: string | null;
};

const dash = (n: number) => (n > 0 ? n : "–");

function pioneerTag(person: Person, report?: Report) {
  if (person.is_rp || person.isRP) return "RP";
  return report?.is_ap ? "AP" : "";
}

function Name({ person, report }: { person: Person; report?: Report }) {
  const pioneer = pioneerTag(person, report);
  return (
    <th scope="row">
      <span translate="no">{person.name}</span>
      {person.service_group && <span className="log-tag">{person.service_group}</span>}
      {pioneer && <span className="log-tag strong">{pioneer}</span>}
    </th>
  );
}

function MissingRow({ person, onRemind }: { person: Person; onRemind?: (name: string) => void }) {
  return (
    <tr className="log-missing">
      <Name person={person} />
      <td colSpan={4}>
        <div className="log-missing-cell">
          <span>{"Not reported yet"}</span>
          {onRemind && (
            <button className="tonal warning" onClick={() => onRemind(person.name)} type="button">
              {"Remind"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ReportRow({ person, report }: { person: Person; report: Report }) {
  const studies = Number(report.studies) || 0, hours = Number(report.hours) || 0;
  const shared = Boolean(report.shared_in_ministry || studies || hours);
  return (
    <tr>
      <Name person={person} report={report} />
      <td className={shared ? "tone-text ok" : "tone-text warning"}>{shared ? "Yes" : "No"}</td>
      <td className="num">{dash(studies)}</td>
      <td className="num">{dash(hours)}</td>
      <td className="log-remarks" title={report.comments || undefined}>{report.comments || ""}</td>
    </tr>
  );
}

// Monthly submissions log, modelled on the V1 dashboard table: one row per publisher, missing reports first.
export function HomeMonthList({ people, reports, period, onRemind }: { people: Person[]; reports: Report[]; period: string; onRemind?: (name: string) => void }) {
  const byPerson = new Map(reports.map((r) => [r.pub_id, r]));
  const rows = [...people].sort((a, b) => Number(byPerson.has(a.id)) - Number(byPerson.has(b.id)) || a.name.localeCompare(b.name));
  const sent = people.filter((p) => byPerson.has(p.id)).length;
  return (
    <section className="card stack" aria-labelledby="month-list-title">
      <h2 id="month-list-title">{"Submissions log · " + periodLabel(period)}</h2>
      <p>{`${sent} of ${people.length} have reported.`}</p>
      {people.length === 0 ? (
        <p>{"Add publishers to see their reports here."}</p>
      ) : (
        <div className="log-scroll">
          <table className="month-log">
            <thead>
              <tr>
                <th scope="col">{"Publisher"}</th>
                <th scope="col">{"Shared"}</th>
                <th scope="col" className="num">{"Studies"}</th>
                <th scope="col" className="num">{"Hours"}</th>
                <th scope="col">{"Remarks"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => {
                const report = byPerson.get(person.id);
                return report ? (
                  <ReportRow key={person.id} person={person} report={report} />
                ) : (
                  <MissingRow key={person.id} person={person} onRemind={onRemind} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
