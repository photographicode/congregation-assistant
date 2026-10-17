import React, { useState, useEffect, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfWeek, addWeeks } from "date-fns";
import {
  CalendarDays,
  Users,
  ArrowRight,
  Plus,
  FileDown,
  Check,
  Shield,
  ClipboardList,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { Dialog } from "../../../../packages/ui/Dialog";
import { Context } from "../main";
import { client, demo, rpc, config } from "./client";
import { useAppearance } from "./store";
import {
  weekendDefaults,
  assignmentConflicts,
  normalizeEmail,
  groupKey,
  parseDelimited,
  mapImport,
  parseVCard,
  reviewImport,
  phoneE164,
  formatMessage,
  whatsappURL,
} from "./model.mjs";
import { Greeting } from "../../../../packages/ui/Greeting";
import {EmergencyContacts} from "./EmergencyContacts";
import {Dashboard} from "./Dashboard";
import {ExperienceProfile} from "./ExperienceProfile";
import {ThemeGallery} from "./ThemeGallery";
import {ExperiencePicker} from "./ExperiencePicker";
import { Reports } from "./Reports";
import { Midweek } from "./Midweek";
import { PublisherHome } from "./PublisherHome";
import { Access } from "./Access";
import { Backup } from "./Backup";
import {Subscription} from "./Subscription";
import { RecordsExport } from "./RecordsExport";
import { Sessions } from "./Sessions";
import catalogue from "../../../../capabilities.json";
const PdfStudio=lazy(()=>import("./PdfStudio"));
type Person = {
  id: string;
  name: string;
  group: string;
  email: string;
  phone: string;
  address: string;
  gender?: string;
  isElder?: boolean;
  isMS?: boolean;
  expected_login?: string[];
  dob?: string; baptized?: string; hope?: string; familyHeadId?: string; emergencyName?: string; emergencyRelationship?: string; emergencyPhone?: string; spiritualStatus?: string; isRP?: boolean; isSP?: boolean; isFM?: boolean;
};
const samplePeople: Person[] = [
  {
    id: "maria",
    name: "Maria Thomas",
    group: "Group 1",
    email: "maria@example.com",
    phone: "+919876543210",
    address: "",
  },
  {
    id: "daniel",
    name: "Daniel Thomas",
    group: "Group 1",
    email: "maria@example.com",
    phone: "",
    address: "",
    isElder: true,
  },
  {
    id: "samuel",
    name: "Samuel George",
    group: "Group 2",
    email: "samuel@example.com",
    phone: "+919876543211",
    address: "",
    isMS: true,
  },
  {
    id: "anna",
    name: "Anna Joseph",
    group: "Group 2",
    email: "",
    phone: "",
    address: "",
  },
];
const initialGroups = [
  { id: "g1", name: "Group 1" },
  { id: "g2", name: "Group 2" },
];
const weekKey = (d: Date) =>
  format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="card empty">
      <ClipboardList aria-hidden="true" />
      <h2>{title}</h2>
      <p>{detail}</p>
    </div>
  );
}
function Pending({ name }: { name: string }) {
  return (
    <Empty
      title="Update pending"
      detail={`${name} will be available when its database migration is applied. Ask your administrator to apply the database update.`}
    />
  );
}
function download(value: unknown, name: string, type = "application/json") {
  const url = URL.createObjectURL(
    new Blob(
      [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
      { type },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Workspace({
  route,
  go,
  context: c,
}: {
  route: string;
  go: (s: string) => void;
  context: Context;
}) {
  const [people, setPeople] = useState<Person[]>(demo ? samplePeople : []),
    [groups, setGroups] = useState<any[]>(demo ? initialGroups : []),
    [sub, setSub] = useState(()=>sessionStorage.getItem("ca-workspace-tool")||"midweek"),
    [editing, setEditing] = useState<Person | null>(null),
    [dirty, setDirty] = useState(false),
    [shared, setShared] = useState(false),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wizard, setWizard] = useState(false),
    [wizardStep, setWizardStep] = useState(0),
    [setup, setSetup] = useState<any>({
      name: c.name,
      country: "IN",
      language: "en",
      timezone: demo ? "Asia/Kolkata" : Intl.DateTimeFormat().resolvedOptions().timeZone,
      midweek: "Wednesday",
      weekend: "Sunday",
      midweekTime: "19:00",
      weekendTime: "10:00",
      delivery: "digital",
      privacy: "standard",
      portal: true,
      groupCount: 2,
    }),
    [week, setWeek] = useState(weekKey(new Date())),
    [weekend, setWeekend] = useState<any>(weekendDefaults(week)),
    [weekendDirty, setWeekendDirty] = useState(false),
    [weekendRevision, setWeekendRevision] = useState(0),
    [published, setPublished] = useState(""),
    [groupName, setGroupName] = useState(""),
    [importText, setImportText] = useState(""),
    [importRows, setImportRows] = useState<any[]>([]),
    [importUndo, setImportUndo] = useState<string>(""),
    [template, setTemplate] = useState(
      "Hello {name}, your assignment is {part} on {date}. Schedule: {link}",
    ),
    [messageValues, setMessageValues] = useState({
      name: "",
      part: "",
      date: format(new Date(), "d MMM yyyy"),
      link: "",
    }),
    [queue, setQueue] = useState<Person[]>([]),
    [queueIndex, setQueueIndex] = useState(0),
    [layout, setLayout] = useState("week"),
    [printScale, setPrintScale] = useState("100"),
    [moreDetails, setMoreDetails] = useState(false);
  const appearance = useAppearance(),
    admin = c.roles.includes("admin"),
    canPeople = admin || c.roles.includes("field_service"),
    canWeekend = admin || c.roles.includes("weekend");
  useEffect(()=>{const open=(event:Event)=>{const value=(event as CustomEvent<string>).detail;if(['groups','import','midweek','weekend','duties'].includes(value))setSub(value);sessionStorage.removeItem('ca-workspace-tool');};window.addEventListener('ca:open-tool',open);return()=>window.removeEventListener('ca:open-tool',open);},[]);
  const peopleQuery = useQuery({
    queryKey: ["v2-people", c.cong],
    enabled: !demo && canPeople,
    queryFn: async () => {
      if (admin) return await rpc("ca_v2_people", { p_cong_id: c.cong });
      const { data, error } = await client
        .from("publishers")
        .select("id,name,service_group,phone,address,gender,is_elder,is_ms")
        .eq("cong_id", c.cong)
        .is("transferred_at", null)
        .order("name");
      if (error) throw Error(error.message);
      return (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        group: p.service_group || "",
        email: "",
        phone: p.phone || "",
        address: p.address || "",
        gender: p.gender,
        isElder: p.is_elder,
        isMS: p.is_ms,
      }));
    },
  });
  useEffect(() => {
    if (peopleQuery.data) setPeople(peopleQuery.data as Person[]);
  }, [peopleQuery.data]);
  useEffect(() => {
    if (!demo && c.caps.groups && c.roles.some(role=>["admin","field_service","oclm","weekend","group_overseer"].includes(role)))
      rpc("ca_v2_groups", { p_cong_id: c.cong })
        .then(setGroups)
        .catch((e) => setError(e.message));
    if (!demo && c.caps.setup && admin)
      rpc("ca_v2_get_setup", { p_cong_id: c.cong })
        .then((data) => {
          if (data) {
            setSetup((s: any) => ({ ...s, ...data.data }));
            setWizardStep(data.step || 0);
          }
        })
        .catch((e) => setError(e.message));
  }, [c.cong, c.caps.groups, c.caps.setup]);
  useEffect(() => {
    setWeekend(weekendDefaults(week));
    setWeekendDirty(false);
    setWeekendRevision(0);
    setPublished("");
    if (!demo && c.caps.weekend && canWeekend) {
      rpc("ca_v2_get_weekend", { p_cong_id: c.cong, p_week: week })
        .then((data) => {
          if (data) {
            setWeekend({ ...weekendDefaults(week), ...data.data });
            setWeekendRevision(data.revision);
            setPublished(data.public_url || "");
          }
        })
        .catch((e) => setError(e.message));
    }
  }, [week, c.caps.weekend]);
  useEffect(() => {
    setError("");
    setQuery("");
  }, [route]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not complete this action. Your work is kept.",
      );
    } finally {
      setBusy(false);
    }
  };
  async function edit(person: Person) {
    setEditing({ ...person });
    setDirty(false);
    setShared(false);
    if (!demo && admin)
      await run(async () => {
        const emails = await rpc("get_publisher_login", {
          p_cong_id: c.cong,
          p_publisher_id: person.id,
        });
        setEditing((p) =>
          p?.id === person.id
            ? { ...p, email: emails?.[0] || "", expected_login: emails }
            : p,
        );
      });
  }
  const household = editing?.email
    ? people.filter(
        (p) =>
          p.id !== editing.id &&
          normalizeEmail(p.email) === normalizeEmail(editing.email),
      )
    : [];
  async function savePerson() {
    if (!editing) return;
    const person = {
      ...editing,
      email: normalizeEmail(editing.email),
      expected_login: editing.expected_login || [],
      name: editing.name.trim(),
    };
    if (!person.name) throw Error("Name is required.");
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
      throw Error("Use a valid email.");
    if (household.length && !shared)
      throw Error("Confirm household reporting or use a different email.");
    if (person.phone) person.phone = phoneE164(person.phone, setup.country);
    if (!demo) {
      if (!c.caps.people)
        throw Error(
          "Database update required for atomic publisher and email saves.",
        );
      await rpc("ca_v2_save_person", {
        p_cong_id: c.cong,
        p_person: person,
        p_shared: shared,
      });
    }
    setPeople((current) => {
      const index = current.findIndex((x) => x.id === person.id);
      return index < 0
        ? [...current, person]
        : current.map((p) => (p.id === person.id ? person : p));
    });
    setDirty(false);
    setEditing(null);
    c.notify("Publisher and sign-in email saved.");
  }
  async function saveWeekend(publish = false) {
    if (!demo) {
      const result = await rpc(
        publish ? "ca_v2_publish_weekend" : "ca_v2_save_weekend",
        {
          p_cong_id: c.cong,
          p_week: week,
          p_data: weekend,
          p_revision: weekendRevision,
        },
      );
      setWeekendRevision(result.revision);
      if (publish)
        if (result.token)
          setPublished(
            location.origin + import.meta.env.BASE_URL + "?form=weekend#token=" + encodeURIComponent(result.token),
          );
    } else {
      setWeekendRevision((r) => r + 1);
      if (publish) setPublished("Demo preview only — no live link is created.");
    }
    setWeekendDirty(false);
    c.notify(publish ? "Weekend schedule published." : "Weekend draft saved.");
  }
  const changeWeekend = (key: string, value: any) => {
    setWeekend((s: any) => ({ ...s, [key]: value }));
    setWeekendDirty(true);
  };
  async function saveSetup(next: number) {
    if (!demo) {
      if (!c.caps.setup)
        throw Error("Update pending. Setup progress cannot be saved yet.");
      await rpc("ca_v2_save_setup", {
        p_cong_id: c.cong,
        p_step: next,
        p_data: setup,
      });
    }
    setWizardStep(next);
    setDirty(false);
  }
  function review(text = importText, vcf = false) {
    const records = vcf ? parseVCard(text) : mapImport(parseDelimited(text));
    setImportRows(reviewImport(records, groups, people, setup.country));
  }
  async function saveImport() {
    const rows = importRows.filter((r) => r.include);
    if (!rows.length) throw Error("Select at least one valid row.");
    if (rows.some((r) => r.issues.length))
      throw Error("Fix flagged rows before importing.");
    if (!demo) {
      if (!c.caps.people)
        throw Error("Database update required for import saves.");
      const data = await rpc("ca_v2_import_people", {
        p_cong_id: c.cong,
        p_rows: rows,
      });
      setImportUndo(data.batch_id);
      await peopleQuery.refetch();
    } else {
      const id = crypto.randomUUID();
      setImportUndo(id);
      setPeople((p) => [
        ...p,
        ...rows.map((r) => ({ ...r, id: id + ":" + r.index })),
      ]);
    }
    setImportRows([]);
    c.notify(`${rows.length} people imported.`);
  }
  async function undoImport() {
    if (!demo) {
      await rpc("ca_v2_undo_import", {
        p_cong_id: c.cong,
        p_batch_id: importUndo,
      });
      await peopleQuery.refetch();
    } else
      setPeople((p) => p.filter((x) => !x.id.startsWith(importUndo + ":")));
    setImportUndo("");
    c.notify("Import undone.");
  }
  function weekendView(print = false) {
    return (
      <section className="card">
        <div className="eyebrow">
          Weekend meeting ·{" "}
          {format(new Date(week + "T12:00:00"), "d MMMM yyyy")}
        </div>
        <h2>{c.name}</h2>
        {weekend.exception !== "normal" && (
          <p>{weekend.exception.replaceAll("_", " ")}</p>
        )}
        <div className="list">
          {[
            ["Chairman", weekend.chairman],
            ["Opening song", weekend.openingSong],
            ["Public talk", weekend.talkTitle || "Talk title not entered"],
            [
              "Speaker",
              weekend.speaker +
                (weekend.speakerCongregation
                  ? " · " + weekend.speakerCongregation
                  : ""),
            ],
            ["Watchtower Study", weekend.articleTitle],
            ["Conductor", weekend.conductor],
            ["Reader", weekend.reader],
            ["Closing song", weekend.closingSong],
            ["Concluding prayer", weekend.prayer],
            ...(weekend.duties || []).map((d: any) => [d.name, d.people]),
          ].map(([label, value], i) => (
            <div key={i} className="list-row">
              <strong>{label}</strong>
              <span>{value || "Unassigned"}</span>
            </div>
          ))}
        </div>
        {print && (
          <p className="muted">
            Independent and unofficial · Congregation Assistant
          </p>
        )}
      </section>
    );
  }
  let body: React.ReactNode;
  if (route === "pdf") body=<Suspense fallback={<p role="status">Opening PDF Studio…</p>}><PdfStudio context={c}/></Suspense>;
  else if (route === "home" && c.roles.includes("publisher") && !admin) body = <PublisherHome context={c} go={go}/>;
  else if (route === "home") body=<Dashboard context={c} go={go} setup={setup} addPublisher={()=>{setEditing({id:crypto.randomUUID(),name:"",group:groups[0]?.name||"",email:"",phone:"",address:""});setDirty(false);setShared(false);}}/>;
  else if (route === "emergency" && admin) body=<EmergencyContacts people={people} loading={!demo&&peopleQuery.isPending} error={peopleQuery.error?.message} openPDF={()=>{sessionStorage.setItem("ca-pdf-open","emergency");go("pdf");}}/>;
  else if (route === "people")
    body = (
      <>
        <Heading eyebrow="People" title="A place for everyone.">
          {admin && (
            <button
              className="primary"
              onClick={() => {
                setEditing({
                  id: crypto.randomUUID(),
                  name: "",
                  group: groups[0]?.name || "",
                  email: "",
                  phone: "",
                  address: "",
                });
                setDirty(false);
                setShared(false);
              }}
            >
              <Plus /> Add publisher
            </button>
          )}
        </Heading>
        <div className="segmented" role="group" aria-label="People sections">
          {["publishers", "groups", "import"].map((s) => (
            <button
              key={s}
              className={
                sub === s ||
                (s === "publishers" && !["groups", "import"].includes(sub))
                  ? "active"
                  : ""
              }
              onClick={() => setSub(s)}
            >
              {s === "import"
                ? "Import Center"
                : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {sub === "groups" ? (
          c.caps.groups ? (
            <section className="card stack">
              <h2>Service groups</h2>
              <p>
                Only the main administrator can create or rename groups.
                Publisher forms use this list.
              </p>
              {groups.map((g) => (
                <div className="list-row" key={g.id}>
                  <strong>{g.name}</strong>
                  <span className="chip">
                    {
                      people.filter(
                        (p) => groupKey(p.group) === groupKey(g.name),
                      ).length
                    }{" "}
                    people
                  </span>
                </div>
              ))}
              {admin && (
                <form
                  className="actions"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(async () => {
                      const name = groupName.trim().replace(/\s+/g, " ");
                      if (!name) throw Error("Name required.");
                      if (
                        groups.some((g) => groupKey(g.name) === groupKey(name))
                      )
                        throw Error("A group with this name already exists.");
                      const item = demo
                        ? { id: crypto.randomUUID(), name }
                        : await rpc("ca_v2_add_group", {
                            p_cong_id: c.cong,
                            p_name: name,
                          });
                      setGroups((g) => [...g, item]);
                      setGroupName("");
                      c.notify("Group created.");
                    });
                  }}
                >
                  <label>
                    Group name
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  </label>
                  <button disabled={busy}>Add group</button>
                </form>
              )}
            </section>
          ) : (
            <Pending name="Managed groups" />
          )
        ) : sub === "import" ? (
          <div className="stack">
            <section className="card stack">
              <h2>Import Center</h2>
              <p>
                Paste a spreadsheet or upload CSV or phone contacts. Review
                every row before saving.
              </p>
              <label>
                Spreadsheet rows
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    "Name\tPhone\tEmail\tGroup\nMaria Thomas\t+919876543210\tmaria@example.com\tGroup 1"
                  }
                />
              </label>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => run(async () => review())}
                >
                  Review rows
                </button>
                <label>
                  Upload CSV or vCard
                  <input
                    type="file"
                    accept=".csv,.vcf,.tsv"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        run(async () => {
                          const text = await f.text();
                          setImportText(text);
                          review(text, f.name.endsWith(".vcf"));
                        });
                    }}
                  />
                </label>
                <button
                  onClick={() =>
                    download(
                      "Name,Phone,Email,Group,Address\n",
                      "publisher-template.csv",
                      "text/csv",
                    )
                  }
                >
                  Sample template
                </button>
              </div>
              <details>
                <summary>Other formats</summary>
                <p>
                  XLSX and on-device paper scanning are pending. Export a
                  spreadsheet as CSV to use this importer.
                </p>
              </details>
            </section>
            {importRows.length > 0 && (
              <section className="card">
                <h2>Review {importRows.length} rows</h2>
                <div className="list">
                  {importRows.map((r, i) => (
                    <div className="card stack" key={i}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={r.include}
                          onChange={(e) =>
                            setImportRows((rows) =>
                              rows.map((x, j) =>
                                j === i
                                  ? { ...x, include: e.target.checked }
                                  : x,
                              ),
                            )
                          }
                        />
                        Include row {i + 1}
                      </label>
                      <div className="form-grid">
                        {["name", "email", "phone"].map((key) => (
                          <label key={key}>
                            {key[0].toUpperCase() + key.slice(1)}
                            <input
                              value={r[key]}
                              onChange={(e) =>
                                setImportRows((rows) =>
                                  rows.map((x, j) =>
                                    j === i
                                      ? { ...x, [key]: e.target.value }
                                      : x,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                        <label>
                          Group
                          <select
                            value={r.group}
                            onChange={(e) =>
                              setImportRows((rows) =>
                                rows.map((x, j) =>
                                  j === i ? { ...x, group: e.target.value } : x,
                                ),
                              )
                            }
                          >
                            <option value="">No group</option>
                            {groups.map((g) => (
                              <option key={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {r.issues.map((issue: string) => (
                        <p className="error" key={issue}>
                          {issue}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="actions">
                  <button
                    onClick={() =>
                      setImportRows((rows) =>
                        reviewImport(rows, groups, people, setup.country).map(
                          (x: any) => ({
                            ...x,
                            include: rows[x.index]?.include ?? x.include,
                          }),
                        ),
                      )
                    }
                  >
                    Recheck rows
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => run(saveImport)}
                  >
                    Import {importRows.filter((r) => r.include).length} selected
                  </button>
                </div>
              </section>
            )}
            {importUndo && (
              <div className="banner">
                Import complete.{" "}
                <button onClick={() => run(undoImport)}>Undo import</button>
                <p>Server undo is available for 7 days.</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <label className="search">
              Search people
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or group"
              />
            </label>
            {peopleQuery.isLoading ? (
              <p role="status">Loading people…</p>
            ) : peopleQuery.error ? (
              <p role="alert" className="error">
                {peopleQuery.error.message}
              </p>
            ) : people.length ? (
              <section className="card list">
                {people
                  .filter((p) =>
                    (p.name + " " + p.group)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((p) => (
                    <div className="list-row" key={p.id}>
                      <div>
                        <strong>{p.name}</strong>
                        <p>{p.group || "No group"}</p>
                        {p.email &&
                          people.filter((x) => x.email === p.email).length >
                            1 && (
                            <span className="chip">
                              Household (
                              {people.filter((x) => x.email === p.email).length}
                              )
                            </span>
                          )}
                      </div>
                      <button disabled={!admin} onClick={() => edit(p)}>
                        Edit<span className="sr-only"> {p.name}</span>
                      </button>
                    </div>
                  ))}
              </section>
            ) : (
              <Empty
                title="No people yet"
                detail="Add a publisher or review a spreadsheet in the Import Center."
              />
            )}
          </>
        )}
      </>
    );
  else if (route === "schedule")
    body = (
      <>
        <Heading eyebrow="Schedule" title="Make the week clear." />
        <div className="segmented" role="group" aria-label="Schedule sections">
          {["midweek", "weekend", "duties", "print"].map((s) => (
            <button
              key={s}
              className={sub === s ? "active" : ""}
              onClick={() => setSub(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        {sub === "weekend" ? (
          c.caps.weekend && canWeekend ? (
            <div className="stack">
              <div className="actions">
                <button
                  onClick={() => {
                    if (
                      weekendDirty &&
                      !confirm("Discard unsaved weekend changes?")
                    )
                      return;
                    setWeek(
                      weekKey(addWeeks(new Date(week + "T12:00:00"), -1)),
                    );
                  }}
                >
                  Previous week
                </button>
                <label>
                  Week starting
                  <input
                    type="date"
                    value={week}
                    onChange={(e) => {
                      if (!weekendDirty || confirm("Discard unsaved changes?"))
                        setWeek(
                          weekKey(new Date(e.target.value + "T12:00:00")),
                        );
                    }}
                  />
                </label>
                <button
                  onClick={() => {
                    if (weekendDirty && !confirm("Discard unsaved changes?"))
                      return;
                    setWeek(weekKey(addWeeks(new Date(week + "T12:00:00"), 1)));
                  }}
                >
                  Next week
                </button>
              </div>
              <section className="card stack">
                <div className="actions">
                  <span className="chip">
                    {weekendDirty
                      ? "Unsaved draft"
                      : weekendRevision
                        ? "Saved draft"
                        : "New week"}
                  </span>
                  <span className="chip">Revision {weekendRevision}</span>
                </div>
                <div className="form-grid">
                  <label>
                    Week exception
                    <select
                      value={weekend.exception}
                      onChange={(e) =>
                        changeWeekend("exception", e.target.value)
                      }
                    >
                      {[
                        "normal",
                        "circuit_overseer_visit",
                        "assembly",
                        "convention",
                        "memorial",
                        "no_meeting",
                        "rescheduled",
                      ].map((x) => (
                        <option key={x} value={x}>
                          {x.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Meeting time
                    <input
                      type="time"
                      value={weekend.meetingTime}
                      onChange={(e) =>
                        changeWeekend("meetingTime", e.target.value)
                      }
                    />
                  </label>
                  {["chairman", "speaker", "conductor", "reader", "prayer"].map(
                    (role) => (
                      <label key={role}>
                        {
                          (
                            {
                              chairman: "Chairman",
                              speaker: "Public talk speaker",
                              conductor: "Watchtower conductor",
                              reader: "Watchtower reader",
                              prayer: "Concluding prayer",
                            } as any
                          )[role]
                        }
                        <input
                          list="weekend-people"
                          value={weekend[role]}
                          onChange={(e) => changeWeekend(role, e.target.value)}
                          placeholder="Choose a person or enter a visitor"
                        />
                      </label>
                    ),
                  )}
                  <datalist id="weekend-people">
                    {people.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.isElder
                          ? "Elder"
                          : p.isMS
                            ? "Ministerial servant"
                            : p.group}
                      </option>
                    ))}
                  </datalist>
                  <label>
                    Speaker’s home congregation
                    <input
                      value={weekend.speakerCongregation}
                      onChange={(e) =>
                        changeWeekend("speakerCongregation", e.target.value)
                      }
                    />
                  </label>
                  <label className="full">
                    Public talk title
                    <input
                      value={weekend.talkTitle}
                      onChange={(e) =>
                        changeWeekend("talkTitle", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    Outline number
                    <input
                      value={weekend.outline}
                      onChange={(e) => changeWeekend("outline", e.target.value)}
                    />
                  </label>
                  <label>
                    Watchtower article title
                    <input readOnly value={weekend.articleTitle} />
                    <small>
                      Imported titles are read-only. Official data import is not
                      enabled.
                    </small>
                  </label>
                  {["openingSong", "closingSong"].map((key) => (
                    <label key={key}>
                      {key === "openingSong" ? "Opening song" : "Closing song"}
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={weekend[key]}
                        onChange={(e) =>
                          changeWeekend(key, Number(e.target.value))
                        }
                      />
                    </label>
                  ))}
                  <label className="full">
                    Notes
                    <textarea
                      value={weekend.notes}
                      onChange={(e) => changeWeekend("notes", e.target.value)}
                    />
                  </label>
                </div>
                <details>
                  <summary>Additional weekend duties</summary>
                  <div className="stack">
                    {weekend.duties.map((d: any, i: number) => (
                      <div className="form-grid" key={i}>
                        <label>
                          Duty
                          <input
                            value={d.name}
                            onChange={(e) =>
                              changeWeekend(
                                "duties",
                                weekend.duties.map((x: any, j: number) =>
                                  j === i ? { ...x, name: e.target.value } : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          People (up to four)
                          <input
                            value={d.people}
                            onChange={(e) =>
                              changeWeekend(
                                "duties",
                                weekend.duties.map((x: any, j: number) =>
                                  j === i
                                    ? { ...x, people: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        changeWeekend("duties", [
                          ...weekend.duties,
                          { name: "", people: "" },
                        ])
                      }
                    >
                      Add duty
                    </button>
                  </div>
                </details>
                {assignmentConflicts(weekend).map((text: string) => (
                  <div className="banner" key={text}>
                    {text}
                  </div>
                ))}
                <div className="actions">
                  <button
                    disabled={busy}
                    onClick={() => run(() => saveWeekend())}
                  >
                    Save draft
                  </button>
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => run(() => saveWeekend(true))}
                  >
                    Publish weekend
                  </button>
                  <button onClick={() => setSub("print")}>Print preview</button>
                </div>
                {published && (
                  <p role="status">
                    {published.startsWith("https:") ? (
                      <a
                        href={published}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open published schedule
                      </a>
                    ) : (
                      published
                    )}
                  </p>
                )}
              </section>
              {weekendView()}
            </div>
          ) : (
            <Pending name="Weekend assignments" />
          )
        ) : sub === "print" ? (
          <div className="stack">
            <section className="card no-print">
              <h2>Print Center</h2>
              <div className="form-grid">
                <label>
                  Layout
                  <select
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)}
                  >
                    <option value="week">Weekend one-week</option>
                    <option value="large">Weekend large print</option>
                  </select>
                </label>
                <label>
                  Font scale
                  <select
                    value={printScale}
                    onChange={(e) => setPrintScale(e.target.value)}
                  >
                    {["100", "125", "150", "175", "200"].map((x) => (
                      <option key={x} value={x}>
                        {x}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                Use your browser’s Print or Save as PDF. The preview below uses
                your selected size.
              </p>
              <div className="actions">
                <button className="primary" onClick={() => window.print()}>
                  Print / Save PDF
                </button>

              </div>
            </section>
            <div style={{ fontSize: Number(printScale) / 100 + "em" }}>
              {weekendView(true)}
            </div>
          </div>
        ) : (
          <Midweek context={c} duties={sub === "duties"} />
        )}
      </>
    );
  else if (route === "reports")
    body = (
      <>
        <Reports context={c} />
      </>
    );
  else if (route === "messages")
    body = (
      <>
        <Heading eyebrow="Messages" title="A thoughtful reminder." />
        <div className="grid">
          <section className="card stack">
            <h2>WhatsApp Smart Share</h2>
            <label>
              Template
              <select onChange={(e) => setTemplate(e.target.value)}>
                {[
                  "Hello {name}, your assignment is {part} on {date}. Schedule: {link}",
                  "Hello {name}, please submit your monthly report. {link}",
                  "Hello {name}, thank you for accepting the public talk on {date}. {part}. {link}",
                  "Our schedule is ready for {date}. {link}",
                ].map((t, i) => (
                  <option key={i} value={t}>
                    {
                      [
                        "Assignment reminder",
                        "Report reminder",
                        "Speaker confirmation",
                        "Schedule published",
                      ][i]
                    }
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              />
            </label>
            {Object.keys(messageValues).map((key) => (
              <label key={key}>
                {
                  (
                    {
                      name: "Name",
                      part: "Assignment or talk",
                      date: "Date",
                      link: "Schedule link",
                    } as any
                  )[key]
                }
                <input
                  value={(messageValues as any)[key]}
                  onChange={(e) =>
                    setMessageValues((v) => ({ ...v, [key]: e.target.value }))
                  }
                />
              </label>
            ))}
            <button
              className="primary"
              onClick={() => {
                setQueue(people.filter((p) => p.phone));
                setQueueIndex(0);
              }}
            >
              Prepare send queue
            </button>
            <p className="muted">
              Sharing opens WhatsApp. You review and send each message yourself.
              Automatic replies require the optional Business service.
            </p>
          </section>
          <section className="card stack">
            <h2>Message preview</h2>
            <div className="bubble">
              {formatMessage(template, messageValues)}
            </div>
            {queue.length > 0 && queueIndex < queue.length ? (
              <>
                <h3>
                  Recipient {queueIndex + 1} of {queue.length}:{" "}
                  {queue[queueIndex].name}
                </h3>
                <div className="bubble">
                  {formatMessage(template, {
                    ...messageValues,
                    name: queue[queueIndex].name,
                  })}
                </div>
                {new Date().getHours() >= 21 || new Date().getHours() < 7 ? (
                  <div className="banner">
                    Quiet hours: 21:00–07:00. Consider sending later.
                  </div>
                ) : null}
                <div className="actions">
                  <a
                    href={whatsappURL(
                      queue[queueIndex].phone,
                      formatMessage(template, {
                        ...messageValues,
                        name: queue[queueIndex].name,
                      }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open WhatsApp
                  </a>
                  <button onClick={() => setQueueIndex((i) => i + 1)}>
                    Mark sent
                  </button>
                  <button onClick={() => setQueueIndex((i) => i + 1)}>
                    Skip
                  </button>
                </div>
              </>
            ) : queue.length > 0 ? (
              <p role="status">Queue completed.</p>
            ) : (
              <p>
                Choose recipients with a saved phone number to prepare a queue.
              </p>
            )}
            <button
              onClick={() =>
                run(async () => {
                  await navigator.clipboard.writeText(
                    formatMessage(template, messageValues),
                  );
                  c.notify("Message copied.");
                })
              }
            >
              Copy message
            </button>
            <details>
              <summary>WhatsApp Business + AI intake</summary>
              <p>
                Not set up yet. Meta account, verified phone, consent, approved
                utility templates and server secrets are required. Private mode
                will disable AI intake.
              </p>
            </details>
          </section>
        </div>
      </>
    );
  else if (route === "access")
    body = <><Heading eyebrow="Access & Links" title="The right access. One place."/><Access context={c}/></>;
  else
    body = (
      <>
        <Heading eyebrow="Settings" title="Make it feel right." />
        <div className="stack">
          <section className="card stack">
            <h2>Appearance</h2><ExperiencePicker/><ThemeGallery/><ExperienceProfile context={c}/>
            <label>
              Theme
              <select
                value={appearance.theme}
                onChange={(e) => appearance.set({ theme: e.target.value })}
              >
                {[
                  "auto",
                  "paper",
                  "daylight",
                  "lagoon",
                  "slate",
                  "midnight",
                  "dusk",
                  "glass-lagoon",
                  "glass-arctic",
                  "glass-aurora",
                  "glass-lagoon-dark","glass-sunset","glass-mint-air","glass-ocean-night","glass-graphite",
                ].map((t) => (
                  <option key={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Text tone
                <select
                  value={appearance.tone}
                  onChange={(e) => appearance.set({ tone: e.target.value })}
                >
                  {["soft", "standard", "sharp"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Text size
                <select
                  value={appearance.size}
                  onChange={(e) => appearance.set({ size: e.target.value })}
                >
                  {["S", "M", "L", "XL"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Icon weight
                <select
                  value={appearance.weight}
                  onChange={(e) => appearance.set({ weight: e.target.value })}
                >
                  {["light", "regular", "bold"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={appearance.solid}
                  onChange={(e) => appearance.set({ solid: e.target.checked })}
                />
                Reduce glass
              </label>
            </div>
            <label>Fit to my screen<select value={appearance.fit} onChange={e=>appearance.set({fit:e.target.value as typeof appearance.fit})}>{["auto","compact","comfortable","large"].map(f=><option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}</select></label>
            <p className="chip">{appearance.fit === "auto" ? "Automatically adjusted for screen size and text" : "Your chosen screen fit"}</p>
            <label>Time format<select value={appearance.clock} onChange={e=>appearance.set({clock:e.target.value as typeof appearance.clock})}><option value="locale">Follow language</option><option value="12">12 hour</option><option value="24">24 hour</option></select></label>
            <Greeting name={c.firstName} timezone={setup.timezone} locale={setup.language} clock={appearance.clock}/>
            <h3>Adapted to your device</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={appearance.auto}
                onChange={(e) => appearance.set({ auto: e.target.checked })}
              />
              Automatically adapt contrast, transparency and layout
            </label>
            <p className="muted">
              System theme, reduced motion, high contrast and larger text are
              detected. Manual choices remain available.
            </p>
          </section>
          <section className="card stack">
            <h2>Congregation & delivery</h2>
            <button onClick={() => setWizard(true)}>Open setup guide</button>
            <label>
              Delivery mode
              <select
                value={setup.delivery}
                onChange={(e) =>
                  setSetup((s: any) => ({ ...s, delivery: e.target.value }))
                }
              >
                {catalogue.deliveryModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {
                catalogue.deliveryModes.find((m) => m.id === setup.delivery)
                  ?.description
              }
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={setup.portal}
                onChange={(e) =>
                  setSetup((s: any) => ({ ...s, portal: e.target.checked }))
                }
              />
              Prefer publisher portal
            </label>
            <button
              disabled={busy}
              onClick={() => run(() => saveSetup(wizardStep))}
            >
              Save delivery preferences
            </button>
            <p className="muted">
              These setup preferences do not change existing account access.
              Manage active accounts in Access &amp; Links.
            </p>
          </section>
          <section className="card">
            <h2>Privacy & protection</h2>
            <p>
              Current mode: <strong>Standard</strong>. HTTPS and server access
              controls protect records. The service operator can technically
              access server-stored data. Server-managed field encryption is
              pending.
            </p>
            <details>
              <summary>Private mode — verification pending</summary>
              <p>
                Private mode is not available for real records yet. The
                encryption implementation must pass migration, recovery,
                revocation and no-plaintext checks before it can be enabled.
              </p>
              <p>
                Private mode will encrypt sensitive data on your device. Losing
                every key and recovery phrase makes the data permanently
                unrecoverable.
              </p>
              <p>
                Metadata, login emails, compromised devices, screenshots,
                printed exports and trust in delivered application code are
                outside E2EE.
              </p>
            </details>
          </section>
          <section className="card stack">
            <h2>Data</h2>
            <button
              disabled={!canPeople}
              onClick={() => download(people, "publishers-export.json")}
            >
              Export loaded publisher records
            </button>
            {admin && <>{c.plan&&<Subscription context={c} plan={c.plan} standalone={false}/>}<Sessions context={c}/><RecordsExport context={c}/><Backup context={c} /></>}
            <p className="muted">
              Exports contain personal information. Store and share them
              carefully.
            </p>
          </section>
          <section className="card stack">
            <h2>Help & install</h2>
            <button
              onClick={() => {
                const event = (window as any).__caInstall;
                if (event) {
                  event.prompt();
                  (window as any).__caInstall = null;
                } else
                  c.notify(
                    "Android Chrome: menu → Install app. iPhone: Share → Add to Home Screen. Desktop Chrome/Edge: use the install icon in the address bar.",
                  );
              }}
            >
              Install app
            </button>
            <a href={import.meta.env.BASE_URL+"site/android/"}>Android and iOS installation guide</a>
            <a href={`mailto:${config.SUPPORT_EMAIL}`}>Contact support</a>
            <p className="muted">
              Build: {import.meta.env.VITE_BUILD_HASH || "development"} ·
              Independent and unofficial.
            </p>
            <a href={import.meta.env.BASE_URL+".well-known/build-hash.txt"}>
              Verify published build hash
            </a>

          </section>
        </div>
      </>
    );
  const steps = [
    "Welcome",
    "Congregation basics",
    "Privacy choice",
    "Delivery mode",
    "Groups",
    "Add people",
    "Roles",
    "Schedule",
    "Share",
    "Install",
    "Done",
  ];
  return (
    <>
      {error && (
        <div className="banner" role="alert">
          <p>{error}</p>
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}
      {body}
      <Dialog
        open={!!editing}
        title={
          people.some((p) => p.id === editing?.id)
            ? "Edit publisher"
            : "Add publisher"
        }
        dirty={dirty}
        onClose={() => {
          setEditing(null);
          setDirty(false);
        }}
      >
        {editing && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              run(savePerson);
            }}
          >
            <h3>Basics</h3>
            <label>Gender<select value={editing.gender||"Male"} onChange={e=>{setEditing(p=>p?{...p,gender:e.target.value}:p);setDirty(true);}}><option>Male</option><option>Female</option></select></label>
            <div className="form-grid">
              <label>
                Full name
                <input
                  required
                  value={editing.name}
                  onChange={(e) => {
                    setEditing((p) => (p ? { ...p, name: e.target.value } : p));
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Service group
                <select
                  value={editing.group}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, group: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Gender
              <select
                value={editing.gender || "Male"}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, gender: e.target.value } : p));
                  setDirty(true);
                }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
            <h3>Sign-in & contact</h3>
            <label htmlFor="v2-publisher-email">
              Email (for sign-in)
              <input
                id="v2-publisher-email"
                aria-describedby="v2-publisher-email-hint"
                type="email"
                value={editing.email}
                disabled={busy || (!admin && !demo)}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, email: e.target.value } : p));
                  setDirty(true);
                  setShared(false);
                }}
              />
            </label>
            <small id="v2-publisher-email-hint">
              Optional. A shared email grants household report submission only.
            </small>
            {household.length > 0 && !shared && (
              <section className="banner">
                <p>
                  This email is already used by{" "}
                  {household.map((p) => p.name).join(", ")}. Treat as a
                  household so one sign-in can report for everyone?
                </p>
                <div className="actions">
                  <button type="button" onClick={() => setShared(true)}>
                    Yes, share reports
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditing((p) => (p ? { ...p, email: "" } : p))
                    }
                  >
                    No, use a different email
                  </button>
                </div>
              </section>
            )}
            {shared && (
              <p role="status">
                Household reporting confirmed. Contacts and private details stay
                separate.
              </p>
            )}
            <div className="form-grid">
              <label>
                Phone
                <input
                  type="tel"
                  value={editing.phone}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, phone: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Address
                <input
                  value={editing.address}
                  onChange={(e) => {
                    setEditing((p) =>
                      p ? { ...p, address: e.target.value } : p,
                    );
                    setDirty(true);
                  }}
                />
              </label>
            </div>
            <details><summary>Household, emergency contact & publisher record</summary>
            {demo||c.caps.extended_people?<div className="stack">
              <div className="form-grid">{([['dob','Date of birth'],['baptized','Date of baptism'],['emergencyName','Emergency contact name'],['emergencyRelationship','Relationship'],['emergencyPhone','Emergency phone'],['spiritualStatus','Publisher status']] as const).map(([key,label])=><label key={key}>{label}<input type={key==='dob'||key==='baptized'?'date':key==='emergencyPhone'?'tel':'text'} value={editing[key]||''} onChange={e=>{setEditing(p=>p?{...p,[key]:e.target.value}:p);setDirty(true);}}/></label>)}</div>
              <label>Household head<select value={editing.familyHeadId||''} onChange={e=>{setEditing(p=>p?{...p,familyHeadId:e.target.value}:p);setDirty(true);}}><option value="">This person is the household head</option>{people.filter(p=>p.id!==editing.id&&!p.familyHeadId).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
              <label>Hope<select value={editing.hope||''} onChange={e=>{setEditing(p=>p?{...p,hope:e.target.value}:p);setDirty(true);}}><option value="">Not recorded</option><option>Other Sheep</option><option>Anointed</option></select></label>
              {([['isElder','Elder'],['isMS','Ministerial servant'],['isRP','Regular pioneer'],['isSP','Special pioneer'],['isFM','Field missionary']] as const).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={Boolean(editing[key])} onChange={e=>{setEditing(p=>p?{...p,[key]:e.target.checked}:p);setDirty(true);}}/>{label}</label>)}
            </div>:<p>Ask your administrator to apply the extended publisher database update, then reopen this record.</p>}</details>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="actions">
              <button type="submit" className="primary" disabled={busy}>
                Save publisher & email
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!dirty || confirm("Discard changes?")) {
                    setEditing(null);
                    setDirty(false);
                  }
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Dialog>
      <Dialog
        open={wizard}
        onClose={() => setWizard(false)}
        title={`Setup guide · ${wizardStep + 1} of 11`}
        dirty={dirty}
      >
        <div className="progress" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={11} aria-valuenow={wizardStep + 1}>
          {steps.map((s, i) => (
            <span key={s} className={i <= wizardStep ? "done" : ""} />
          ))}
        </div>
        <h2>{steps[wizardStep]}</h2>
        {wizardStep === 0 ? (
          <>
            <p>
              Set up people, meeting times, roles and a shareable schedule. You
              can skip a step and return later.
            </p>
            <p>About 10 minutes once your account is approved.</p>
          </>
        ) : wizardStep === 1 ? (
          <div className="form-grid">
            {[
              "name",
              "country",
              "language",
              "timezone",
              "midweek",
              "midweekTime",
              "weekend",
              "weekendTime",
            ].map((k) => (
              <label key={k}>
                {
                  (
                    {
                      name: "Congregation name",
                      country: "Country code",
                      language: "Language",
                      timezone: "Time zone",
                      midweek: "Midweek day",
                      midweekTime: "Midweek time",
                      weekend: "Weekend day",
                      weekendTime: "Weekend time",
                    } as any
                  )[k]
                }
                <input
                  value={setup[k]}
                  onChange={(e) => {
                    setSetup((s: any) => ({ ...s, [k]: e.target.value }));
                    setDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
        ) : wizardStep === 2 ? (
          <>
            <h3>Standard</h3>
            <p>
              Server access controls. The operator can technically access stored
              records.
            </p>
            <h3>Private — verification pending</h3>
            <p>
              Device encryption and recovery are not released yet. Standard mode
              remains active. Never upload data expecting E2EE at this stage.
            </p>
          </>
        ) : wizardStep === 3 ? (
          <div className="stack">
            {catalogue.deliveryModes.map((m) => (
              <button
                key={m.id}
                aria-pressed={setup.delivery === m.id}
                onClick={() => {
                  setSetup((s: any) => ({ ...s, delivery: m.id }));
                  setDirty(true);
                }}
              >
                <strong>{m.name}</strong>
                <p>{m.description}</p>
              </button>
            ))}
          </div>
        ) : wizardStep === 4 ? (
          <>
            <p>
              Use the Groups screen to create the dropdown list before adding
              people.
            </p>
            <button
              onClick={() => {
                setWizard(false);
                setSub("groups");
                go("people");
              }}
            >
              Manage groups
            </button>
          </>
        ) : wizardStep === 5 ? (
          <>
            <p>
              Paste a spreadsheet, upload contacts or add people one at a time.
            </p>
            <button
              onClick={() => {
                setWizard(false);
                setSub("import");
                go("people");
              }}
            >
              Open Import Center
            </button>
          </>
        ) : wizardStep === 6 ? (
          <>
            <p>
              Invite main administrators and overseers using approved accounts.
              Use approved accounts rather than shared passwords.
            </p>
            <button
              onClick={() => {
                setWizard(false);
                go("access");
              }}
            >
              Open Access & Links
            </button>
          </>
        ) : wizardStep === 7 ? (
          <>
            <p>Prepare your first midweek and weekend schedule.</p>
            <button
              onClick={() => {
                setWizard(false);
                setSub("weekend");
                go("schedule");
              }}
            >
              Open weekend schedule
            </button>
          </>
        ) : wizardStep === 8 ? (
          <>
            <p>
              Publish from Schedule, then copy your stable live link. Only
              published assignment details belong in a shared link.
            </p>
            <button
              onClick={() => {
                setWizard(false);
                go("access");
              }}
            >
              Open Links Hub
            </button>
          </>
        ) : wizardStep === 9 ? (
          <>
            <p>
              Android: browser menu → Install app. iPhone: Share → Add to Home
              Screen. Desktop: use the browser’s install button.
            </p>
            <a href={import.meta.env.BASE_URL+"site/android/"}>View installation guide</a>
          </>
        ) : (
          <>
            <h3>Your setup guide is complete.</h3>
            <p>
              Review Home and publish both schedules when you’re ready. You can
              reopen this guide in Settings.
            </p>
          </>
        )}
        <div className="actions" style={{ marginTop: "1.5rem" }}>
          <button
            disabled={wizardStep === 0 || busy}
            onClick={() => run(() => saveSetup(wizardStep - 1))}
          >
            Back
          </button>
          {wizardStep < 10 ? (
            <>
              <button
                className="primary"
                disabled={busy}
                onClick={() => run(() => saveSetup(wizardStep + 1))}
              >
                Save & continue
              </button>
              <button
                disabled={busy}
                onClick={() => run(() => saveSetup(wizardStep + 1))}
              >
                Skip for now
              </button>
            </>
          ) : (
            <button className="primary" onClick={() => setWizard(false)}>
              Done
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </Dialog>
    </>
  );
}
