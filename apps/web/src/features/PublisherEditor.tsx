import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import React from "react";
import { Dialog, DialogCancel } from "../../../../packages/ui/Dialog";
import { t } from "../../../../packages/core/i18n";
import type { Person } from "./publisher-record";
type Props = {
  extendedPeople: boolean;
  people: Person[];
  editing: Person | null;
  setEditing: React.Dispatch<React.SetStateAction<Person | null>>;
  dirty: boolean;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
  admin: boolean;
  busy: boolean;
  demo: boolean;
  groups: { id: string; name: string }[];
  shared: boolean;
  setShared: React.Dispatch<React.SetStateAction<boolean>>;
  household: Person[];
  existingShared: boolean;
  error: string;
  run: (task: () => Promise<void>) => void;
  savePerson: () => Promise<void>;
};
export default function PublisherEditor({
  extendedPeople,
  people,
  editing,
  setEditing,
  dirty,
  setDirty,
  admin,
  busy,
  demo,
  groups,
  shared,
  setShared,
  household,
  existingShared,
  error,
  run,
  savePerson,
}: Props) {
  return (
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
          <h3>{t("ui.basics.8fdd2ee8")}</h3>
          <div className="form-grid">
            <label>
              {t("ui.full.name.f13a64ba")}
              <input
                required
                value={editing.name}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, name: e.target.value } : p));
                  setDirty(true);
                }}
              />
            </label>
            <fieldset
              className="publisher-gender"
              aria-describedby="publisher-gender-help"
            >
              <legend>
                {t("polish.gender")} <span aria-hidden="true">*</span>
              </legend>
              <div className="gender-segments">
                {(["Male", "Female"] as const).map((value) => (
                  <label
                    key={value}
                    className={editing.gender === value ? "selected" : ""}
                  >
                    <input
                      required
                      type="radio"
                      name="publisher-gender"
                      value={value}
                      checked={editing.gender === value}
                      onInvalid={(e) =>
                        e.currentTarget.setCustomValidity(
                          t("polish.chooseGender"),
                        )
                      }
                      onChange={(e) => {
                        e.currentTarget.form
                          ?.querySelectorAll<HTMLInputElement>(
                            "[name=publisher-gender]",
                          )
                          .forEach((input) => input.setCustomValidity(""));
                        setEditing((p) => (p ? { ...p, gender: value } : p));
                        setDirty(true);
                      }}
                    />
                    {t(value === "Male" ? "polish.brother" : "polish.sister")}
                  </label>
                ))}
              </div>
              <small id="publisher-gender-help">
                {t("polish.chooseGender")}
              </small>
            </fieldset>
            <label>
              {t("ui.service.group.2c63b4a8")}
              <LegacySelect
                value={editing.group}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, group: e.target.value } : p));
                  setDirty(true);
                }}
              >
                <option value="">{t("ui.no.group.2463cfb8")}</option>
                {groups.map((g) => (
                  <option key={g.id}>{g.name}</option>
                ))}
              </LegacySelect>
            </label>
          </div>
          <h3>{t("ui.sign.in.contact.e4bd9038")}</h3>
          <label htmlFor="v2-publisher-email">
            {t("ui.email.for.sign.in.35de559f")}
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
            {t("ui.optional.a.shared.email.grants.household.r.04a91a95")}
          </small>
          {household.length > 0 && !shared && !existingShared && (
            <section className="banner">
              <p>
                {t("ui.this.email.is.already.used.by.85ee921a")}{" "}
                {household.map((p) => p.name).join(", ")}
                {t("ui.treat.as.a.household.so.one.sign.in.can.re.c707f656")}
              </p>
              <div className="actions">
                <Button type="button" onClick={() => setShared(true)}>
                  {t("ui.yes.share.reports.8a4792a9")}
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    setEditing((p) => (p ? { ...p, email: "" } : p))
                  }
                >
                  {t("ui.no.use.a.different.email.3efc239d")}
                </Button>
              </div>
            </section>
          )}
          {(shared || existingShared) && (
            <p role="status">
              {t("ui.household.reporting.confirmed.contacts.and.4d70ba0a")}
            </p>
          )}
          <div className="form-grid">
            <label>
              {t("ui.phone.63dceb88")}
              <input
                type="tel"
                value={editing.phone}
                onChange={(e) => {
                  setEditing((p) => (p ? { ...p, phone: e.target.value } : p));
                  setDirty(true);
                }}
              />
            </label>
            <label>
              {t("ui.address.56ef8f20")}
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
          <Disclosure>
            <DisclosureLabel>
              {t("ui.household.emergency.contact.publisher.reco.7544f6dc")}
            </DisclosureLabel>
            {demo || extendedPeople ? (
              <div className="stack">
                <div className="form-grid">
                  {(
                    [
                      ["dob", "Date of birth"],
                      ["baptized", "Date of baptism"],
                      ["emergencyName", "Emergency contact name"],
                      ["emergencyRelationship", "Relationship"],
                      ["emergencyPhone", "Emergency phone"],
                      ["spiritualStatus", "Publisher status"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        type={
                          key === "dob" || key === "baptized"
                            ? "date"
                            : key === "emergencyPhone"
                              ? "tel"
                              : "text"
                        }
                        value={editing[key] || ""}
                        onChange={(e) => {
                          setEditing((p) =>
                            p ? { ...p, [key]: e.target.value } : p,
                          );
                          setDirty(true);
                        }}
                      />
                    </label>
                  ))}
                </div>
                <label>
                  {t("ui.household.head.d5d0c49d")}
                  <LegacySelect
                    value={editing.familyHeadId || ""}
                    onChange={(e) => {
                      setEditing((p) =>
                        p ? { ...p, familyHeadId: e.target.value } : p,
                      );
                      setDirty(true);
                    }}
                  >
                    <option value="">
                      {t("ui.this.person.is.the.household.head.79acde35")}
                    </option>
                    {people
                      .filter((p) => p.id !== editing.id && !p.familyHeadId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </LegacySelect>
                </label>
                <label>
                  {t("ui.hope.8c765f98")}
                  <LegacySelect
                    value={editing.hope || ""}
                    onChange={(e) => {
                      setEditing((p) =>
                        p ? { ...p, hope: e.target.value } : p,
                      );
                      setDirty(true);
                    }}
                  >
                    <option value="">{t("ui.not.recorded.b37c7879")}</option>
                    <option>{t("ui.other.sheep.48f614b7")}</option>
                    <option>{t("ui.anointed.8edcfa4d")}</option>
                  </LegacySelect>
                </label>
                {(
                  [
                    ["isElder", "Elder"],
                    ["isMS", "Ministerial servant"],
                    ["isRP", "Regular pioneer"],
                    ["isSP", "Special pioneer"],
                    ["isFM", "Field missionary"],
                    ["isSFTS", t("sfts.name")],
                  ] as const
                ).map(([key, label]) => (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(editing[key])}
                      onChange={(e) => {
                        setEditing((p) =>
                          p ? { ...p, [key]: e.target.checked } : p,
                        );
                        setDirty(true);
                      }}
                    />
                    {label}
                  </label>
                ))}
                <p>{t("sfts.derived")}</p>
              </div>
            ) : (
              <p>
                {t("ui.ask.your.administrator.to.apply.the.extend.8666bf0c")}
              </p>
            )}
          </Disclosure>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button type="submit" className="primary" disabled={busy}>
              {t("ui.save.publisher.email.bc9559db")}
            </Button>
            <DialogCancel>{t("ui.cancel.19766ed6")}</DialogCancel>
          </div>
        </form>
      )}
    </Dialog>
  );
}
