import React from "react";
import { Check, FileUp, LayoutDashboard, Layers, Map as MapIcon, X } from "lucide-react";
import { Button } from "../../../../packages/ui/components";
import { Field } from "../../../../packages/ui/Field";
import { rpc, config } from "./client";
import { onTerritoryHost, territoryUrl } from "./territory-site";
import { FILE_LIMITS, KIBIBYTE, readRequestFile, setProblem, type RequestFile } from "./request-files";

// Public requests that need no sign-in: a new congregation workspace, or territory maps made for a congregation.
type Kind = "workspace" | "territory";
// What a congregation needs; any mix. The choices are sent at the start of the request details.
const NEEDS = [
  { id: "cards", label: "Territory Cards", detail: "A Territory Map Card for each territory: the map with boundary roads named, landmarks, a QR code to Google Maps and the card-care note in your language." },
  { id: "map", label: "Full map", detail: "One high-resolution map of the whole congregation area with every territory number, ready to print large." },
  { id: "software", label: "Territory Management Software", detail: "Keep every territory, assign and return them, keep the S-13 record, share each card by link and collect reports from publishers." },
] as const;
type Need = (typeof NEEDS)[number]["id"];
// Links from the territory landing page name a service; each preselects the needs it covers.
const SERVICE_NEEDS: Record<string, Need[]> = { scratch: ["cards"], cards: ["cards"], package: ["cards", "map", "software"] };
// The making steps, in order. Congregations say which they have already finished.
const STEPS = [
  "Drawing all territories",
  "Splitting them",
  "Naming each territory (locality name)",
  "Finding each territory's corners",
  "Assigning QR codes",
  "Making the cards in the shown format",
  "A high-resolution full map with all numbers",
];
// The territory site keeps its own visitors: "Back to the website" returns to its landing page.
const homeUrl = () => (onTerritoryHost() ? location.origin + "/" : config.PUBLIC_SITE_URL + "/");
// The starting point before every step: only the congregation boundary KML from Hub.
const NOT_STARTED = "Just the KML file from Hub";
/** What the request says about progress: 0 is "not started", n is "done up to step n". */
const progressLabel = (done: number) => (done ? `Done up to step ${done}: ${STEPS[done - 1] ?? ""}` : NOT_STARTED);
const COPY: Record<Kind, { title: string; heading: string; thanks: string }> = {
  territory: { title: "Territories · Congregation Assistant", heading: "Territories", thanks: "Thank you. We will email you about your territories." },
  workspace: { title: "Request a workspace · Congregation Assistant", heading: "Request a congregation workspace", thanks: "Thank you. We will email you when the workspace is ready." },
};
const NAME_MAX = 100, CONGREGATION_MAX = 150, EMAIL_MAX = 150, PHONE_MAX = 30, DETAILS_MIN = 10, DETAILS_MAX = 2000, DETAILS_ROWS = 5, REFERENCE_LENGTH = 8;
function readableError(e: unknown, withFiles = false): string {
  const message = (e as Error)?.message || "";
  if (withFiles && /PGRST202|could not find the function/i.test(message))
    return "Attaching files is not open yet. Remove the files and send the request; we will ask for the KML by email.";
  if (/413|payload too large|request entity too large/i.test(message)) return "The files are too large to send. Keep them under 4 MB each.";
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message))
    return "We can’t reach the server. Check your connection and try again.";
  if (/too many requests|PT429|429/i.test(message)) return "Too many requests from this connection. Please try again in an hour.";
  if (/PGRST202|could not find the function/i.test(message)) return "This form is not open yet. Please email " + config.SUPPORT_EMAIL + " instead.";
  return message || "The request could not be sent. Please try again.";
}
const chosenService = () => SERVICE_NEEDS[new URLSearchParams(location.search).get("service") || ""];
/** Territory visitors see the form only after choosing to request help. */
const showsForm = (kind: Kind, help: boolean) => kind !== "territory" || help;
export function RequestForm() {
  const kind: Kind = new URLSearchParams(location.search).get("request") === "territory" ? "territory" : "workspace";
  const [form, setForm] = React.useState({ name: "", email: "", congregation: "", admin: "", phone: "", details: "", website: "" }),
    [authorized, setAuthorized] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [reference, setReference] = React.useState("");
  // Territory requests first ask what the congregation needs: the manager, or help making territories.
  // Arriving from the territory landing page with a service chosen goes straight to the form.
  const [help, setHelp] = React.useState(() => chosenService() !== undefined),
    [needs, setNeeds] = React.useState<Need[]>(() => chosenService() ?? ["cards"]),
    [progress, setProgress] = React.useState(0),
    [files, setFiles] = React.useState<RequestFile[]>([]),
    [fileError, setFileError] = React.useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  React.useEffect(() => {
    document.title = COPY[kind].title;
  }, [kind]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (kind === "territory" && !needs.length) { setError("Tick at least one thing you need."); return; }
    setBusy(true);
    setError("");
    const attach = kind === "territory" && files.length > 0;
    try {
      const territory = { p_name: form.name, p_contact_email: form.email, p_congregation: form.congregation, p_phone: form.phone, p_details: `[Needs: ${NEEDS.filter((item) => needs.includes(item.id)).map((item) => item.label).join(", ")}] [Now: ${progressLabel(progress)}] ${form.details}`, p_website: form.website };
      let call: [string, Record<string, unknown>] = ["submit_workspace_application", { p_name: form.name, p_contact_email: form.email, p_admin_email: form.admin, p_congregation: form.congregation, p_phone: form.phone, p_authorized: authorized, p_website: form.website }];
      if (kind === "territory") call = ["submit_territory_request", territory];
      if (attach) call = ["submit_territory_request_with_files", { ...territory, p_files: files.map(({ name, data }) => ({ name, data })) }];
      const result = (await rpc(...call)) as { reference?: string } | null;
      setReference(result?.reference || "received");
    } catch (failure) {
      setError(readableError(failure, attach));
    } finally {
      setBusy(false);
    }
  }
  const home = homeUrl();
  return (
    <main className="login card stack request-form">
      <h1>{COPY[kind].heading}</h1>
      {kind === "territory" ? (
        <TerritoryChoice help={help} onHelp={() => setHelp(true)} />
      ) : (
        <p>{"Tell us about your congregation. We check each request and reply by email, usually within two working days. Your congregation's administrator signs in with Google, so give a Gmail address for them."}</p>
      )}
      {reference && (
        <div className="stack" role="status">
          <h2>{"Request received"}</h2>
          <p>{COPY[kind].thanks}</p>
          {reference !== "received" && <p className="muted">{"Reference: "}{reference.slice(0, REFERENCE_LENGTH)}</p>}
          <a className="button" href={home}>{"Back to the website"}</a>
        </div>
      )}
      {!reference && showsForm(kind, help) && (
        <form className="stack" onSubmit={(e) => void submit(e)} aria-busy={busy}>
          <fieldset className="stack" disabled={busy}>
            <Field label={"Your name"}>{(p) => <input {...p} required minLength={2} maxLength={NAME_MAX} autoComplete="name" value={form.name} onChange={set("name")} />}</Field>
            <Field label={"Your email"} hint={"We reply to this address."}>{(p) => <input {...p} type="email" required maxLength={EMAIL_MAX} autoComplete="email" value={form.email} onChange={set("email")} />}</Field>
            <Field label={"Congregation name"}>{(p) => <input {...p} required minLength={2} maxLength={CONGREGATION_MAX} value={form.congregation} onChange={set("congregation")} />}</Field>
            {kind === "workspace" && (
              <Field label={"Administrator's Gmail address"} hint={"The person who will manage the workspace. It must end in @gmail.com."}>{(p) => <input {...p} type="email" required pattern="[A-Za-z0-9._%+\-]+@gmail\.com" maxLength={EMAIL_MAX} value={form.admin} onChange={set("admin")} />}</Field>
            )}
            <Field label={"Phone (optional)"}>{(p) => <input {...p} type="tel" maxLength={PHONE_MAX} autoComplete="tel" value={form.phone} onChange={set("phone")} />}</Field>
            {kind === "territory" && (
              <>
                <NeedsPicker value={needs} onChange={setNeeds} />
                <ProgressPicker value={progress} onChange={setProgress} />
                <BoundaryFiles files={files} error={fileError} onError={setFileError} onChange={setFiles} />
              <Field label={"Tell us about your territory"} hint={"For example: we have the boundary as a KML file and need about 40 territories. Card instructions in Malayalam."}>{(p) => <textarea {...p} required minLength={DETAILS_MIN} maxLength={DETAILS_MAX} rows={DETAILS_ROWS} value={form.details} onChange={set("details")} />}</Field>
              </>
            )}
            {kind === "workspace" && (
              <label className="check">
                <input type="checkbox" required checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
                <span>{"I am allowed to request this for my congregation."}</span>
              </label>
            )}
            <label className="sr-only" aria-hidden="true">
              {"Leave this empty"}
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </label>
          </fieldset>
          {error && <p role="alert" className="error">{error}</p>}
          <Button className="primary full" type="submit" disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
          <p className="muted">{"Do not include publisher names or reports. Questions: "}<a href={"mailto:" + config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a></p>
        </form>
      )}
    </main>
  );
}

/** First step for territories: open the manager, or ask for help making territories. */
function TerritoryChoice({ help, onHelp }: { help: boolean; onHelp: () => void }) {
  return (
    <div className="stack">
      <p>{"Territories are a separate part of Congregation Assistant. What do you need?"}</p>
      <section className="card stack">
        <h2>{"Manage our territories"}</h2>
        <p>{"Keep every territory, assign and return them, keep the S-13 record and share each map with the publisher who has it."}</p>
        <div className="actions">
          <a href={territoryUrl()}>{"Open the territory manager"}</a>
          <a href={territoryUrl("territory&demo")}>{"See the demo"}</a>
        </div>
      </section>
      <section className="card stack">
        <h2>{"Help us make our territories"}</h2>
        <p>{"We make them for you, from the congregation boundary to printed cards. Each Territory Map Card shows:"}</p>
        <ul>
          <li>{"the locality name and territory number"}</li>
          <li>{"the map with the territory shaded and the boundary roads named on every side"}</li>
          <li>{"a QR code that opens the territory in Google Maps, which can be shared with the publisher"}</li>
          <li>{"the card-care note in your language"}</li>
        </ul>
        <p>{"Start from just the KML file from Hub, then tick what you need: Territory Cards, a full map, the Territory Management Software, or all three. We reply by email with what we need. There is no fee; voluntary donations only."}</p>
        {!help && <button className="button" onClick={onHelp} type="button">{"Request help"}</button>}
      </section>
    </div>
  );
}

const NEED_ICONS: Record<Need, React.ReactNode> = { cards: <Layers />, map: <MapIcon />, software: <LayoutDashboard /> };

/** What the congregation needs, as checkboxes. The software comes with a demo link (sign-in is on the main page only). */
function NeedsPicker({ value, onChange }: { value: Need[]; onChange: (needs: Need[]) => void }) {
  const toggle = (id: Need, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id));
  return (
    <fieldset className="stack">
      <legend>{"What do you need? Tick all that apply."}</legend>
      {NEEDS.map((item) => (
        <div key={item.id}>
          <label className="check">
            <input type="checkbox" aria-describedby={"need-" + item.id} checked={value.includes(item.id)} onChange={(e) => toggle(item.id, e.target.checked)} />
            <span className="rf-icon" aria-hidden="true">{NEED_ICONS[item.id]}</span>
            {item.label}
          </label>
          <p className="muted" id={"need-" + item.id}>{item.detail}</p>
          {item.id === "software" && (
            <p className="muted">
              <a href={territoryUrl("territory&demo")} target="_blank" rel="noreferrer">{"Try the demo with 25 territory cards"}</a>
              {". Theme options are available: light, dark or automatic, in a soft or glass style."}
            </p>
          )}
        </div>
      ))}
    </fieldset>
  );
}

