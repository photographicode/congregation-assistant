import React from "react";
import { Button, LegacySelect } from "../../../../packages/ui/components";
import { Field } from "../../../../packages/ui/Field";
import { rpc, config } from "./client";
import { territoryUrl } from "./territory-site";

// Public requests that need no sign-in: a new congregation workspace, or territory maps made for a congregation.
type Kind = "workspace" | "territory";
// What a congregation can ask us to make. The choice is sent at the start of the request details.
const SERVICES = [
  { id: "scratch", label: "Make our territories from scratch", detail: "Send the congregation boundary (a KML file or a marked map). We split it into territories with clear street boundaries." },
  { id: "cards", label: "Make territory cards", detail: "Your territories already exist. We draw a Territory Map Card for each one." },
  { id: "package", label: "Complete package", detail: "From your KML file to everything: territories, a card for each, the territory manager set up with them, and a full congregation map with every territory named." },
] as const;
type Service = (typeof SERVICES)[number]["id"];
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
const PROGRESS = ["Not started: we have only the boundary", ...STEPS.slice(0, -1).map((step, i) => `Done up to step ${i + 1}: ${step}`)];
const COPY: Record<Kind, { title: string; heading: string; thanks: string }> = {
  territory: { title: "Territories · Congregation Assistant", heading: "Territories", thanks: "Thank you. We will email you about your territories." },
  workspace: { title: "Request a workspace · Congregation Assistant", heading: "Request a congregation workspace", thanks: "Thank you. We will email you when the workspace is ready." },
};
const NAME_MAX = 100, CONGREGATION_MAX = 150, EMAIL_MAX = 150, PHONE_MAX = 30, DETAILS_MIN = 10, DETAILS_MAX = 2000, DETAILS_ROWS = 5, REFERENCE_LENGTH = 8;
function readableError(e: unknown): string {
  const message = (e as Error)?.message || "";
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message))
    return "We can’t reach the server. Check your connection and try again.";
  if (/too many requests|PT429|429/i.test(message)) return "Too many requests from this connection. Please try again in an hour.";
  if (/PGRST202|could not find the function/i.test(message)) return "This form is not open yet. Please email " + config.SUPPORT_EMAIL + " instead.";
  return message || "The request could not be sent. Please try again.";
}
const chosenService = () => SERVICES.find((item) => item.id === new URLSearchParams(location.search).get("service"))?.id;
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
    [service, setService] = React.useState<Service>(() => chosenService() ?? "package"),
    [progress, setProgress] = React.useState(PROGRESS[0]);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  React.useEffect(() => {
    document.title = COPY[kind].title;
  }, [kind]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = (kind === "territory"
        ? await rpc("submit_territory_request", { p_name: form.name, p_contact_email: form.email, p_congregation: form.congregation, p_phone: form.phone, p_details: `[${SERVICES.find((item) => item.id === service)?.label}] [Now: ${progress}] ${form.details}`, p_website: form.website })
        : await rpc("submit_workspace_application", { p_name: form.name, p_contact_email: form.email, p_admin_email: form.admin, p_congregation: form.congregation, p_phone: form.phone, p_authorized: authorized, p_website: form.website })) as { reference?: string } | null;
      setReference(result?.reference || "received");
    } catch (failure) {
      setError(readableError(failure));
    } finally {
      setBusy(false);
    }
  }
  const home = config.PUBLIC_SITE_URL + "/";
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
                <ServicePicker value={service} onChange={setService} />
                <ProgressPicker value={progress} onChange={setProgress} />
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
        <p>{"The complete package also loads every territory into the territory manager and adds a full congregation map with all territory names. We reply by email with what we need and the cost."}</p>
        {!help && <button className="button" onClick={onHelp} type="button">{"Request help"}</button>}
      </section>
    </div>
  );
}

function ServicePicker({ value, onChange }: { value: Service; onChange: (service: Service) => void }) {
  return (
    <fieldset className="stack">
      <legend>{"What should we make?"}</legend>
      {SERVICES.map((item) => (
        <div key={item.id}>
          <label className="check">
            <input type="radio" name="territory-service" aria-describedby={"service-" + item.id} checked={value === item.id} onChange={() => onChange(item.id)} />
            {item.label}
          </label>
          <p className="muted" id={"service-" + item.id}>{item.detail}</p>
        </div>
      ))}
    </fieldset>
  );
}

/** Where the congregation is now among the seven making steps. */
function ProgressPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="stack">
      <LegacySelect value={value} required onChange={(e) => onChange(e.target.value)} aria-label={"Where are you now?"}>
        {PROGRESS.map((step) => (
          <option key={step} value={step}>
            {step}
          </option>
        ))}
      </LegacySelect>
      <ol className="muted">
        {STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
