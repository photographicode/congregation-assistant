import React from "react";
import type { Program, Assignments } from "../core/meeting";
import { monday } from "../core/meeting";
import { t } from "../core/i18n";
import "./oclm.css";
export function OclmSchedule({
  name,
  week,
  program,
  assignments,
  people,
  date,
  start = "19:00",
}: {
  name: string;
  week: string;
  program: Program;
  assignments: Assignments;
  people: Array<{ id: string; name: string }>;
  date?: string;
  start?: string;
}) {
  let minutes = Number(start.split(":")[0]) * 60 + Number(start.split(":")[1]);
  const time = (duration: number) => {
    const value =
      String(Math.floor(minutes / 60) % 24).padStart(2, "0") +
      ":" +
      String(minutes % 60).padStart(2, "0");
    minutes += duration;
    return value;
  };
  const person = (slot: string) =>
    people.find((p) => p.id === assignments[week]?.[slot]?.personId)?.name ||
    "—";
  const auxiliary = program.auxiliary === true;
  let previous = "";
  return (
    <section
      className="oclm-sheet"
      data-auxiliary={auxiliary}
      aria-label={t("oclm.s140")}
    >
      <header>
        <h2>{name}</h2>
        <strong>{t("oclm.title")}</strong>
      </header>
      <div className="oclm-week">
        {date || monday(week)} · {program.reading}
      </div>
      <div className="oclm-officers">
        <span>
          {t("oclm.chairman")}: {person("Chairman")}
        </span>
        {auxiliary && (
          <span>
            {t("oclm.counselor")}: {person("AuxiliaryCounselor")}
          </span>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("oclm.time")}</th>
            <th scope="col">{t("oclm.part")}</th>
            {auxiliary && <th scope="col">{t("oclm.auxHall")}</th>}
            <th scope="col">{t("oclm.mainHall")}</th>
          </tr>
        </thead>
        <tbody>
          {program.parts.map((part, index) => {
            const section = part.section !== previous;
            previous = part.section;
            return (
              <React.Fragment key={part.id}>
                {section && (
                  <tr className={"oclm-section oclm-" + part.section}>
                    <th scope="colgroup" colSpan={auxiliary ? 4 : 3}>
                      {t(`oclm.${part.section}`)}
                    </th>
                  </tr>
                )}
                <tr>
                  <td>{time(part.minutes)}</td>
                  <th scope="row">
                    {index + 1}. {part.title}{" "}
                    <small>
                      ({part.minutes} {t("oclm.minutes")})
                    </small>
                  </th>
                  {(auxiliary ? ["Aux", ""] : [""]).map((hall) => (
                    <td key={hall}>
                      <span>{person(part.id + hall)}</span>
                      {part.assistant && (
                        <small>{person(part.id + hall + "Assistant")}</small>
                      )}
                      {part.reader && hall === "" && (
                        <small>{t("oclm.reader")}: {person(part.id + "Reader")}</small>
                      )}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <footer>{t("oclm.format")}</footer>
    </section>
  );
}
