import {
  Disclosure,
  DisclosureLabel,
} from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import type { Program } from "../../../../packages/core/meeting";
export function ManualMeetingParts({
  onSave,
}: {
  onSave: (program: Program) => void;
}) {
  const [title, setTitle] = React.useState(""),
    [minutes, setMinutes] = React.useState(10),
    [parts, setParts] = React.useState<Program["parts"]>([]),
    [section, setSection] = React.useState<"treasures" | "field" | "living">(
      "treasures",
    );
  return (
    <Disclosure>
      <DisclosureLabel>{t("ui.enter.parts.manually.c00aad5d")}</DisclosureLabel>
      <div className="stack">
        <p>{t("ui.use.this.only.when.the.published.week.is.u.9e419e04")}</p>
        <label>
          {t("ui.part.title.72be0390")}
          <input
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          {t("ui.minutes.4f846a84")}
          <input
            type="number"
            min={0}
            max={60}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </label>
        <label>
          {t("ui.section.dfca5da5")}
          <LegacySelect
            value={section}
            onChange={(e) => setSection(e.target.value as typeof section)}
          >
            <option value="treasures">{t("ui.treasures.a6fe878a")}</option>
            <option value="field">{t("ui.field.ministry.e3b9a1fe")}</option>
            <option value="living">
              {t("ui.living.as.christians.e435a9b4")}
            </option>
          </LegacySelect>
        </label>
        <button
          disabled={
            !title.trim() ||
            !Number.isInteger(minutes) ||
            minutes < 0 ||
            minutes > 60 ||
            parts.length >= 36
          }
          onClick={() => {
            setParts([
              ...parts,
              {
                id: "Manual" + parts.length,
                type:
                  section === "field"
                    ? "Conversation"
                    : section === "treasures"
                      ? "TreasuresTalk"
                      : "ChristianParts",
                section,
                title: title.trim(),
                minutes,
                assistant: section === "field",
              },
            ]);
            setTitle("");
          }}
        >
          {t("ui.add.part.16b7300b")}
        </button>
        <ol>
          {parts.map((part) => (
            <li key={part.id}>
              {part.title} · {part.minutes} {t("ui.min.8c8cddbd")}
            </li>
          ))}
        </ol>
        <button
          disabled={!parts.length}
          onClick={() =>
            onSave({
              reading: "",
              reviewed: true,
              sourceMonth: new Date().toISOString().slice(0, 7),
              parts,
            })
          }
        >
          {t("ui.use.these.parts.5b269055")}
        </button>
      </div>
    </Disclosure>
  );
}
