import { t } from "../../../../packages/core/i18n";
import React from "react";
import { FileDown, Phone, Search } from "lucide-react";
import { csvRecords } from "./export.mjs";
import { Scene } from "./Scene";
import { Button } from "../../../../packages/ui/components";

type Contact = {
  id: string;
  name: string;
  group: string;
  address: string;
  phone: string;
  familyHeadId?: string;
  emergencyName?: string;
  emergencyRelationship?: string;
  emergencyPhone?: string;
};
export function EmergencyContacts({
  people,
  openPDF,
  loading,
  error,
}: {
  people: Contact[];
  openPDF: (people: Contact[]) => void | Promise<void>;
  loading: boolean;
  error?: string;
}) {
  const [search, setSearch] = React.useState(""),
    [limit, setLimit] = React.useState(50),
    [pdfBusy, setPdfBusy] = React.useState(false),
    [pdfError, setPdfError] = React.useState("");
  const filtered = people
    .filter((p) =>
      [p.name, p.group, p.address, p.emergencyName]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  function exportContacts() {
    const csv = csvRecords(
        filtered.map((p) => ({
          name: p.name,
          group: p.group,
          address: p.address,
          phone: p.phone,
          household_head:
            people.find((head) => head.id === p.familyHeadId)?.name || "",
          emergency_contact: p.emergencyName || "",
          relationship: p.emergencyRelationship || "",
          emergency_phone: p.emergencyPhone || "",
        })),
      ),
      url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "emergency-contacts.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="stack">
      <header className="page-heading">
        <div>
          <span className="eyebrow">{t("ui.people.households.cb4a9f61")}</span>
          <h1>{t("ui.emergency.contacts.9463d00b")}</h1>
          <p>{t("ui.keep.essential.contact.details.ready.for.a.1041f159")}</p>
        </div>
      </header>
      <section className="card stack">
        <label>
          {t("ui.find.a.contact.96472e51")}
          <input
            type="search"
            placeholder={t(
              "ui.name.group.address.or.emergency.contact.0a7d7ec6",
            )}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(50);
            }}
          />
        </label>
        <div className="actions">
          <Button
            disabled={loading || !!error || pdfBusy}
            onClick={() => {
              setPdfBusy(true);
              setPdfError("");
              void Promise.resolve()
                .then(() => openPDF(filtered))
                .catch(() => setPdfError("Emergency export failed. Retry."))
                .finally(() => setPdfBusy(false));
            }} type="button"
          >
            <FileDown />
            {pdfBusy ? "Preparing…" : "Emergency PDF"}
          </Button>
          <Button disabled={loading || !!error} onClick={exportContacts} type="button">
            {t("ui.download.contact.csv.c9a41c3f")}
          </Button>
        </div>
        <p>{t("refine.emergencyHelp0")}</p>
        <p>{t("refine.emergencyHelp1")}</p>
        {pdfError && <p role="alert">{pdfError}</p>}
        {loading && <p role="status">{t("ui.loading.contacts.9485587c")}</p>}
        {error && (
          <p role="alert">
            {t("ui.contacts.could.not.load.return.to.home.and.58641483")}
          </p>
        )}
        {!loading &&
          !error &&
          filtered.slice(0, limit).map((p) => (
            <article className="card" key={p.id}>
              <h2>{p.name}</h2>
              <p>
                {p.group || "No group"}
                {p.familyHeadId
                  ? " · Household: " +
                    (people.find((head) => head.id === p.familyHeadId)?.name ||
                      "Linked household")
                  : ""}
              </p>
              <p>{p.address || "No address recorded"}</p>
              {p.phone && (
                <p>
                  <a href={"tel:" + p.phone.replace(/[^+\d]/g, "")}>
                    <Phone /> {p.phone}
                  </a>
                </p>
              )}
              <div>
                <strong>{t("ui.emergency.contact.9e04489f")}</strong>
                <p>
                  {p.emergencyName || "Not recorded"}
                  {p.emergencyRelationship
                    ? " · " + p.emergencyRelationship
                    : ""}
                </p>
                {p.emergencyPhone && (
                  <a href={"tel:" + p.emergencyPhone.replace(/[^+\d]/g, "")}>
                    {p.emergencyPhone}
                  </a>
                )}
              </div>
            </article>
          ))}
        {filtered.length > limit && (
          <Button onClick={() => setLimit((n) => n + 50)} type="button">
            {t("ui.show.more.contacts.925a1906")}
          </Button>
        )}
        {!loading && !error && !filtered.length && (
          <div className="empty-scene">
            <Scene kind="publishers" />
            <p>{t("ui.no.contacts.match.this.search.0502756d")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
