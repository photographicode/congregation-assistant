import React from "react";
import { Button } from "../../../../packages/ui/components";
import { Field } from "../../../../packages/ui/Field";
import { rpc, config } from "./client";

// Public requests that need no sign-in: a new congregation workspace, or territory maps made for a congregation.
type Kind = "workspace" | "territory";
const NAME_MAX = 100, CONGREGATION_MAX = 150, EMAIL_MAX = 150, PHONE_MAX = 30, DETAILS_MIN = 10, DETAILS_MAX = 2000, DETAILS_ROWS = 5, REFERENCE_LENGTH = 8;
function readableError(e: unknown): string {
  const message = (e as Error)?.message || "";
  if (e instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message))
    return "We can’t reach the server. Check your connection and try again.";
  if (/too many requests|PT429|429/i.test(message)) return "Too many requests from this connection. Please try again in an hour.";
  if (/PGRST202|could not find the function/i.test(message)) return "This form is not open yet. Please email " + config.SUPPORT_EMAIL + " instead.";
  return message || "The request could not be sent. Please try again.";
}
export function RequestForm() {
  const kind: Kind = new URLSearchParams(location.search).get("request") === "territory" ? "territory" : "workspace";
  const [form, setForm] = React.useState({ name: "", email: "", congregation: "", admin: "", phone: "", details: "", website: "" }),
    [authorized, setAuthorized] = React.useState(false),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [reference, setReference] = React.useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  React.useEffect(() => {
    document.title = kind === "territory" ? "Request territory maps · Congregation Assistant" : "Request a workspace · Congregation Assistant";
  }, [kind]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = (kind === "territory"
        ? await rpc("submit_territory_request", { p_name: form.name, p_contact_email: form.email, p_congregation: form.congregation, p_phone: form.phone, p_details: form.details, p_website: form.website })
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
      <h1>{kind === "territory" ? "Request territory maps" : "Request a congregation workspace"}</h1>
      {kind === "territory" ? (
        <>
          <p>{"Congregation Assistant is a territory manager. It keeps your territories, assigns them, records returns and gives the right people access."}</p>
          <p>{"Making the maps is a separate service. If you have only the congregation boundary and need it split into territories, or need cards drawn, request it here. We reply by email with what we need and the cost."}</p>
        </>
      ) : (
        <p>{"Tell us about your congregation. We check each request and reply by email, usually within two working days. Your congregation's administrator signs in with Google, so give a Gmail address for them."}</p>
      )}
      {reference ? (
        <div className="stack" role="status">
          <h2>{"Request received"}</h2>
          <p>{kind === "territory" ? "Thank you. We will email you about your territory maps." : "Thank you. We will email you when the workspace is ready."}</p>
          {reference !== "received" && <p className="muted">{"Reference: "}{reference.slice(0, REFERENCE_LENGTH)}</p>}
          <a className="button" href={home}>{"Back to the website"}</a>
        </div>
      ) : (
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
              <Field label={"What do you need?"} hint={"For example: we have the boundary as a KML file and need about 40 territories, with printed cards."}>{(p) => <textarea {...p} required minLength={DETAILS_MIN} maxLength={DETAILS_MAX} rows={DETAILS_ROWS} value={form.details} onChange={set("details")} />}</Field>
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
