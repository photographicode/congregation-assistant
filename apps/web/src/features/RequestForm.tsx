import React from "react";
import { Check, FileUp, LayoutDashboard, Layers, Map as MapIcon, Upload, X } from "lucide-react";
import { Button } from "../../../../packages/ui/components";
import { Field } from "../../../../packages/ui/Field";
import { rpc, config } from "./client";
import { onTerritoryHost, territoryUrl } from "./territory-site";
import { KIBIBYTE, readRequestFile, type RequestFile } from "./request-files";
import { AREAS, EMAIL, NEEDS, NOT_STARTED, progressLabel, progressText, requestDetails, SERVICE_NEEDS, STEPS, sectionState, submitLabel, territoryProblem, type Need } from "./request-form-model";

// Public requests that need no sign-in: a new congregation workspace, or territory maps made for a congregation.
type Kind = "workspace" | "territory";
// The territory site keeps its own visitors: "Back to the website" returns to its landing page.
const homeUrl = () => (onTerritoryHost() ? location.origin + "/" : config.PUBLIC_SITE_URL + "/");
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
    [fileError, setFileError] = React.useState(""),
    [areas, setAreas] = React.useState<string[]>([]),
    [review, setReview] = React.useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  React.useEffect(() => {
    document.title = COPY[kind].title;
  }, [kind]);
  /** Territory requests are checked, then shown once for review; the second press sends them. */
  function holdForReview() {
    if (kind !== "territory") return false;
    const problem = territoryProblem(needs, files);
    setError(problem);
    if (problem) return true;
    if (review) return false;
    setReview(true);
    scrollToForm();
    return true;
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (holdForReview()) return;
    setBusy(true);
    setError("");
    const attach = kind === "territory" && files.length > 0;
    try {
      const territory = { p_name: form.name, p_contact_email: form.email, p_congregation: form.congregation, p_phone: form.phone, p_details: requestDetails(needs, areas, progress, form.details), p_website: form.website };
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
            {kind === "territory" ? (
              <TerritoryFields form={form} set={set} needs={needs} onNeeds={setNeeds} progress={progress} onProgress={setProgress} files={files} fileError={fileError} onFileError={setFileError} onFiles={setFiles} areas={areas} onAreas={setAreas} review={review} onEdit={(n) => { setReview(false); requestAnimationFrame(() => document.getElementById("rf-section-" + n)?.scrollIntoView({ behavior: "smooth", block: "start" })); }} />
            ) : (
              <>
                <ContactFields form={form} set={set} />
                <Field label={"Administrator's Gmail address"} hint={"The person who will manage the workspace. It must end in @gmail.com."}>{(p) => <input {...p} type="email" required pattern="[A-Za-z0-9._%+\-]+@gmail\.com" maxLength={EMAIL_MAX} value={form.admin} onChange={set("admin")} />}</Field>
                <Field label={"Phone (optional)"}>{(p) => <input {...p} type="tel" maxLength={PHONE_MAX} autoComplete="tel" value={form.phone} onChange={set("phone")} />}</Field>
                <label className="check">
                  <input type="checkbox" required checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
                  <span>{"I am allowed to request this for my congregation."}</span>
                </label>
              </>
            )}
            <label className="sr-only" aria-hidden="true">
              {"Leave this empty"}
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
            </label>
          </fieldset>
          {error && <p role="alert" className="error">{error}</p>}
          <Button className="primary full" type="submit" disabled={busy}>{submitLabel(busy, kind === "territory" && !review)}</Button>
          <p className="muted">{"Do not include publisher names or reports. Questions: "}<a href={"mailto:" + config.SUPPORT_EMAIL}>{config.SUPPORT_EMAIL}</a></p>
        </form>
      )}
    </main>
  );
}

