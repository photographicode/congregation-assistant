import {navigateRoute} from "../useRoute";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import {
  pickSuggestions,
  suggestionHistory,
  type Suggestion,
} from "../../../../packages/core/suggestions";
import type { Context } from "../context";
import { Button } from "../../../../packages/ui/components";
import { handleError } from "../../../../packages/core/errors";
import { preferenceStorage } from "../../../../packages/core/storage";

const all = [
  "admin",
  "field_service",
  "group_overseer",
  "oclm",
  "weekend",
  "attendance",
  "attendant",
  "av",
  "cleaning",
  "publisher",
];
const launches = new Map<string, Suggestion[]>();
const ideas: [string, string, string, string, string[]][] = [
  [
    "s21",
    "Download records for a whole group",
    "Open S-21",
    "pdf",
    ["admin", "field_service", "group_overseer"],
  ],
  [
    "pioneers",
    "Use the pioneer filters for month-end records",
    "Choose a filter",
    "pdf",
    ["admin", "field_service"],
  ],
  [
    "year",
    "Choose the service year before downloading",
    "Open Download Center",
    "pdf",
    ["admin", "field_service", "group_overseer"],
  ],
  [
    "assistant",
    "Type “add a report for Maria Thomas, September, 3 hours, 2 studies”",
    "Open assistant",
    "assistant",
    ["admin"],
  ],
  [
    "links",
    "Give each group its own report link",
    "Open links",
    "access",
    ["admin", "field_service", "group_overseer"],
  ],
  [
    "parts",
    "Assign meeting parts from the least-recently-used suggestions",
    "Assign parts",
    "schedule",
    ["admin", "oclm"],
  ],
  [
    "slips",
    "Download a slip for the student and assistant together",
    "Open assignments",
    "schedule",
    ["admin", "oclm"],
  ],
  [
    "weekend",
    "Review this week’s speaker and talk",
    "Open weekend",
    "weekend",
    ["admin", "weekend"],
  ],
  [
    "attendance",
    "Keep meeting attendance up to date",
    "Open attendance",
    "current-attendance",
    ["admin", "attendance"],
  ],
  [
    "duties",
    "Review the approved people in your department",
    "Open duties",
    "duties",
    ["admin", "av", "attendant", "cleaning"],
  ],
  [
    "people",
    "Keep your publishers’ details current",
    "Open People",
    "people",
    ["admin", "field_service"],
  ],
  [
    "themes",
    "Find a theme that feels comfortable",
    "Choose a theme",
    "themes",
    all,
  ],
  [
    "text",
    "Larger text can make daily work easier",
    "Open appearance",
    "settings",
    all,
  ],
  [
    "install",
    "Keep the app on your home screen",
    "Install app",
    "settings",
    all,
  ],
  [
    "offline",
    "Reconnect after offline edits and check sync status",
    "Open settings",
    "settings",
    all,
  ],
  [
    "privacy",
    "Share congregation links only with intended recipients",
    "Review settings",
    "settings",
    all,
  ],
  [
    "size",
    "Try large text on your phone",
    "Open text settings",
    "settings",
    all,
  ],
  [
    "contrast",
    "Choose a high-contrast theme for bright surroundings",
    "Open themes",
    "themes",
    all,
  ],
  [
    "calm",
    "Prefer fewer choices? Try the Calm experience",
    "Open experience settings",
    "settings",
    all,
  ],
  [
    "clock",
    "Choose a clock format that is easy to read",
    "Open preferences",
    "settings",
    all,
  ],
  [
    "device",
    "Save your work before installing an update",
    "Open settings",
    "settings",
    all,
  ],
  [
    "share",
    "Check names and dates before sharing any document",
    "Open your tools",
    "settings",
    all,
  ],
  [
    "private-device",
    "Use a screen lock on devices with congregation records",
    "Open settings",
    "settings",
    all,
  ],
  [
    "zoom",
    "Your browser zoom and the app’s text size work together",
    "Open appearance",
    "settings",
    all,
  ],
  [
    "comfort",
    "Reduced motion follows your device preference",
    "Open settings",
    "settings",
    all,
  ],
  [
    "review",
    "Review the right reporting month before entering a report",
    "Open reports",
    "reports",
    ["admin", "field_service", "group_overseer"],
  ],
  [
    "help",
    "Keep your browser current for better offline support",
    "Open settings",
    "settings",
    all,
  ],
  [
    "logout",
    "Sign out when you finish using a shared device",
    "Open settings",
    "settings",
    all,
  ],
  [
    "connection",
    "Use the sync indicator to confirm edits have reached the server",
    "Open settings",
    "settings",
    all,
  ],
  [
    "night",
    "Try a dark theme for dim surroundings",
    "Open themes",
    "themes",
    all,
  ],
  [
    "screen",
    "Rotate your device for wider tables",
    "Open settings",
    "settings",
    all,
  ],
];
export function HomeSuggestions({
  context: c,
  missing,
  ready,
  go,
  period,
}: {
  context: Context;
  period: string;
  missing: number;
  ready: boolean;
  go: (route: string) => void;
}) {
  const key =
      "ca-suggestions:" +
      c.account +
      ":" +
      c.cong +
      ":" +
      c.roles.slice().sort().join(","),
    [cards, setCards] = React.useState<Suggestion[]>([]);
  React.useEffect(() => {
    if (!ready) return;
    if (launches.has(key)) {
      setCards(launches.get(key)!);
      return;
    }
    let history: string[][] = [],
      excluded: string[] = [];
    try {
      history = suggestionHistory(preferenceStorage.getItem(key));
      const snoozes = JSON.parse(
        preferenceStorage.getItem(key + ":snoozes") || "{}",
      );
      excluded = Object.entries(snoozes)
        .filter(([, until]) => Number(until) > Date.now())
        .map(([id]) => id);
    } catch (error) { handleError(error, {scope:"features/HomeSuggestions.tsx",severity:'warning'}); }
    const candidates: Suggestion[] = ideas.map(
      ([id, title, action, route, roles]) => ({
        id,
        title,
        action,
        route,
        roles,
        weight: 2,
      }),
    );
    if (missing)
      candidates.unshift({
        id: "missing",
        title: "Remind " + missing + " publishers to submit their reports",
        action: "Remind now",
        route: "reports",
        roles: ["admin", "field_service", "group_overseer"],
        weight: 30,
        urgent: true,
      });
    const picked = pickSuggestions(
      candidates,
      c.roles,
      history,
      Math.random,
      excluded,
    );
    launches.set(key, picked);
    setCards(picked);
    try {
      preferenceStorage.setItem(
        key,
        JSON.stringify([...history, picked.map((card) => card.id)].slice(-5)),
      );
    } catch (error) { handleError(error, {scope:"features/HomeSuggestions.tsx",severity:'warning'}); }
  }, [key, ready]);
  function dismiss(id: string, snooze = false) {
    const next = cards.filter((card) => card.id !== id);
    setCards(next);
    launches.set(key, next);
    if (snooze)
      try {
        const stored = JSON.parse(
          preferenceStorage.getItem(key + ":snoozes") || "{}",
        );
        stored[id] = Date.now() + 86400000;
        preferenceStorage.setItem(key + ":snoozes", JSON.stringify(stored));
      } catch (error) { handleError(error, {scope:"features/HomeSuggestions.tsx",severity:'warning'}); }
  }
  return ready && cards.length ? (
    <section className="stack" aria-label={t("ui.suggestions.16c1d601")}>
      <h2>{t("ui.next.steps.dd00d3d3")}</h2>
      <div className="grid">
        {cards.map((card) => (
          <article className="card stack" key={card.id}>
            <h3>
              {card.id === "missing"
                ? missing
                  ? "Remind " + missing + " publishers to submit their reports"
                  : "Review the current month’s reports"
                : card.title}
            </h3>
            <Button
              className="primary"
              onClick={() => {
                if (card.route === "themes") go("settings");
                else if (card.route === "current-attendance") {
                  navigateRoute({screen:"reports",tab:"attendance"});
                } else if (card.route === "duties") {
                  navigateRoute({screen:"schedule",tab:"duties"});
                } else if (card.route === "assistant")
                  document
                    .querySelector<HTMLButtonElement>(
                      'button[aria-label="Assistant (on-device)"]',
                    )
                    ?.click();
                else if (card.route === "weekend") {
                  navigateRoute({screen:"schedule",tab:"weekend"});
                } else if (card.route === "reports") {
                  navigateRoute({screen:"reports",action:"review",month:period});
                } else if (card.route === "pdf") {
                  navigateRoute({screen:"pdf",doc:"s21"});
                } else go(card.route);
              }} type="button"
            >
              {card.action}
            </Button>
            <div className="actions">
              <Button onClick={() => dismiss(card.id)} type="button">
                {t("ui.dismiss.48845bff")}
              </Button>
              <Button onClick={() => dismiss(card.id, true)} type="button">
                {t("ui.snooze.for.a.day.2ced3e55")}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  ) : null;
}
