import {savePublisherAction} from './publisher-action';
import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import type { Person } from "./publisher-record";
import {
  getLocaleSnapshot,
  getUILocale,
  setUILocale,
  subscribeUILocale,
  localeMetadata,
  type Locale,
} from "../../../../packages/core/i18n";
import { watchtowerWeek } from "./publication-data";
import { InstallApp } from "./InstallApp";
import { WeekendTalkHistory } from "./WeekendTalkHistory";
import { HomeGroupLinks } from "./HomeGroupLinks";
import { demoPublishers } from "../../../../packages/core/demo-publishers";
import { Departments } from "./Departments";
import { S21Button } from "./S21Button";
import { publisherRecord } from "../../../../packages/pdf/snapshot";
import { isSFTS } from "../../../../packages/core/publisher-selection";
import { z } from "zod";
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
import type { Context } from "../context";
import { storeFor, demo, rpc, config } from "./client";
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
import { EmergencyContacts } from "./EmergencyContacts";
import { Dashboard } from "./Dashboard";
import { ExperienceProfile } from "./ExperienceProfile";
import { t } from "../../../../packages/core/i18n";
import { themeIds, normalizeTheme } from "../../../../packages/core/themes";
import { ThemeGallery } from "./ThemeGallery";
import { ExperiencePicker } from "./ExperiencePicker";
import { Reports } from "./Reports";
import { Midweek } from "./Midweek";
import { PublisherHome } from "./PublisherHome";
import { Access } from "./Access";
import { Backup } from "./Backup";
import { Subscription } from "./Subscription";
import { RecordsExport } from "./RecordsExport";
import { Sessions } from "./Sessions";
import catalogue from "../../../../capabilities.json";
const PublisherEditor = lazy(() => import("./PublisherEditor"));
const PdfStudio = lazy(() => import("./PdfStudio"));
const samplePeople: Person[] = demoPublishers;
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
      title={t("ui.update.pending.8e0a4b18")}
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
const appBaseURL = import.meta.env.BASE_URL;
export default function Workspace({
  route,
  go,
  context: c,
}: {
  route: string;
  go: (s: string) => void;
  context: Context;
}) {
  React.useSyncExternalStore(subscribeUILocale, getLocaleSnapshot, getLocaleSnapshot);
  const [people, setPeople] = useState<Person[]>(demo ? samplePeople : []),
    [groups, setGroups] = useState<any[]>(demo ? initialGroups : []),
    [groupsLoaded, setGroupsLoaded] = useState(demo),
    [sub, setSub] = useState(
      () => sessionStorage.getItem("ca-workspace-tool") || "midweek",
    ),
    [editing, setEditing] = useState<Person | null>(null),
    [dirty, setDirty] = useState(false),
    [shared, setShared] = useState(false),
    [query, setQuery] = useState(""),
    [sftsOnly, setSftsOnly] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [wizard, setWizard] = useState(false),
    [wizardStep, setWizardStep] = useState(0),
    [setup, setSetup] = useState<any>({
      name: c.name,
      country: "IN",
      language: "en",
      timezone: demo
        ? "Asia/Kolkata"
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
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
  const wizardSnapshot = React.useRef<any>(null);
  useEffect(() => {
    if (wizard) {
      wizardSnapshot.current = structuredClone(setup);
      setError("");
    }
  }, [wizard]);
  const appearance = useAppearance(),
    admin = c.roles.includes("admin"),
    canPeople =
      admin ||
      c.roles.includes("field_service") ||
      c.roles.includes("group_overseer"),
    canWeekend = admin || c.roles.includes("weekend");
  useEffect(() => {
    const open = (event: Event) => {
      const value = (event as CustomEvent<string>).detail;
      if (["groups", "import", "midweek", "weekend", "duties"].includes(value))
        setSub(value);
      sessionStorage.removeItem("ca-workspace-tool");
    };
    window.addEventListener("ca:open-tool", open);
    return () => window.removeEventListener("ca:open-tool", open);
  }, []);
  useEffect(() => {
    const find = (event: Event) => {
      setQuery((event as CustomEvent<string>).detail);
      setSub("publishers");
      if (route === "people") sessionStorage.removeItem("ca-person-search");
    };
    window.addEventListener("ca:find-person", find);
    return () => window.removeEventListener("ca:find-person", find);
  }, [route]);
  useEffect(() => {
    const add = () => {
      if (!admin) return;
      setEditing({
        id: crypto.randomUUID(),
        name: "",
        gender: "",
        group: groups[0]?.name || "",
        email: "",
        phone: "",
        address: "",
      });
      setDirty(false);
      setError("");
      setShared(false);
      sessionStorage.removeItem("ca-quick-action");
    };
    const quick = (event: Event) => {
      if ((event as CustomEvent).detail === "add-publisher") add();
    };
    if (sessionStorage.getItem("ca-quick-action") === "add-publisher") add();
    window.addEventListener("ca:quick-action", quick);
    return () => window.removeEventListener("ca:quick-action", quick);
  }, [admin, groups]);
  const peopleQuery = useQuery({
    queryKey: ["v2-people", c.cong],
    enabled: !demo && canPeople,
    queryFn: async () => {
      if (admin)
        return await storeFor(c.cong, c.roles).read(
          {
            source: {
              kind: "rpc",
              name: "ca_v2_people",
              args: { p_cong_id: c.cong },
            },
            cacheKey: "workspace-people",
          },
          z.array(
            z
              .object({
                id: z.string(),
                name: z.string(),
                group: z.string(),
                email: z.string(),
                phone: z
                  .string()
                  .nullable()
                  .transform((value) => value || ""),
                address: z
                  .string()
                  .nullable()
                  .transform((value) => value || ""),
              })
              .passthrough(),
          ),
        );
      const rows = await storeFor(c.cong, c.roles).read(
        {
          source: {
            kind: "table",
            name: "publishers",
            columns: c.roles.includes("field_service")
              ? "id,name,service_group,phone,address,gender,is_elder,is_ms,is_rp,is_sp,is_fm,is_sfts"
              : "id,name,service_group,is_rp,is_sp,is_fm,is_sfts",
            filters: [
              { column: "cong_id", op: "eq", value: c.cong },
              { column: "transferred_at", op: "is", value: null },
            ],
            order: "name",
          },
          cacheKey: "workspace-people",
        },
        z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            service_group: z.string().nullable().optional(),
            phone: z.string().nullable().optional(),
            address: z.string().nullable().optional(),
            gender: z.string().nullable().optional(),
            is_elder: z.boolean().nullable().optional(),
            is_ms: z.boolean().nullable().optional(),
            is_rp: z.boolean().nullable().optional(),
            is_sp: z.boolean().nullable().optional(),
            is_fm: z.boolean().nullable().optional(),
            is_sfts: z.boolean().nullable().optional(),
          }),
        ),
      );
      return rows.map((p) => ({
        id: p.id,
        name: p.name,
        group: p.service_group || "",
        email: "",
        phone: p.phone || "",
        address: p.address || "",
        gender: p.gender || undefined,
        isElder: p.is_elder,
        isMS: p.is_ms,
        isRP: Boolean(p.is_rp),
        isSP: Boolean(p.is_sp),
        isFM: Boolean(p.is_fm),
        isSFTS: Boolean(p.is_sfts),
      }));
    },
  });
  useEffect(() => {
    if (peopleQuery.data)
      setPeople(
        (peopleQuery.data as Person[]).map((p) => ({
          ...p,
          isSFTS: Boolean((p as any).is_sfts || p.isSFTS),
        })),
      );
  }, [peopleQuery.data]);
  useEffect(() => {
    const counts: Record<string, number> = {};
    if (demo || peopleQuery.isSuccess) {
      counts.publishers = people.length;
      if (admin) counts.emergency = people.length;
    }
    if (groupsLoaded) counts.groups = groups.length;
    c.onCounts?.(counts);
  }, [people, groups, groupsLoaded, peopleQuery.isSuccess, admin, c.onCounts]);
  useEffect(() => {
    if (
      !demo &&
      c.caps.groups &&
      c.roles.some((role) =>
        [
          "admin",
          "field_service",
          "oclm",
          "weekend",
          "group_overseer",
        ].includes(role),
      )
    )
      storeFor(c.cong, c.roles)
        .read(
          {
            source: {
              kind: "rpc",
              name: "ca_v2_groups",
              args: { p_cong_id: c.cong },
            },
            cacheKey: "groups",
          },
          z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
        )
        .then((data) => {
          setGroups(data);
          setGroupsLoaded(true);
        })
        .catch((e) => setError(e.message));
    if (!demo && c.caps.setup && admin)
      rpc("ca_v2_get_setup", { p_cong_id: c.cong })
        .then((data) => {
          if (data) {
            setSetup((s: any) => ({ ...s, ...data.data }));
            setWizardStep(data.step || 0);
            if ((data.step || 0) < 10) setWizard(true);
          } else setWizard(true);
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
    if (!canWeekend) return;
    let active = true;
    void watchtowerWeek(week).then((source) => {
      if (active && source)
        setWeekend((value: any) => ({
          ...value,
          articleTitle: source.articleTitle || "",
          studyRange: source.studyDates?.start + " – " + source.studyDates?.end,
          sourceUrl: source.source_url,
          watchtowerSongs: source.songs?.join(" · ") || "",
        }));
    });
    return () => {
      active = false;
    };
  }, [week, weekendRevision, canWeekend]);
  useEffect(() => {
    setError("");
    setQuery(
      route === "people"
        ? sessionStorage.getItem("ca-person-search") || ""
        : "",
    );
    if (route === "people") sessionStorage.removeItem("ca-person-search");
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
    setError("");
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
  const existingShared = Boolean(
    editing?.email &&
    household.length &&
    people.some(
      (person) =>
        person.id === editing.id &&
        normalizeEmail(person.email) === normalizeEmail(editing.email),
    ),
  );
  async function savePerson() {
    if (!editing) return;
    const person = {
      ...editing,
      email: normalizeEmail(editing.email),
      expected_login: editing.expected_login || [],
      name: editing.name.trim(),
    };
    if (!person.name) throw Error("Name is required.");
    if (!["Male", "Female"].includes(person.gender || ""))
      throw Error(t("polish.chooseGender"));
    if (person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email))
      throw Error("Use a valid email.");
    if (household.length && !shared && !existingShared)
      throw Error("Confirm household reporting or use a different email.");
    if (person.phone) person.phone = phoneE164(person.phone, setup.country);
    if (!demo) {
      if (!c.caps.people)
        throw Error(
          "Database update required for atomic publisher and email saves.",
        );
      await savePublisherAction(c.cong,person,shared || existingShared,c.roles);
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
            location.origin +
              appBaseURL +
              "?form=weekend#token=" +
              encodeURIComponent(result.token),
          );
    } else {
      setWeekendRevision((r) => r + 1);
      if (publish)
        setPublished("Fictional schedule — no public link is created.");
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
      await rpc("ca_v3_save_setup", {
        p_cong_id: c.cong,
        p_step: next,
        p_data: setup,
      });
    }
    setWizardStep(next);
    wizardSnapshot.current = structuredClone(setup);
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
          {t("ui.weekend.meeting.816fb271")}{" "}
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
            {t("ui.independent.and.unofficial.congregation.as.e97cfe9d")}
          </p>
        )}
      </section>
    );
  }
  let body: React.ReactNode;
  if (route === "pdf")
    body = (
      <Suspense
        fallback={<p role="status">{t("ui.opening.pdf.studio.f161ce91")}</p>}
      >
        <PdfStudio context={c} />
      </Suspense>
    );
  else if (route === "home" && c.roles.includes("publisher") && !admin)
    body = <PublisherHome context={c} go={go} />;
  else if (route === "home")
    body = (
      <>
        <Dashboard
          context={c}
          go={go}
          setup={setup}
          setupEntry={
            admin && wizardStep < 10 ? (
              <section className="card stack">
                <h2>{t("setup.begin")}</h2>
                <p>{t("setup.summary")}</p>
                <Button onClick={() => setWizard(true)} type="button">
                  {t("setup.open")}
                </Button>
              </section>
            ) : null
          }
          addPublisher={() => {
            setEditing({
              id: crypto.randomUUID(),
              name: "",
              gender: "",
              group: groups[0]?.name || "",
              email: "",
              phone: "",
              address: "",
            });
            setDirty(false);
            setError("");
            setShared(false);
          }}
        />
      </>
    );
  else if (route === "emergency" && admin)
    body = (
      <EmergencyContacts
        people={people}
        loading={!demo && peopleQuery.isPending}
        error={peopleQuery.error?.message}
        openPDF={async (records) => {
          try {
            const { runPDF } = await import("./pdf-worker-client"),
              { families } = await import("../../../../packages/pdf/snapshot"),
              { offerPDF } = await import("./pdf-download");
            offerPDF(
              await runPDF("emergency", { id: c.cong, publishers: records }, [
                families(records),
                c.name,
              ]),
              "Emergency-contacts.pdf",
            );
            c.notify("Emergency contacts downloaded");
          } catch (error) {
            c.notify((error as Error).message);
          }
        }}
      />
    );
  else if (route === "people")
    body = (
      <>
        <Heading
          eyebrow={t("ui.people.7db20897")}
          title={t("refine.peopleTitle")}
        >
          {admin && (
            <Button
              className="primary"
              onClick={() => {
                setEditing({
                  id: crypto.randomUUID(),
                  name: "",
                  gender: "",
                  group: groups[0]?.name || "",
                  email: "",
                  phone: "",
                  address: "",
                });
                setDirty(false);
                setError("");
                setShared(false);
              }} type="button"
            >
              <Plus /> {t("ui.add.publisher.b13cc36b")}
            </Button>
          )}
        </Heading>
        <div
          className="segmented"
          role="group"
          aria-label={t("ui.people.sections.78224e3a")}
        >
          {["publishers", "groups", "import"].map((s) => (
            <Button
              key={s}
              className={
                sub === s ||
                (s === "publishers" && !["groups", "import"].includes(sub))
                  ? "active"
                  : ""
              }
              onClick={() => setSub(s)} type="button"
            >
              {s === "import"
                ? "Import Center"
                : s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        {sub === "groups" ? (
          c.caps.groups ? (
            <section className="card stack">
              <h2>{t("ui.service.groups.c222d1cb")}</h2>
              <p>
                {t("ui.only.the.main.administrator.can.create.or..daa818bf")}
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
                    {t("ui.people.c9022680")}
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
                    {t("ui.group.name.762ebb70")}
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                    />
                  </label>
                  <Button disabled={busy} type="submit">{t("ui.add.group.94901258")}</Button>
                </form>
              )}
            </section>
          ) : (
            <Pending name="Managed groups" />
          )
        ) : sub === "import" ? (
          <div className="stack">
            <section className="card stack">
              <h2>{t("ui.import.center.14e3620e")}</h2>
              <p>{t("refine.importHelp")}</p>
              <label>
                {t("ui.spreadsheet.rows.aebc7f3f")}
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={
                    "Name\tPhone\tEmail\tGroup\nMaria Thomas\t+919876543210\tmaria@example.com\tGroup 1"
                  }
                />
              </label>
              <div className="actions">
                <Button
                  className="primary"
                  onClick={() => run(async () => review())} type="button"
                >
                  {t("ui.review.rows.d14ebd74")}
                </Button>
                <label>
                  {t("ui.upload.csv.or.vcard.ae888952")}
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
                <Button
                  onClick={() =>
                    download(
                      "Name,Phone,Email,Group,Address\n",
                      "publisher-template.csv",
                      "text/csv",
                    )
                  } type="button"
                >
                  {t("ui.sample.template.8138c817")}
                </Button>
              </div>
              <Disclosure>
                <DisclosureLabel>
                  {t("ui.other.formats.924552d3")}
                </DisclosureLabel>
                <p>
                  {t("ui.xlsx.and.on.device.paper.scanning.are.pend.e6a946ba")}
                </p>
              </Disclosure>
            </section>
            {importRows.length > 0 && (
              <section className="card">
                <h2>
                  {t("ui.review.70786ccf")}
                  {importRows.length} {t("ui.rows.bc51e9e6")}
                </h2>
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
                        {t("ui.include.row.9f7b74be")}
                        {i + 1}
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
                        <div className="ui-field">
                          
                          <LegacySelect
                            value={r.group}
                            onChange={(e) =>
                              setImportRows((rows) =>
                                rows.map((x, j) =>
                                  j === i ? { ...x, group: e.target.value } : x,
                                ),
                              )
                            } aria-label={t("ui.group.34ca0e76")}
                          >
                            <option value="">
                              {t("ui.no.group.2463cfb8")}
                            </option>
                            {groups.map((g) => (
                              <option key={g.id}>{g.name}</option>
                            ))}
                          </LegacySelect>
                        </div>
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
                  <Button
                    onClick={() =>
                      setImportRows((rows) =>
                        reviewImport(rows, groups, people, setup.country).map(
                          (x: any) => ({
                            ...x,
                            include: rows[x.index]?.include ?? x.include,
                          }),
                        ),
                      )
                    } type="button"
                  >
                    {t("ui.recheck.rows.014c5ab9")}
                  </Button>
                  <Button
                    className="primary"
                    disabled={busy}
                    onClick={() => run(saveImport)} type="button"
                  >
                    {t("ui.import.06fe0ef7")}
                    {importRows.filter((r) => r.include).length}{" "}
                    {t("ui.selected.d7cbbb68")}
                  </Button>
                </div>
              </section>
            )}
            {importUndo && (
              <div className="banner">
                {t("ui.import.complete.80e3a57d")}{" "}
                <Button onClick={() => run(undoImport)} type="button">
                  {t("ui.undo.import.4c2180d2")}
                </Button>
                <p>{t("ui.server.undo.is.available.for.7.days.2cea3070")}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {people.some(isSFTS) && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={sftsOnly}
                  onChange={(e) => setSftsOnly(e.target.checked)}
                />
                {t("sfts.only")}
              </label>
            )}
            <label className="search">
              {t("ui.search.people.8a7e7f1b")}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ui.name.or.group.f90615d5")}
              />
            </label>
            {peopleQuery.isLoading ? (
              <p role="status">{t("ui.loading.people.af6fe51d")}</p>
            ) : peopleQuery.error ? (
              <p role="alert" className="error">
                {peopleQuery.error.message}
              </p>
            ) : people.length ? (
              <section className="card list">
                {people
                  .filter((p) => !sftsOnly || isSFTS(p))
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
                              {t("ui.household.2e7393c1")}
                              {people.filter((x) => x.email === p.email).length}
                              )
                            </span>
                          )}
                      </div>
                      <S21Button
                        context={c}
                        person={{ ...p }}
                        onOpen={() => go("pdf")}
                      />
                      <Button disabled={!admin} onClick={() => edit(p)} type="button">
                        {t("ui.edit.464c4ffd")}
                        <span className="sr-only"> {p.name}</span>
                      </Button>
                    </div>
                  ))}
              </section>
            ) : (
              <Empty
                title={t("ui.no.people.yet.4ea16875")}
                detail={t(
                  "ui.add.a.publisher.or.review.a.spreadsheet.in.fca23269",
                )}
              />
            )}
          </>
        )}
      </>
    );
  else if (route === "schedule")
    body = (
      <>
        <Heading
          eyebrow={t("ui.schedule.f4830a1d")}
          title={t("ui.weekly.schedule.6cbc7c26")}
        />
        <div
          className="segmented"
          role="group"
          aria-label={t("ui.schedule.sections.335ae9a4")}
        >
          {["midweek", "weekend", "duties", "print"].map((s) => (
            <Button
              key={s}
              className={sub === s ? "active" : ""}
              onClick={() => setSub(s)} type="button"
            >
              {s[0].toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
        {sub === "weekend" ? (
          c.caps.weekend && canWeekend ? (
            <div className="stack">
              <div className="actions">
                <Button
                  onClick={() => {
                    if (
                      weekendDirty &&
                      !confirm("Discard unsaved weekend changes?")
                    )
                      return;
                    setWeek(
                      weekKey(addWeeks(new Date(week + "T12:00:00"), -1)),
                    );
                  }} type="button"
                >
                  {t("ui.previous.week.c0f8bbcd")}
                </Button>
                <label>
                  {t("ui.week.starting.553ad9ea")}
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
                <Button
                  onClick={() => {
                    if (weekendDirty && !confirm("Discard unsaved changes?"))
                      return;
                    setWeek(weekKey(addWeeks(new Date(week + "T12:00:00"), 1)));
                  }} type="button"
                >
                  {t("ui.next.week.21fbde19")}
                </Button>
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
                  <span className="chip">
                    {t("ui.revision.e330d85f")}
                    {weekendRevision}
                  </span>
                </div>
                <div className="form-grid">
                  <div className="ui-field">
                    
                    <LegacySelect
                      value={weekend.exception}
                      onChange={(e) =>
                        changeWeekend("exception", e.target.value)
                      } aria-label={t("ui.week.exception.0d2efba7")}
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
                    </LegacySelect>
                  </div>
                  <label>
                    {t("ui.meeting.time.3c900468")}
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
                          placeholder={t(
                            "ui.choose.a.person.or.enter.a.visitor.da12194d",
                          )}
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
                    {t("ui.speaker.s.home.congregation.d5ebe952")}
                    <input
                      value={weekend.speakerCongregation}
                      onChange={(e) =>
                        changeWeekend("speakerCongregation", e.target.value)
                      }
                    />
                  </label>
                  <label className="full">
                    {t("ui.public.talk.title.dd5bd0fa")}
                    <input
                      value={weekend.talkTitle}
                      onChange={(e) =>
                        changeWeekend("talkTitle", e.target.value)
                      }
                    />
                  </label>
                  <label>
                    {t("ui.outline.number.a90b7368")}
                    <input
                      value={weekend.outline}
                      onChange={(e) => changeWeekend("outline", e.target.value)}
                    />
                  </label>
                  <WeekendTalkHistory
                    context={c}
                    number={weekend.outline}
                    speaker={weekend.speaker}
                    date={new Date(
                      new Date(week + "T12:00:00Z").getTime() +
                        (([
                          "Sunday",
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                        ].indexOf(setup.weekend) +
                          6) %
                          7) *
                          86400000,
                    )
                      .toISOString()
                      .slice(0, 10)}
                    revision={weekendRevision}
                    onChoose={(number, title) => {
                      setWeekend({
                        ...weekend,
                        outline: number,
                        talkTitle: title,
                      });
                      setWeekendDirty(true);
                    }}
                  />
                  <label>
                    {t("ui.watchtower.article.title.20e73d79")}
                    <input readOnly value={weekend.articleTitle} />
                    {weekend.watchtowerSongs && (
                      <small>
                        {t("ui.watchtower.songs.5fefef2d")}
                        {weekend.watchtowerSongs}
                      </small>
                    )}
                    {weekend.sourceUrl && (
                      <a
                        href={weekend.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t("ui.source.wol.jw.org.f4aa1fbe")}
                      </a>
                    )}
                    <small>
                      {t(
                        "ui.imported.titles.are.read.only.official.dat.f0decb19",
                      )}
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
                    {t("ui.notes.8a7525b1")}
                    <textarea
                      value={weekend.notes}
                      onChange={(e) => changeWeekend("notes", e.target.value)}
                    />
                  </label>
                </div>
                <Disclosure>
                  <DisclosureLabel>
                    {t("ui.additional.weekend.duties.c535cc9b")}
                  </DisclosureLabel>
                  <div className="stack">
                    {weekend.duties.map((d: any, i: number) => (
                      <div className="form-grid" key={i}>
                        <label>
                          {t("ui.duty.6ace9a3d")}
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
                          {t("ui.people.up.to.four.265a8ab9")}
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
                    <Button
                      onClick={() =>
                        changeWeekend("duties", [
                          ...weekend.duties,
                          { name: "", people: "" },
                        ])
                      } type="button"
                    >
                      {t("ui.add.duty.07f57514")}
                    </Button>
                  </div>
                </Disclosure>
                {assignmentConflicts(weekend).map((text: string) => (
                  <div className="banner" key={text}>
                    {text}
                  </div>
                ))}
                <div className="actions">
                  <Button
                    disabled={busy}
                    onClick={() => run(() => saveWeekend())} type="button"
                  >
                    {t("ui.save.draft.3de10010")}
                  </Button>
                  <Button
                    className="primary"
                    disabled={busy}
                    onClick={() => run(() => saveWeekend(true))} type="button"
                  >
                    {t("ui.publish.weekend.d4ebad9d")}
                  </Button>
                  <Button onClick={() => setSub("print")} type="button">
                    {t("ui.review.print.layout.fd5f3d15")}
                  </Button>
                </div>
                {published && (
                  <p role="status">
                    {published.startsWith("https:") ? (
                      <a
                        href={published}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("ui.open.published.schedule.049603f4")}
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
              <h2>{t("ui.print.center.f6575001")}</h2>
              <div className="form-grid">
                <div className="ui-field">
                  
                  <LegacySelect
                    value={layout}
                    onChange={(e) => setLayout(e.target.value)} aria-label={t("ui.layout.a5119091")}
                  >
                    <option value="week">
                      {t("ui.weekend.one.week.49362c20")}
                    </option>
                    <option value="large">
                      {t("ui.weekend.large.print.d8307148")}
                    </option>
                  </LegacySelect>
                </div>
                <div className="ui-field">
                  
                  <LegacySelect
                    value={printScale}
                    onChange={(e) => setPrintScale(e.target.value)} aria-label={t("ui.font.scale.8112fa23")}
                  >
                    {["100", "125", "150", "175", "200"].map((x) => (
                      <option key={x} value={x}>
                        {x}%
                      </option>
                    ))}
                  </LegacySelect>
                </div>
              </div>
              <p>
                {t("ui.use.your.browser.s.print.or.save.as.pdf.th.ab1f0da1")}
              </p>
              <div className="actions">
                <Button className="primary" onClick={() => window.print()} type="button">
                  {t("ui.print.save.pdf.bf785022")}
                </Button>
              </div>
            </section>
            <div style={{ fontSize: Number(printScale) / 100 + "em" }}>
              {weekendView(true)}
            </div>
          </div>
        ) : sub === "duties" ? (
          <Departments context={c} />
        ) : (
          <Midweek context={c} />
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
        <Heading
          eyebrow={t("ui.messages.04d7b483")}
          title={t("ui.a.thoughtful.reminder.b74a0931")}
        />
        <div className="grid">
          <section className="card stack">
            <h2>{t("ui.whatsapp.smart.share.cc65823b")}</h2>
            <div className="ui-field">
              
              <LegacySelect onChange={(e) => setTemplate(e.target.value)} aria-label={t("ui.template.0575f29d")}>
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
              </LegacySelect>
            </div>
            <label>
              {t("ui.message.2f77668a")}
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
            <Button
              className="primary"
              onClick={() => {
                setQueue(people.filter((p) => p.phone));
                setQueueIndex(0);
              }} type="button"
            >
              {t("ui.prepare.send.queue.098c5943")}
            </Button>
            <p className="muted">{t("refine.sharingHelp")}</p>
          </section>
          <section className="card stack">
            <h2>{t("ui.review.message.042e6954")}</h2>
            <div className="bubble">
              {formatMessage(template, messageValues)}
            </div>
            {queue.length > 0 && queueIndex < queue.length ? (
              <>
                <h3>
                  {t("ui.recipient.2fd56e88")}
                  {queueIndex + 1} {t("ui.of.4acb731c")}
                  {queue.length}: {queue[queueIndex].name}
                </h3>
                <div className="bubble">
                  {formatMessage(template, {
                    ...messageValues,
                    name: queue[queueIndex].name,
                  })}
                </div>
                {new Date().getHours() >= 21 || new Date().getHours() < 7 ? (
                  <div className="banner">
                    {t(
                      "ui.quiet.hours.21.00.07.00.consider.sending.l.3ef25126",
                    )}
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
                    {t("ui.open.whatsapp.5ac4b2d1")}
                  </a>
                  <Button onClick={() => setQueueIndex((i) => i + 1)} type="button">
                    {t("ui.mark.sent.48b728ec")}
                  </Button>
                  <Button onClick={() => setQueueIndex((i) => i + 1)} type="button">
                    {t("ui.skip.28d03596")}
                  </Button>
                </div>
              </>
            ) : queue.length > 0 ? (
              <p role="status">{t("ui.queue.completed.40699b27")}</p>
            ) : (
              <p>
                {t("ui.choose.recipients.with.a.saved.phone.numbe.a24b47b6")}
              </p>
            )}
            <Button
              onClick={() =>
                run(async () => {
                  await navigator.clipboard.writeText(
                    formatMessage(template, messageValues),
                  );
                  c.notify("Message copied.");
                })
              } type="button"
            >
              {t("ui.copy.message.457efe53")}
            </Button>
            <Disclosure>
              <DisclosureLabel>
                {t("ui.whatsapp.business.ai.intake.daaf00f7")}
              </DisclosureLabel>
              <p>
                {t("ui.not.set.up.yet.meta.account.verified.phone.c2df3100")}
              </p>
            </Disclosure>
          </section>
        </div>
      </>
    );
  else if (route === "access")
    body = (
      <>
        <Heading
          eyebrow={t("ui.access.links.9b1382c6")}
          title={t("ui.access.ec5ba0ab")}
        />
        <Access context={c} />
      </>
    );
  else
    body = (
      <>
        <Heading
          eyebrow={t("ui.settings.74a883a0")}
          title={t("ui.your.settings.7760b023")}
        />
        <div className="stack">
          <section className="card stack">
            <h2>{t("ui.appearance.3907fa7f")}</h2>
            <ExperiencePicker />
            <ThemeGallery />
            <ExperienceProfile context={c} />
            <div className="ui-field">
              
              <LegacySelect
                value={normalizeTheme(appearance.theme)}
                onChange={(e) => appearance.set({ theme: e.target.value })} aria-label={t("ui.theme.efb52e71")}
              >
                {["auto", ...themeIds].map((id) => (
                  <option key={id} value={id}>
                    {t(
                      id === "auto"
                        ? "theme.auto"
                        : `theme.${id as (typeof themeIds)[number]}`,
                    )}
                  </option>
                ))}
              </LegacySelect>
            </div>
            <label>
              {t("appearance.intensity")}
              <input
                type="range"
                min={0}
                max={100}
                value={appearance.backgroundIntensity}
                onChange={(e) =>
                  appearance.set({
                    backgroundIntensity: Number(e.target.value),
                  })
                }
              />
              <output>{appearance.backgroundIntensity}%</output>
            </label>
            <div className="form-grid">
              <div className="ui-field">
                
                <LegacySelect
                  value={appearance.tone}
                  onChange={(e) => appearance.set({ tone: e.target.value })} aria-label={t("ui.text.tone.267853f6")}
                >
                  {["soft", "standard", "sharp"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </LegacySelect>
              </div>
              <div className="ui-field">
                
                <LegacySelect
                  value={appearance.size}
                  onChange={(e) => appearance.set({ size: e.target.value })} aria-label={t("ui.text.size.d68761cc")}
                >
                  {["S", "M", "L", "XL"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </LegacySelect>
              </div>
              <div className="ui-field">
                
                <LegacySelect
                  value={appearance.weight}
                  onChange={(e) => appearance.set({ weight: e.target.value })} aria-label={t("ui.icon.weight.fef9b03c")}
                >
                  {["light", "regular", "bold"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </LegacySelect>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={appearance.solid}
                  onChange={(e) => appearance.set({ solid: e.target.checked })}
                />
                {t("ui.reduce.glass.aaacd6db")}
              </label>
            </div>
            <div className="ui-field">
              
              <LegacySelect
                value={appearance.fit}
                onChange={(e) =>
                  appearance.set({
                    fit: e.target.value as typeof appearance.fit,
                  })
                } aria-label={t("ui.fit.to.my.screen.189a4a53")}
              >
                {["auto", "compact", "comfortable", "large"].map((f) => (
                  <option key={f} value={f}>
                    {f[0].toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </LegacySelect>
            </div>
            <p className="chip">
              {appearance.fit === "auto"
                ? "Automatically adjusted for screen size and text"
                : "Your chosen screen fit"}
            </p>
            <div className="ui-field">
              
              <LegacySelect
                value={getUILocale()}
                onChange={(e) => setUILocale(e.target.value as Locale)} aria-label={t("language.label")}
              >
                {Object.entries(localeMetadata).map(([code, meta]) => (
                  <option key={code} value={code}>
                    {meta.nativeName}
                  </option>
                ))}
              </LegacySelect>
            </div>
            {getUILocale() !== "en" && <p>{t("language.draft")}</p>}
            <p>{t("language.browserNote")}</p>
            <div className="ui-field">
              
              <LegacySelect
                value={appearance.clock}
                onChange={(e) =>
                  appearance.set({
                    clock: e.target.value as typeof appearance.clock,
                  })
                } aria-label={t("ui.time.format.80d7dcf2")}
              >
                <option value="locale">
                  {t("ui.follow.language.9cc37a4f")}
                </option>
                <option value="12">{t("ui.12.hour.9ce198d5")}</option>
                <option value="24">{t("ui.24.hour.84f0698f")}</option>
              </LegacySelect>
            </div>
            <Greeting
              name={c.firstName}
              timezone={setup.timezone}
              locale={setup.language}
              clock={appearance.clock}
            />
            <h3>{t("ui.adapted.to.your.device.20e6c7f6")}</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={appearance.auto}
                onChange={(e) => appearance.set({ auto: e.target.checked })}
              />
              {t("ui.automatically.adapt.contrast.transparency..0052122f")}
            </label>
            <p className="muted">{t("refine.systemHelp")}</p>
          </section>
          <section className="card stack">
            <h2>{t("ui.congregation.delivery.8c50a108")}</h2>
            <Button onClick={() => setWizard(true)} type="button">
              {t("ui.open.setup.guide.8d9f188c")}
            </Button>
            <div className="ui-field">
              
              <LegacySelect
                value={setup.delivery}
                onChange={(e) =>
                  setSetup((s: any) => ({ ...s, delivery: e.target.value }))
                } aria-label={t("ui.delivery.mode.c9585346")}
              >
                {catalogue.deliveryModes.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </LegacySelect>
            </div>
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
              {t("ui.prefer.publisher.portal.942fcc6d")}
            </label>
            <Button
              disabled={busy}
              onClick={() => run(() => saveSetup(wizardStep))} type="button"
            >
              {t("ui.save.delivery.preferences.599553af")}
            </Button>
            <p className="muted">{t("refine.setupAccess")}</p>
          </section>
          <section className="card">
            <h2>{t("ui.privacy.protection.28602257")}</h2>
            <p>
              {t("ui.current.mode.bd4d698e")}
              <strong>{t("ui.standard.ef669154")}</strong>
              {t("ui.https.and.server.access.controls.protect.r.cc2fb558")}
            </p>
            <Disclosure>
              <DisclosureLabel>
                {t("ui.private.mode.verification.pending.be6e3463")}
              </DisclosureLabel>
              <p>
                {t("ui.private.mode.is.not.available.for.real.rec.ea869e6e")}
              </p>
              <p>
                {t("ui.private.mode.will.encrypt.sensitive.data.o.6bd6c9d1")}
              </p>
              <p>
                {t("ui.metadata.login.emails.compromised.devices..f0ad270c")}
              </p>
            </Disclosure>
          </section>
          <section className="card stack">
            <h2>{t("ui.data.cec3a9b8")}</h2>
            <Button
              disabled={!canPeople}
              onClick={() => download(people, "publishers-export.json")} type="button"
            >
              {t("ui.export.loaded.publisher.records.6105bd56")}
            </Button>
            {admin && (
              <>
                {c.plan && (
                  <Subscription context={c} plan={c.plan} standalone={false} />
                )}
                <Sessions context={c} />
                <RecordsExport context={c} />
                <Backup context={c} />
              </>
            )}
            <p className="muted">
              {t("ui.exports.contain.personal.information.store.a3c3fe4c")}
            </p>
          </section>
          <section className="card stack">
            <h2>{t("ui.help.install.74927d4c")}</h2>
            <InstallApp />
            <a href={appBaseURL + "site/android/"}>
              {t("ui.android.and.ios.installation.guide.1f9fce34")}
            </a>
            <a href={`mailto:${config.SUPPORT_EMAIL}`}>
              {t("ui.contact.support.814f4ed2")}
            </a>
            <p className="muted">
              {t("ui.build.ceca98bc")}
              {import.meta.env.VITE_BUILD_HASH || "development"}{" "}
              {t("ui.independent.and.unofficial.9fd7d37d")}
            </p>
            <a href={appBaseURL + ".well-known/build-hash.txt"}>
              {t("ui.verify.published.build.hash.d6fcd9ae")}
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
          <Button onClick={() => setError("")} type="button">
            {t("ui.dismiss.48845bff")}
          </Button>
        </div>
      )}
      {body}
      {editing && (
        <Suspense fallback={<p role="status">{t("common.loading")}</p>}>
          <PublisherEditor
            extendedPeople={Boolean(c.caps.extended_people)}
            people={people}
            editing={editing}
            setEditing={setEditing}
            dirty={dirty}
            setDirty={setDirty}
            admin={admin}
            busy={busy}
            demo={demo}
            groups={groups}
            shared={shared}
            setShared={setShared}
            household={household}
            existingShared={existingShared}
            error={error}
            run={run}
            savePerson={savePerson}
          />
        </Suspense>
      )}
      <Dialog
        open={wizard}
        onClose={() => {
          if (dirty && wizardSnapshot.current) setSetup(wizardSnapshot.current);
          setDirty(false);
          setError("");
          setWizard(false);
        }}
        title={`Setup guide · ${wizardStep + 1} of 11`}
        dirty={dirty}
      >
        <div
          className="progress"
          role="progressbar"
          aria-label={t("ui.setup.progress.e9b4495a")}
          aria-valuemin={1}
          aria-valuemax={11}
          aria-valuenow={wizardStep + 1}
        >
          {steps.map((s, i) => (
            <span key={s} className={i <= wizardStep ? "done" : ""} />
          ))}
        </div>
        <h2>{steps[wizardStep]}</h2>
        {wizardStep === 0 ? (
          <>
            <p>{t("ui.set.up.people.meeting.times.roles.and.a.sh.4b32ebc4")}</p>
            <p>{t("ui.about.10.minutes.once.your.account.is.appr.124bcb0a")}</p>
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
            <h3>{t("ui.standard.ef669154")}</h3>
            <p>{t("ui.server.access.controls.the.operator.can.te.71fd2594")}</p>
            <h3>{t("ui.private.verification.pending.a2a3b1bc")}</h3>
            <p>{t("ui.device.encryption.and.recovery.are.not.rel.05e8326a")}</p>
          </>
        ) : wizardStep === 3 ? (
          <div className="stack">
            {catalogue.deliveryModes.map((m) => (
              <Button
                key={m.id}
                aria-pressed={setup.delivery === m.id}
                onClick={() => {
                  setSetup((s: any) => ({ ...s, delivery: m.id }));
                  setDirty(true);
                }} type="button"
              >
                <strong>{m.name}</strong>
                <p>{m.description}</p>
              </Button>
            ))}
          </div>
        ) : wizardStep === 4 ? (
          <>
            <p>{t("ui.use.the.groups.screen.to.create.the.dropdo.eafb23cb")}</p>
            <Button
              onClick={() => {
                setWizard(false);
                setSub("groups");
                go("people");
              }} type="button"
            >
              {t("ui.manage.groups.faabea83")}
            </Button>
          </>
        ) : wizardStep === 5 ? (
          <>
            <p>{t("ui.paste.a.spreadsheet.upload.contacts.or.add.8cd87970")}</p>
            <Button
              onClick={() => {
                setWizard(false);
                setSub("import");
                go("people");
              }} type="button"
            >
              {t("ui.open.import.center.4c1a5823")}
            </Button>
          </>
        ) : wizardStep === 6 ? (
          <>
            <p>{t("ui.invite.main.administrators.and.overseers.u.cc371329")}</p>
            <Button
              onClick={() => {
                setWizard(false);
                go("access");
              }} type="button"
            >
              {t("ui.open.access.links.4072dc35")}
            </Button>
          </>
        ) : wizardStep === 7 ? (
          <>
            <p>{t("ui.prepare.your.first.midweek.and.weekend.sch.3e4cb7c3")}</p>
            <Button
              onClick={() => {
                setWizard(false);
                setSub("weekend");
                go("schedule");
              }} type="button"
            >
              {t("ui.open.weekend.schedule.5c9fdf1b")}
            </Button>
          </>
        ) : wizardStep === 8 ? (
          <>
            <p>{t("ui.publish.from.schedule.then.copy.your.stabl.39f031a9")}</p>
            <Button
              onClick={() => {
                setWizard(false);
                go("access");
              }} type="button"
            >
              {t("ui.open.links.hub.4a2ac880")}
            </Button>
          </>
        ) : wizardStep === 9 ? (
          <>
            <p>{t("ui.android.browser.menu.install.app.iphone.sh.75cd85ad")}</p>
            <a href={appBaseURL + "site/android/"}>
              {t("ui.view.installation.guide.27ce43e2")}
            </a>
          </>
        ) : (
          <>
            <h3>{t("ui.your.setup.guide.is.complete.129b697f")}</h3>
            <HomeGroupLinks
              context={c}
              period={new Date(
                new Date().getFullYear(),
                new Date().getMonth() - 1,
                15,
              )
                .toLocaleDateString("en-CA")
                .slice(0, 7)}
            />
            <p>{t("ui.review.home.and.publish.both.schedules.whe.6f7594bb")}</p>
          </>
        )}
        <div className="actions" style={{ marginTop: "1.5rem" }}>
          <Button
            disabled={wizardStep === 0 || busy}
            onClick={() => run(() => saveSetup(wizardStep - 1))} type="button"
          >
            {t("ui.back.76900f1b")}
          </Button>
          {wizardStep < 10 ? (
            <>
              <Button
                className="primary"
                disabled={busy}
                onClick={() => run(() => saveSetup(wizardStep + 1))} type="button"
              >
                {t("ui.save.continue.b75e6d06")}
              </Button>
              <Button
                disabled={busy}
                onClick={() => run(() => saveSetup(wizardStep + 1))} type="button"
              >
                {t("ui.skip.for.now.b58eb52c")}
              </Button>
            </>
          ) : (
            <Button className="primary" onClick={() => setWizard(false)} type="button">
              {t("ui.done.11a6767d")}
            </Button>
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