/** First step for territories: what we make, then the request. */
function TerritoryChoice({ help, onHelp }: { help: boolean; onHelp: () => void }) {
  return (
    <div className="stack">
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

const scrollToForm = () => requestAnimationFrame(() => document.querySelector(".rf-progress")?.scrollIntoView({ behavior: "smooth", block: "start" }));

type FormState = { name: string; email: string; congregation: string; phone: string; details: string };
type Setter = (key: "name" | "email" | "congregation" | "phone" | "details") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;

function ContactFields({ form, set }: { form: FormState; set: Setter }) {
  return (
    <>
      <Field label={"Your name"}>{(p) => <input {...p} required minLength={2} maxLength={NAME_MAX} autoComplete="name" value={form.name} onChange={set("name")} />}</Field>
      <Field label={"Your email"} hint={"We reply to this address."}>{(p) => <input {...p} type="email" required maxLength={EMAIL_MAX} autoComplete="email" value={form.email} onChange={set("email")} />}</Field>
      <Field label={"Congregation name"}>{(p) => <input {...p} required minLength={2} maxLength={CONGREGATION_MAX} value={form.congregation} onChange={set("congregation")} />}</Field>
    </>
  );
}

const PERCENT = 100, CONTACT_ANSWERS = 3;
/** One numbered part of the territory request. Its badge turns into a tick when its required answers are in. */
function Section({ n, title, done, optional, children }: { n: number; title: string; done: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <section className={"rf-section" + (done ? " done" : "")} aria-labelledby={"rf-section-" + n}>
      <header>
        <span className="rf-dot" aria-hidden="true">{done ? <Check /> : n}</span>
        <h2 id={"rf-section-" + n}>{title}</h2>
        <span className="rf-state">{sectionState(done, optional)}</span>
      </header>
      {children}
    </section>
  );
}

/** The territory request in four sections, with a bar that stays on screen and counts the required answers. */
type TerritoryProps = { form: FormState; set: Setter; needs: Need[]; onNeeds: (n: Need[]) => void; progress: number; onProgress: (n: number) => void; files: RequestFile[]; fileError: string; onFileError: (e: string) => void; onFiles: (f: RequestFile[]) => void; areas: string[]; onAreas: (a: string[]) => void; review: boolean; onEdit: (section: number) => void };
function TerritoryFields(props: TerritoryProps) {
  const { form, set, needs } = props;
  const answers = [form.name.trim().length >= 2, EMAIL.test(form.email.trim()), form.congregation.trim().length >= 2, needs.length > 0, props.files.length > 0];
  const done = answers.filter(Boolean).length;
  const percent = Math.round((done / answers.length) * PERCENT);
  return (
    <>
      <div className="rf-progress" role="group" aria-label={"Your progress"}>
        <div className="rf-progress-text"><strong>{progressText(props.review, done, answers.length)}</strong><span>{percent + "%"}</span></div>
        <progress max={answers.length} value={done} aria-label={"Required answers given"} />
      </div>
      {props.review && <Review {...props} />}
      <div className="rf-sections" hidden={props.review}>
      <Section n={1} title={"About you"} done={answers.slice(0, CONTACT_ANSWERS).every(Boolean)}>
        <div className="rf-grid">
          <ContactFields form={form} set={set} />
          <Field label={"Phone (optional)"}>{(p) => <input {...p} type="tel" maxLength={PHONE_MAX} autoComplete="tel" value={form.phone} onChange={set("phone")} />}</Field>
        </div>
      </Section>
      <Section n={2} title={"What do you need?"} done={needs.length > 0}>
        <NeedsPicker value={needs} onChange={props.onNeeds} />
      </Section>
      <Section n={3} title={"Where are you now?"} done optional>
        <ProgressPicker value={props.progress} onChange={props.onProgress} />
      </Section>
      <Section n={4} title={"Your KML file and your area"} done={answers[4]!}>
        <BoundaryFiles files={props.files} error={props.fileError} onError={props.onFileError} onChange={props.onFiles} />
        <AreaPicker value={props.areas} onChange={props.onAreas} />
        <Field label={"Anything else? (optional)"} hint={"For example: about 40 territories, roughly 150 houses each, card notes in Malayalam."}>{(p) => <textarea {...p} maxLength={DETAILS_MAX} rows={DETAILS_ROWS} value={form.details} onChange={set("details")} />}</Field>
      </Section>
      </div>
    </>
  );
}


function AreaPicker({ value, onChange }: { value: string[]; onChange: (a: string[]) => void }) {
  return (
    <fieldset className="rf-areas">
      <legend>{"What is the area like? Tick all that apply."}</legend>
      {AREAS.map((a) => (
        <label key={a} className="rf-chip">
          <input type="checkbox" checked={value.includes(a)} onChange={(e) => onChange(e.target.checked ? [...value, a] : value.filter((x) => x !== a))} />
          <span>{a}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** Everything the request will send, part by part, each with an Edit button that reopens that section. */
function Review(props: TerritoryProps) {
  const { form, needs } = props;
  const rows: [string, string][] = [
    ["About you", [form.name, form.email, form.congregation, form.phone].filter(Boolean).join(" · ")],
    ["What you need", NEEDS.filter((n) => needs.includes(n.id)).map((n) => n.label).join(", ")],
    ["Where you are now", progressLabel(props.progress)],
    ["KML file and area", [props.files.map((f) => f.name).join(", "), props.areas.join(", "), form.details.trim()].filter(Boolean).join(" · ")],
  ];
  return (
    <section className="rf-review" aria-labelledby="rf-review-title">
      <h2 id="rf-review-title">{"Review your request"}</h2>
      <dl>
        {rows.map(([title, text], i) => (
          <div key={title}>
            <dt>{title}</dt>
            <dd>{text || "—"}</dd>
            <button type="button" className="button" onClick={() => props.onEdit(i + 1)}>{"Edit"}</button>
          </div>
        ))}
      </dl>
    </section>
  );
}

const NEED_ICONS: Record<Need, React.ReactNode> = { cards: <Layers />, map: <MapIcon />, software: <LayoutDashboard /> };

/** What the congregation needs, as checkboxes. The software comes with a demo link (sign-in is on the main page only). */
function NeedsPicker({ value, onChange }: { value: Need[]; onChange: (needs: Need[]) => void }) {
  const toggle = (id: Need, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id));
  return (
    <fieldset className="rf-needs">
      <legend className="sr-only">{"What do you need? Tick all that apply."}</legend>
      <p className="muted rf-wide">{"Tick all that apply. You can start from just the KML file from Hub."}</p>
      {NEEDS.map((item) => (
        <label key={item.id} className="rf-need">
          <input type="checkbox" aria-describedby={"need-" + item.id} checked={value.includes(item.id)} onChange={(e) => toggle(item.id, e.target.checked)} />
          <span className="rf-need-top"><span className="rf-icon" aria-hidden="true">{NEED_ICONS[item.id]}</span><strong>{item.label}</strong><span className="rf-tick" aria-hidden="true"><Check /></span></span>
          <span className="muted" id={"need-" + item.id}>{item.detail}</span>
        </label>
      ))}
      <p className="muted rf-wide">
        <a href={territoryUrl("territory&demo")} target="_blank" rel="noreferrer">{"Try the software demo with 25 territory cards"}</a>
        {". Theme options are available: light, dark or automatic, in a soft or glass style."}
      </p>
    </fieldset>
  );
}

/** Where the congregation is now: tap the last finished step (tap it again to clear). */
function ProgressPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="rf-steps">
      <legend className="muted">{"Tap the last step you have finished."}</legend>
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

/** The boundary file: one .kml from JW Hub, up to 5 MB. Drop it on the box or choose it, like an upload on Google Drive. */
function BoundaryFiles({ files, error, onError, onChange }: { files: RequestFile[]; error: string; onError: (e: string) => void; onChange: (files: RequestFile[]) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const file = files[0];
  async function take(list: FileList | null | undefined) {
    onError("");
    if (!list?.length) return;
    try {
      if (list.length > 1) throw Error("Drop one KML file.");
      onChange([await readRequestFile(list[0]!)]);
    } catch (failure) {
      onError((failure as Error).message);
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    void take(e.dataTransfer.files);
  };
  return (
    <div className="stack rf-files">
      <strong id="rf-kml-label">{"KML file from JW Hub"}</strong>
      {file ? (
        <div className="rf-file" role="status" aria-labelledby="rf-kml-label">
          <span className="rf-icon" aria-hidden="true"><FileUp /></span>
          <span className="rf-file-name">{file.name}<small className="muted">{`${Math.max(1, Math.round(file.size / KIBIBYTE))} KB · ready`}</small></span>
          <button type="button" className="rf-file-remove" aria-label={`Remove ${file.name}`} onClick={() => onChange([])}><X aria-hidden="true" /></button>
        </div>
      ) : (
        <>
          <input ref={input} className="sr-only" type="file" tabIndex={-1} accept=".kml,application/vnd.google-earth.kml+xml" aria-hidden="true" onChange={(e) => void take(e.target.files)} />
          <button type="button" className={"rf-drop" + (over ? " over" : "")} aria-labelledby="rf-kml-label" aria-describedby="rf-kml-hint" onClick={() => input.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
            <Upload aria-hidden="true" />
            <strong>{"Drag your KML file here"}</strong>
            <span>{"or "}<u>{"choose a file"}</u></span>
            <small className="muted" id="rf-kml-hint">{"One .kml file, up to 5 MB. Ask your congregation secretary for it."}</small>
          </button>
        </>
      )}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}