/** Where the congregation is now: tap the last finished step (tap it again to clear). */
function ProgressPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="rf-steps">
      <legend>{"Where are you now? Tap the last step you have finished."}</legend>
      <ol>
        <li className="done">
          <button type="button" aria-pressed={value === 0} onClick={() => onChange(0)}>
            <span className="rf-dot" aria-hidden="true"><Check /></span>
            {NOT_STARTED + " (starting point)"}
          </button>
        </li>
        {STEPS.map((step, i) => {
          const n = i + 1;
          return (
            <li key={step} className={n <= value ? "done" : undefined}>
              <button type="button" aria-pressed={n === value} onClick={() => onChange(n === value ? 0 : n)}>
                <span className="rf-dot" aria-hidden="true">{n <= value ? <Check /> : n}</span>
                {step}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="muted" aria-live="polite">{progressLabel(value)}</p>
    </fieldset>
  );
}

/** Optional boundary files (KML or KMZ from Google My Maps or Google Earth), read and checked in the browser. */
function BoundaryFiles({ files, error, onError, onChange }: { files: RequestFile[]; error: string; onError: (e: string) => void; onChange: (files: RequestFile[]) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  async function add(list: FileList | null) {
    onError("");
    if (!list?.length) return;
    try {
      const read = await Promise.all([...list].map(readRequestFile));
      const next = [...files, ...read];
      const problem = setProblem(next);
      if (problem) throw Error(problem);
      onChange(next);
    } catch (failure) {
      onError((failure as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="stack rf-files">
      <Field label={"Boundary file (optional)"} hint={"KML or KMZ, for example exported from Google My Maps (⋮ → Export to KML/KMZ). Up to 3 files, 4 MB each."} error={error || undefined}>
        {(p) => <input {...p} ref={input} type="file" accept=".kml,.kmz,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz" multiple disabled={files.length >= FILE_LIMITS.count} onChange={(e) => void add(e.target.files)} />}
      </Field>
      {files.length > 0 && (
        <ul className="rf-file-list" aria-label={"Attached files"}>
          {files.map((f) => (
            <li key={f.name}>
              <FileUp aria-hidden="true" />
              <span>{f.name}</span>
              <span className="muted">{`${Math.max(1, Math.round(f.size / KIBIBYTE))} KB`}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onChange(files.filter((x) => x !== f))}><X aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
