import {useScheduleWeek} from "../useScheduleWeek";
import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { AssignmentPicker } from "../../../../packages/ui/AssignmentPicker";
import {
  assignmentRecency,
  compareAssignmentRecency,
} from "../../../../packages/core/assignment-recency";
import { refreshProgram } from "../../../../packages/core/program-refresh";
import { runPDF } from "./pdf-worker-client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { storeFor, demo, subscribeStores, rpc } from "./client";
import {
  repositories,
  scheduleSchema,
  type ScheduleDraft,
} from "../../../../packages/core/repositories";
import { t } from "../../../../packages/core/i18n";
import { StaticMeetingImport } from "./StaticMeetingImport";
import { ManualMeetingParts } from "./ManualMeetingParts";
import { OclmSchedule } from "../../../../packages/ui/OclmSchedule";
import {
  programSchema,
  candidates,
  autoAssign,
  isAuxiliarySlot,
  monday,
  type Program,
} from "../../../../packages/core/meeting";
import { offerPDF } from "./pdf-download";
import { Dialog } from "../../../../packages/ui/Dialog";
import type { SyncStatus } from "../../../../packages/core/store";
import type { Context } from "../context";
import { handleError } from "../../../../packages/core/errors";

const slots = [
  ["Chairman", "Chairman"],
  ["OpeningPrayer", "Opening prayer"],
  ["TreasuresTalk", "Treasures talk"],
  ["SpiritualGems", "Spiritual gems"],
  ["BibleReading", "Bible reading"],
  ["Conversation", "Starting a conversation"],
  ["FollowingUp", "Following up"],
  ["Disciples", "Making disciples"],
  ["ChristianPart1", "Living as Christians"],
  ["BibleStudy", "Congregation Bible study"],
  ["BibleStudyReader", "Bible study reader"],
  ["ClosingPrayer", "Closing prayer"],
];
const samplePersonnel = [
  {
    id: "daniel",
    name: "Daniel Thomas",
    gender: "Male",
    appointment: "Elder",
    roles: [
      "Chairman",
      "Prayer",
      "TreasuresTalk",
      "SpiritualGems",
      "BibleStudy",
    ],
    exceptions: {},
    availability: [],
  },
  {
    id: "samuel",
    name: "Samuel George",
    gender: "Male",
    appointment: "MS",
    roles: ["BibleReading", "BibleStudyReader", "ChristianParts"],
    exceptions: {},
    availability: [],
  },
  {
    id: "maria",
    name: "Maria Thomas",
    gender: "Female",
    appointment: "Sister",
    roles: ["Conversation", "FollowingUp", "Disciples"],
    exceptions: {},
    availability: [],
  },
  {
    id: "anna",
    name: "Anna Joseph",
    gender: "Female",
    appointment: "Sister",
    roles: ["Conversation", "Assistant"],
    exceptions: {},
    availability: [],
  },
];
const demoProgram = (): Program => ({
  reading: t("oclm.demoReading"),
  sourceMonth: new Date().toISOString().slice(0, 7),
  reviewed: true,
  parts: [
    {
      id: "BibleReading",
      title: t("oclm.demoReading"),
      type: "BibleReading",
      section: "treasures",
      minutes: 4,
      assistant: false,
    },
    {
      id: "Conversation",
      title: t("oclm.demoConversation"),
      type: "Conversation",
      section: "field",
      minutes: 3,
      assistant: true,
    },
    {
      id: "BibleStudy",
      title: t("oclm.demoStudy"),
      type: "BibleStudy",
      section: "living",
      minutes: 30,
      assistant: false,
      reader: true,
    },
  ],
});
const blank = (): ScheduleDraft => ({
  v: 3,
  personnel: demo ? samplePersonnel : [],
  assignments: {},
  additionalDuties: [],
  programs: demo ? { [format(new Date(), "RRRR-'W'II")]: demoProgram() } : {},
  template: "modern",
});
export function Midweek({
  context: c,
  duties = false,
}: {
  context: Context;
  duties?: boolean;
}) {
  const repo = React.useMemo(
    () => repositories(storeFor(c.cong, c.roles), c.cong, demo),
    [c.cong],
  );
  const [week,setWeek]=useScheduleWeek();
  const [draft, setDraft] = React.useState<ScheduleDraft>(blank),
    [revision, setRevision] = React.useState(0),
    [version, setVersion] = React.useState(0),
    [busy, setBusy] = React.useState(false),
    [dirty, setDirty] = React.useState(false),
    [error, setError] = React.useState(""),
    [link, setLink] = React.useState(""),
    [dutyName, setDutyName] = React.useState("");
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({
      pending: 0,
      conflicts: 0,
      forbidden: 0,
    }),
    [review, setReview] = React.useState(false),
    [proposal, setProposal] = React.useState<
      ScheduleDraft["assignments"] | null
    >(null),
    [undo, setUndo] = React.useState<ScheduleDraft["assignments"] | null>(null);
  React.useEffect(() => {
    if (demo) return;
    let active = true;
    const update = () =>
      void storeFor(c.cong, c.roles)
        .status()
        .then((value) => {
          if (active) setSyncStatus(value);
        })
        .catch((error)=>{handleError(error,{scope:"features/Midweek.tsx",severity:'warning'});});
    update();
    const unsubscribe = subscribeStores(update);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [c.cong]);
  const allowed = c.roles.some((r) => ["admin", "oclm"].includes(r));
  const query = useQuery({
    queryKey: ["midweek", c.cong],
    queryFn: () => repo.schedules.get(),
    enabled: !demo && allowed,
  });
  const meeting = useQuery({
    queryKey: ["meeting-settings", c.cong],
    queryFn: async () =>
      demo
        ? { settings: { midweek_day: 3, midweek_time: "19:00" } }
        : await rpc("ca_v3_meeting_context", { p_cong_id: c.cong }),
    enabled: allowed,
  });
  const roster = useQuery({
    queryKey: ["midweek-roster", c.cong],
    queryFn: () => repo.schedules.roster(),
    enabled: !demo && allowed,
  });
  React.useEffect(() => {
    if (query.data && !dirty) {
      setDraft(query.data.draft || blank());
      setRevision(query.data.revision);
      setVersion(query.data.publication?.version || 0);
      if (query.data.publication?.token)
        setLink(
          location.origin +
            import.meta.env.BASE_URL +
            "?form=schedule#token=" +
            encodeURIComponent(query.data.publication.token),
        );
    }
  }, [query.data]);
  const change = (value: ScheduleDraft) => {
    setDraft(value);
    setDirty(true);
  };
  const weekSlots = draft.assignments[week] || {};
  const parsedProgram = programSchema.safeParse(draft.programs?.[week]),
    program = parsedProgram.success ? parsedProgram.data : null;
  const auxiliary = program?.auxiliary === true;
  const day = Number(meeting.data?.settings?.midweek_day ?? 1),
    selectedDate =
      program?.meetingDate ||
      new Date(
        new Date(monday(week) + "T00:00:00Z").getTime() +
          ((day + 6) % 7) * 86400000,
      )
        .toISOString()
        .slice(0, 10),
    startTime =
      program?.startTime || meeting.data?.settings?.midweek_time || "19:00";
  const usedDate = (key: string) => {
    const historical = programSchema.safeParse(draft.programs?.[key]);
    return historical.success && historical.data.meetingDate
      ? historical.data.meetingDate
      : "week of " + monday(key);
  };
  const selectPerson = (
    slot: string,
    type: string,
    title: string,
    partner?: (typeof draft.personnel)[number],
  ) => {
    const activeAssignments = auxiliary
      ? draft.assignments
      : {
          ...draft.assignments,
          [week]: Object.fromEntries(
            Object.entries(draft.assignments[week] || {}).filter(
              ([key]) => !isAuxiliarySlot(key),
            ),
          ),
        };
    const choices = candidates(
      draft.personnel,
      activeAssignments,
      week,
      slot,
      type,
      partner,
    );
    const other = [...choices]
      .sort((a, b) => compareAssignmentRecency(a.last, b.last))
      .map((person) => {
        const assigned = Object.entries(activeAssignments[week] || {}).filter(
          ([key, a]) =>
            key !== slot &&
            a.personId === person.id &&
            !["cancelled", "reassigned"].includes(a.status || ""),
        );
        const recency = assignmentRecency(person.last);
        return {
          id: person.id,
          name: person.name,
          detail:
            recency.label +
            (recency.exact ? " · " + usedDate(recency.exact) : "") +
            " · " +
            type +
            " · " +
            t("refine.overall") +
            (person.overall ? usedDate(person.overall) : t("oclm.never")),
          caution: assigned.length
            ? (assigned.some(
                ([key]) =>
                  key.replace(
                    /AuxAssistant$|AssistantAux$|Aux$|Assistant$/,
                    "",
                  ) ===
                    slot.replace(
                      /AuxAssistant$|AssistantAux$|Aux$|Assistant$/,
                      "",
                    ) && key.includes("Aux") !== slot.includes("Aux"),
              )
                ? t("refine.timing")
                : "") +
              t("refine.also") +
              assigned
                .map(
                  ([key, a]) =>
                    (program?.parts.find(
                      (part) =>
                        part.id ===
                        key.replace(
                          /AuxAssistant$|AssistantAux$|Aux$|Assistant$/,
                          "",
                        ),
                    )?.title ||
                      a.customTitle ||
                      key) +
                    (key.endsWith("Assistant")
                      ? " · " + t("oclm.assistant")
                      : "") +
                    " (" +
                    (key.includes("Aux")
                      ? "Auxiliary classroom"
                      : "Main hall") +
                    ")",
                )
                .join(" · ")
            : undefined,
        };
      });
    return (
      <AssignmentPicker
        key={slot}
        label={title}
        disabled={type === "Assistant" && !partner}
        value={draft.assignments[week]?.[slot]?.personId || ""}
        choices={other}
        onChange={(person) => {
          const personId = person || null,
            assigned = {
              ...draft.assignments[week],
              [slot]: {
                personId,
                assignmentType: type,
                customTitle: title,
                status: "scheduled",
              },
            },
            paired = assigned[slot + "Assistant"];
          if (type !== "Assistant" && paired?.personId) {
            const student = draft.personnel.find((p) => p.id === personId),
              assistant = draft.personnel.find((p) => p.id === paired.personId);
            if (
              !student ||
              student.gender !== assistant?.gender ||
              student.id === assistant?.id
            )
              assigned[slot + "Assistant"] = {
                personId: null,
                assignmentType: "Assistant",
                customTitle: title,
                status: "scheduled",
              };
          }
          change({
            ...draft,
            assignments: { ...draft.assignments, [week]: assigned },
          });
        }}
      />
    );
  };
  async function downloadSchedule() {
    if (!program) return;
    setBusy(true);
    setError("");
    try {
      offerPDF(
        await runPDF("meetingPDF", null, [
          {
            name: c.name,
            week,
            date: selectedDate,
            program,
            assignments: draft.assignments,
            people: draft.personnel,
            start: startTime,
          },
        ]),
        "S-140_" + week + ".pdf",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function slip(
    part: Program["parts"][number],
    hall: string,
    copies: number,
    share = false,
  ) {
    if (!program) return;
    setBusy(true);
    setError("");
    try {
      const key = part.id + (hall === "main" ? "" : "Aux"),
        person = draft.personnel.find(
          (person) => person.id === draft.assignments[week]?.[key]?.personId,
        ),
        assistant = draft.personnel.find(
          (person) =>
            person.id ===
            draft.assignments[week]?.[key + "Assistant"]?.personId,
        );
      if (!person) throw Error(t("oclm.needsPerson"));
      const bytes = await runPDF("assignmentPDF", null, [
          {
            name: person.name,
            assistant: assistant?.name || "",
            date: selectedDate,
            part: String(program.parts.indexOf(part) + 1) + " · " + part.title,
            hall,
            copies,
            classrooms: program.auxiliary ? 2 : 1,
          },
        ]),
        filename =
          "S-89_" +
          person.name +
          "_" +
          selectedDate +
          (copies === 2 ? "-two-copies" : "") +
          ".pdf";
      if (share) {
        const file = new File([Uint8Array.from(bytes).buffer], filename, {
          type: "application/pdf",
        });
        if (navigator.canShare?.({ files: [file] }))
          await navigator.share({ files: [file], title: "Meeting assignment" });
        else {
          offerPDF(bytes, filename);
          c.notify(
            "Attach the downloaded PDF in WhatsApp. No message has been sent.",
          );
        }
      } else offerPDF(bytes, filename);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(publish = false) {
    setBusy(true);
    setError("");
    try {
      let rev = revision;
      if (demo) {
        rev++;
        setRevision(rev);
      } else {
        const saved = await repo.schedules.save(
          revision,
          program
            ? {
                ...draft,
                programs: {
                  ...draft.programs,
                  [week]: { ...program, meetingDate: selectedDate, startTime },
                },
              }
            : draft,
        );
        rev = saved.revision;
        setRevision(rev);
        setDraft(saved.draft);
      }
      setDirty(false);
      if (publish) {
        if (demo) {
          setVersion((v) => v + 1);
          c.notify("Fictional schedule published in this demo.");
        } else {
          const value = await repo.schedules.publish(week, rev, version);
          const pubVersion = Number(value.version || 0);
          if (pubVersion) setVersion(pubVersion);
          if (value.token)
            setLink(
              location.origin +
                import.meta.env.BASE_URL +
                "?form=schedule#token=" +
                encodeURIComponent(String(value.token)),
            );
          c.notify("Midweek schedule published.");
          await query.refetch();
        }
      } else c.notify(demo ? "Midweek draft saved." : t("store.pending"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const localCopy = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ revision, draft }, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "midweek-local-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  async function loadShared() {
    setBusy(true);
    setError("");
    try {
      const value = await storeFor(c.cong, c.roles).acceptShared(
        {
          source: {
            kind: "rpc",
            name: "get_oclm_workspace",
            args: { p_cong_id: c.cong },
          },
          cacheKey: "schedule",
        },
        scheduleSchema,
      );
      setDraft(value.draft || blank());
      setRevision(value.revision);
      setVersion(value.publication?.version || 0);
      setDirty(false);
      setReview(false);
      await query.refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <section className="card">
        <h2>{t("ui.your.published.schedule.759c9c43")}</h2>
        <p>{t("ui.use.the.live.schedule.link.shared.by.your..d2b98718")}</p>
      </section>
    );
  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <h2>{t("oclm.assignments")}</h2>
          <p>{t("oclm.assignOnly")}</p>
        </div>
        <label>
          {t("oclm.week")}
          <input
            type="week"
            required
            value={week}
            onChange={(e) => {
              if (e.target.value) {
                setWeek(e.target.value);
              }
            }}
          />
        </label>
      </div>
      {(error || query.error || roster.error) && (
        <p role="alert" className="banner">
          {error || (query.error || roster.error)?.message}
        </p>
      )}
      {!demo &&
        (syncStatus.pending > 0 ||
          syncStatus.conflicts > 0 ||
          syncStatus.forbidden > 0) && (
          <div className="banner stack" role="status">
            <p>
              {t(
                syncStatus.forbidden
                  ? "store.accessChanged"
                  : syncStatus.conflicts
                    ? "store.reviewRevision"
                    : "store.pending",
              )}
            </p>
            <div className="actions">
              <Button onClick={localCopy} type="button">{t("store.localCopy")}</Button>
              {(syncStatus.conflicts > 0 || syncStatus.forbidden > 0) && (
                <Button onClick={() => setReview(true)} type="button">
                  {t("store.loadShared")}
                </Button>
              )}
            </div>
          </div>
        )}
      {!demo && query.isSuccess && (
        <StaticMeetingImport
          week={week}
          onImport={(imported) => {
            setDraft((current) => {
              const saved = programSchema.safeParse(current.programs?.[week]);
              return {
                ...current,
                programs: {
                  ...current.programs,
                  [week]: refreshProgram(
                    saved.success ? saved.data : null,
                    imported,
                  ),
                },
              };
            });
            setDirty(true);
          }}
        />
      )}
      {c.roles.includes("admin") && !program?.sourceUrl && (
        <ManualMeetingParts
          onSave={(program) =>
            change({
              ...draft,
              programs: { ...draft.programs, [week]: program },
            })
          }
        />
      )}
      <Disclosure className="card">
        <DisclosureLabel>{t("oclm.roster")}</DisclosureLabel>
        <p>{t("oclm.qualifications")}</p>
        {!demo &&
          roster.data
            ?.filter(
              (p) => !draft.personnel.some((person) => person.id === p.id),
            )
            .map((p) => (
              <div className="list-row" key={p.id}>
                <strong>{p.name}</strong>
                <Button
                  onClick={() =>
                    change({
                      ...draft,
                      personnel: [
                        ...draft.personnel,
                        {
                          id: p.id,
                          publisherId: p.id,
                          name: p.name,
                          gender: p.gender,
                          appointment: p.isElder
                            ? "Elder"
                            : p.isMS
                              ? "MS"
                              : p.gender === "Female"
                                ? "Sister"
                                : "Other",
                          roles: [],
                          exceptions: {},
                          availability: [],
                        },
                      ],
                    })
                  } type="button"
                >
                  {t("oclm.addRoster")}
                </Button>
              </div>
            ))}
        {draft.personnel.map((person) => (
          <Disclosure key={person.id}>
            <DisclosureLabel>{person.name}</DisclosureLabel>
            <div className="form-grid">
              {[
                "Chairman",
                "Prayer",
                "TreasuresTalk",
                "SpiritualGems",
                "BibleReading",
                "Conversation",
                "FollowingUp",
                "Disciples",
                "Beliefs",
                "Assistant",
                "ChristianParts",
                "BibleStudy",
                "BibleStudyReader",
              ].map((role) => (
                <label className="check" key={role}>
                  <input
                    type="checkbox"
                    checked={Boolean(
                      (
                        person.exceptions as Record<string, boolean> | undefined
                      )?.[role] ??
                      (person.appointment === "Elder" ||
                        (person.appointment === "MS" && role !== "Chairman") ||
                        (person.appointment === "Sister" &&
                          [
                            "Conversation",
                            "FollowingUp",
                            "Disciples",
                            "Beliefs",
                            "Assistant",
                          ].includes(role)) ||
                        (Array.isArray(person.roles) &&
                          person.roles.includes(role))),
                    )}
                    onChange={(e) =>
                      change({
                        ...draft,
                        personnel: draft.personnel.map((p) =>
                          p.id === person.id
                            ? {
                                ...p,
                                exceptions: {
                                  ...((p.exceptions as object) || {}),
                                  [role]: e.target.checked,
                                },
                              }
                            : p,
                        ),
                      })
                    }
                  />
                  {role}
                </label>
              ))}
            </div>
          </Disclosure>
        ))}
      </Disclosure>
      <div className="card form-grid">
        <label>
          {t("oclm.date")}
          <input
            type="date"
            value={selectedDate}
            min={monday(week)}
            max={new Date(
              new Date(monday(week) + "T00:00:00Z").getTime() + 6 * 86400000,
            )
              .toISOString()
              .slice(0, 10)}
            disabled={!program}
            onChange={(e) =>
              program &&
              e.target.value &&
              e.target.validity.valid &&
              change({
                ...draft,
                programs: {
                  ...draft.programs,
                  [week]: { ...program, meetingDate: e.target.value },
                },
              })
            }
          />
        </label>
        <label>
          {t("oclm.start")}
          <input
            type="time"
            value={startTime}
            disabled={!program}
            onChange={(e) =>
              program &&
              e.target.value &&
              e.target.validity.valid &&
              change({
                ...draft,
                programs: {
                  ...draft.programs,
                  [week]: { ...program, startTime: e.target.value },
                },
              })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={auxiliary}
            disabled={!program}
            onChange={(e) =>
              program &&
              change({
                ...draft,
                programs: {
                  ...draft.programs,
                  [week]: { ...program, auxiliary: e.target.checked },
                },
              })
            }
          />
          {t("oclm.enableAux")}
        </label>
      </div>
      {program ? (
        <>
          <div className="card stack">
            <h3>{t("oclm.officers")}</h3>
            <div className="form-grid">
              {selectPerson("Chairman", "Chairman", t("oclm.chairman"))}
              {selectPerson("OpeningPrayer", "Prayer", t("oclm.openingPrayer"))}
              {selectPerson("ClosingPrayer", "Prayer", t("oclm.closingPrayer"))}
              {auxiliary &&
                selectPerson(
                  "AuxiliaryCounselor",
                  "Chairman",
                  t("oclm.counselor"),
                )}
            </div>
            <Button
              onClick={() => {
                setProposal(
                  autoAssign(
                    draft.personnel,
                    draft.assignments,
                    week,
                    program.parts,
                    auxiliary,
                  ),
                );
              }} type="button"
            >
              {t("oclm.autoAssign")}
            </Button>
            <p>{t("refine.suggest0")}</p>
            <p>{t("refine.suggest1")}</p>
            <p>{t("refine.suggest2")}</p>
            {undo && (
              <Button
                onClick={() => {
                  change({ ...draft, assignments: undo });
                  setUndo(null);
                }} type="button"
              >
                {t("ui.undo.auto.assignment.ce885e40")}
              </Button>
            )}
          </div>
          {program.parts.map((part, index) => (
            <section className="card stack" key={part.id}>
              <h3>
                {index + 1}. {part.title} · {part.minutes} {t("oclm.minutes")}
              </h3>
              {(auxiliary &&
              [
                "BibleReading",
                "Conversation",
                "FollowingUp",
                "Disciples",
                "Beliefs",
              ].includes(part.type)
                ? ["main", "aux1"]
                : ["main"]
              ).map((hall) => {
                const key = part.id + (hall === "main" ? "" : "Aux"),
                  student = draft.personnel.find(
                    (p) => p.id === draft.assignments[week]?.[key]?.personId,
                  ),
                  assistant =
                    draft.assignments[week]?.[key + "Assistant"]?.personId;
                return (
                  <div className="stack" key={hall}>
                    <h4>
                      {t(hall === "main" ? "oclm.mainHall" : "oclm.auxHall")}
                    </h4>
                    <div className="form-grid">
                      {selectPerson(key, part.type, t("oclm.student"))}
                      {part.assistant &&
                        selectPerson(
                          key + "Assistant",
                          "Assistant",
                          t("oclm.assistant"),
                          student,
                        )}
                      {part.reader &&
                        selectPerson(
                          key + "Reader",
                          "BibleStudyReader",
                          t("oclm.reader"),
                        )}
                    </div>
                    {[
                      "BibleReading",
                      "Conversation",
                      "FollowingUp",
                      "Disciples",
                      "Beliefs",
                    ].includes(part.type) && (
                      <div className="actions">
                        <Button
                          disabled={busy || !student}
                          onClick={() => void slip(part, hall, 1)} type="button"
                        >
                          {t("oclm.s89Student")}
                        </Button>
                        <Button
                          disabled={busy || !student}
                          onClick={() =>
                            void slip(
                              part,
                              hall,
                              part.assistant && assistant ? 2 : 1,
                              true,
                            )
                          } type="button"
                        >
                          {t("ui.send.on.whatsapp.58c29887")}
                        </Button>
                        {part.assistant && (
                          <Button
                            disabled={busy || !student || !assistant}
                            onClick={() => void slip(part, hall, 2)} type="button"
                          >
                            {t("oclm.s89Both")}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
          <OclmSchedule
            date={selectedDate}
            name={c.name}
            week={week}
            program={program}
            assignments={draft.assignments}
            people={draft.personnel}
            start={startTime}
          />
        </>
      ) : (
        <section className="card">
          <p>{t("oclm.noProgram")}</p>
        </section>
      )}
      <div className="actions">
        <Button disabled={busy || query.isLoading} onClick={() => void save()} type="button">
          {t("oclm.save")}
        </Button>
        <Button
          disabled={busy || query.isLoading || !program}
          className="primary"
          onClick={() => void save(true)} type="button"
        >
          {t("oclm.publish")}
        </Button>
        <Button
          disabled={busy || !program}
          onClick={() => void downloadSchedule()} type="button"
        >
          {t("oclm.download")}
        </Button>
      </div>
      <p className="muted">
        {t("oclm.revision")} {revision} · {t("oclm.version")} {version}
        {dirty ? " · " + t("oclm.unsaved") : ""}
      </p>
      {link && (
        <div className="stack">
          <label>
            {t("oclm.liveLink")}
            <input value={link} readOnly />
          </label>
          <div className="actions">
            <a href={link}>{t("oclm.openLive")}</a>
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(link)
                  .then(() => c.notify(t("common.copied")))
                  .catch(() => setError(t("oclm.copyFailed")))
              } type="button"
            >
              {t("common.copy")}
            </Button>
          </div>
        </div>
      )}
      <Dialog
        open={!!proposal}
        onClose={() => setProposal(null)}
        title={t("ui.review.auto.assignment.6f5b3870")}
      >
        {proposal && (
          <div className="stack">
            <ul>
              {Object.entries(proposal[week] || {}).map(
                ([slot, assignment]) => (
                  <li key={slot}>
                    {assignment.customTitle || slot}:{" "}
                    {draft.personnel.find((p) => p.id === assignment.personId)
                      ?.name || "No suitable person"}
                  </li>
                ),
              )}
            </ul>
            <p>{t("refine.autoHelp")}</p>
            <Button
              onClick={() => {
                setUndo(draft.assignments);
                change({ ...draft, assignments: proposal });
                setProposal(null);
              }} type="button"
            >
              {t("ui.accept.proposal.c7dbe4a7")}
            </Button>
            <Button onClick={() => setProposal(null)} type="button">
              {t("ui.cancel.19766ed6")}
            </Button>
          </div>
        )}
      </Dialog>
      <Dialog
        open={review}
        onClose={() => setReview(false)}
        title={t("store.reviewTitle")}
      >
        <div className="stack">
          <p>{t("store.reviewBody")}</p>
          <p>{t("refine.sharedReview1")}</p>
          <p>{t("refine.sharedReview2")}</p>
          <Button onClick={localCopy} type="button">{t("store.localCopy")}</Button>
          <Button disabled={busy} onClick={() => void loadShared()} type="button">
            {t("store.confirmShared")}
          </Button>
          {error && <p role="alert">{error}</p>}
        </div>
      </Dialog>
    </section>
  );
}
