import React from "react";
import {
  Users,
  CalendarDays,
  BarChart3,
  FileDown,
  MessageCircle,
  Settings,
  ArrowRight,
} from "lucide-react";
import { t } from "../../../../packages/core/i18n";
import {
  sections,
  type SectionId,
  type Tool,
} from "../../../../packages/core/navigation";
const icons = {
  home: CalendarDays,
  people: Users,
  reports: BarChart3,
  meetings: CalendarDays,
  messages: MessageCircle,
  forms: FileDown,
  admin: Settings,
};
export function SectionHub({
  section,
  tools,
  onOpen,
  counts = {},
}: {
  section: SectionId;
  tools: Tool[];
  onOpen: (tool: Tool) => void;
  counts?: Record<string, number>;
}) {
  const Icon = icons[section];
  return (
    <section className="stack v3-hub">
      <header className="page-heading">
        <div>
          <span className="eyebrow">{t("brand.name")}</span>
          <h1>{t(sections.find((item) => item.id === section)!.label)}</h1>
          <p>{t("hub.choose")}</p>
        </div>
        <Icon aria-hidden="true" />
      </header>
      <div className="v3-tool-grid">
        {tools
          .filter((tool) => tool.section === section)
          .map((tool) => (
            <button
              className="card v3-tool-tile"
              key={tool.id}
              disabled={!tool.available}
              onClick={() => onOpen(tool)}
            >
              <span className="v3-tool-icon">
                <Icon aria-hidden="true" />
              </span>
              <strong>{t(tool.label)}</strong>
              <span>{t(tool.description)}</span>
              <span className="v3-tool-status">
                {typeof counts[tool.id] === "number" ? (
                  counts[tool.id]
                ) : tool.available ? (
                  <ArrowRight aria-hidden="true" />
                ) : (
                  t("hub.openingSoon")
                )}
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}
