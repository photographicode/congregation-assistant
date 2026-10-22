import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { z } from "zod";
import { demo, rpc } from "./client";
import { csvRecords } from "./export.mjs";
import type { Context } from "../context";
const schema = z
  .object({
    format: z.literal("ca-records-export-v2"),
    congregation: z.string(),
  })
  .passthrough();
export function RecordsExport({ context: c }: { context: Context }) {
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [phrase, setPhrase] = React.useState("");
  async function download(encrypted = false) {
    setBusy(true);
    setError("");
    try {
      const data = demo
        ? {
            format: "ca-records-export-v2",
            congregation: "demo",
            publishers: [{ name: "Fictional Maria", phone: "+910000000000" }],
            reports: [],
            attendance: [],
            serviceGroups: [],
            weekendWeeks: [],
          }
        : schema.parse(
            await rpc("ca_v2_export_records", { p_cong_id: c.cong }),
          );
      let blob: Blob, name: string;
      if (encrypted) {
        const { recoveryBackup } = await import("./crypto-core.mjs");
        blob = new Blob([JSON.stringify(await recoveryBackup(phrase, data))], {
          type: "application/json",
        });
        name = "congregation-encrypted-records-export.json";
      } else {
        const { zipSync, strToU8 } = await import("fflate");
        const files: Record<string, Uint8Array> = {
          "records.json": strToU8(JSON.stringify(data, null, 2)),
          "README.txt": strToU8(
            "Authorized records export. CSV cells are protected against spreadsheet formula execution. This archive is for review/portability; use a workspace recovery backup for automatic restoration. Public bearer tokens and device sessions are intentionally excluded. Keep this file private.",
          ),
        };
        for (const [key, value] of Object.entries(data))
          if (
            Array.isArray(value) &&
            value.every(
              (row) => row && typeof row === "object" && !Array.isArray(row),
            )
          )
            files[key + ".csv"] = strToU8(csvRecords(value));
        blob = new Blob([Uint8Array.from(zipSync(files)).buffer], {
          type: "application/zip",
        });
        name = "congregation-records-export.zip";
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setPhrase("");
      c.notify("Records export downloaded. Store it privately.");
    } catch (e) {
      setError("Export could not complete. Retry; " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card stack">
      <h2>{t("ui.your.records.exportable.876f37f3")}</h2>
      <p>{t("refine.exportHelp0")}</p>
      <p>{t("refine.exportIncludes")}</p>
      <p>{t("refine.exportHelp1")}</p>
      <p>{t("refine.exportHelp2")}</p>
      <Button disabled={busy} onClick={() => void download()} type="button">
        {t("ui.download.records.archive.a4559a69")}
      </Button>
      <Disclosure>
        <DisclosureLabel>
          {t("ui.encrypt.this.records.export.6a00e7c7")}
        </DisclosureLabel>
        <div className="stack">
          <label>
            {t("ui.recovery.phrase.41edd3f4")}
            <input
              type="password"
              autoComplete="new-password"
              minLength={16}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
            />
          </label>
          <Button
            disabled={busy || phrase.length < 16}
            onClick={() => void download(true)} type="button"
          >
            {t("ui.download.encrypted.records.export.36d53913")}
          </Button>
          <p>{t("ui.keep.the.phrase.separately.without.it.this.c2151027")}</p>
        </div>
      </Disclosure>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
