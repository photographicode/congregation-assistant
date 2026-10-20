import {
  Disclosure,
  DisclosureLabel,
} from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  talkRecency,
  talkFinder,
  parseTalkBackfill,
  type TalkHistory,
} from "../../../../packages/core/talk-history";
import { rpc, demo } from "./client";
import type { Context } from "../main";
const schema = z.array(
  z.object({
    date: z.string(),
    talk_no: z.string(),
    title: z.string(),
    speaker: z.string(),
    speaker_congregation: z.string().optional(),
    source: z.string().optional(),
  }),
);
export function WeekendTalkHistory({
  context: c,
  number,
  speaker,
  date,
  onChoose,
  revision,
}: {
  context: Context;
  number: string;
  speaker: string;
  date: string;
  onChoose: (number: string, title: string) => void;
  revision: number;
}) {
  const key = "ca-talk-threshold:" + c.account + ":" + c.cong,
    [threshold, setThreshold] = React.useState(() => {
      try {
        return Number(localStorage.getItem(key)) || 12;
      } catch {
        return 12;
      }
    }),
    [query, setQuery] = React.useState(""),
    [paste, setPaste] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [local, setLocal] = React.useState<TalkHistory[]>([]);
  const history = useQuery({
    queryKey: ["talk-history", c.cong, revision],
    queryFn: async () =>
      demo
        ? [
            {
              date: "2025-03-14",
              talk_no: "12",
              title: "Fictional example talk",
              speaker: "Fictional Visitor",
            },
          ]
        : schema.parse(await rpc("ca_v3_talk_history", { p_cong_id: c.cong })),
  });
  const rows = [...(history.data || []), ...local],
    recency = talkRecency(rows, number, date, speaker, threshold);
  return (
    <div className="stack full">
      <div
        className={"talk-recency " + recency.tone}
        role="status"
        aria-live="polite"
        style={{ minHeight: "8em" }}
      >
        {history.isPending ? (
          "Checking talk history…"
        ) : history.error ? (
          "Talk history could not load."
        ) : !number ? (
          "Choose a talk number to check when it was last given."
        ) : recency.last ? (
          <>
            {t("ui.last.given.c25b7240")}
            {new Date(recency.last.date + "T12:00:00").toLocaleDateString(
              "en-GB",
              { day: "numeric", month: "short", year: "numeric" },
            )}{" "}
            · {recency.months} {t("ui.months.ago.7c41a3cb")}
            {recency.last.speaker ? " · Br. " + recency.last.speaker : ""}
            {recency.same && (
              <p>
                {t("ui.this.speaker.gave.the.same.talk.on.926b8011")}
                {new Date(recency.same.date + "T12:00:00").toLocaleDateString(
                  "en-GB",
                )}
                .
              </p>
            )}
          </>
        ) : (
          "Not given in your records"
        )}
      </div>
      <Disclosure>
        <DisclosureLabel>
          {t("ui.find.a.talk.add.past.talks.6a01420b")}
        </DisclosureLabel>
        <div className="stack">
          <label>
            {t("ui.recent.talk.warning.threshold.months.e88f5155")}
            <input
              type="number"
              min={1}
              max={60}
              value={threshold}
              onChange={(e) => {
                const value = Math.max(
                  1,
                  Math.min(60, Number(e.target.value) || 12),
                );
                setThreshold(value);
                try {
                  localStorage.setItem(key, String(value));
                } catch {}
              }}
            />
          </label>
          <label>
            {t("ui.find.talk.number.or.title.9bc451e0")}
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <p>{t("ui.least.recently.given.first.titles.remain.e.cf305220")}</p>
          {talkFinder(rows, date, query)
            .slice(0, 50)
            .map((row) => (
              <button
                key={row.talk_no}
                onClick={() => onChoose(row.talk_no, row.title)}
              >
                {row.talk_no} · {row.title || "Untitled talk"} · {row.date}
              </button>
            ))}
          <label>
            {t("ui.past.talks.yyyy.mm.dd.number.487b21d4")}
            <textarea
              rows={4}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={"2025-03-14, 12"}
            />
          </label>
          <label>
            {t("ui.or.choose.a.csv.30e25675")}
            <input
              type="file"
              accept=".csv,.tsv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 100000) {
                  setError("Choose a CSV smaller than 100 KB.");
                  return;
                }
                void file
                  .text()
                  .then(setPaste)
                  .catch(() => setError("File could not be read."));
              }}
            />
          </label>
          <button
            disabled={busy || !paste.trim()}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError("");
                try {
                  const parsed = parseTalkBackfill(paste);
                  if (demo) setLocal((old) => [...old, ...parsed]);
                  else {
                    await rpc("ca_v3_backfill_talks", {
                      p_cong_id: c.cong,
                      p_rows: parsed,
                    });
                    await history.refetch();
                  }
                  setPaste("");
                  c.notify("Past talk records added.");
                } catch (error) {
                  setError((error as Error).message);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            {t("ui.add.past.talk.records.131cac3c")}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </Disclosure>
    </div>
  );
}
