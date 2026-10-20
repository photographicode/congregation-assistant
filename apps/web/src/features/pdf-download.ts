import {
  missingReportMonths,
  publisherFileName,
} from "../../../../packages/core/pdf-accuracy";
import { repositories } from "../../../../packages/core/repositories";
import {
  publisherRecord,
  reportRecord,
} from "../../../../packages/pdf/snapshot";
import { storeFor } from "./client";
import type { Context } from "../main";
export { pdfAssets } from "./pdf-assets";
import { runPDF } from "./pdf-worker-client";
export function offerPDF(
  bytes: Uint8Array,
  name: string,
  type = "application/pdf",
) {
  const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type }),
    ),
    link = document.createElement("a");
  link.href = url;
  if ("download" in link) {
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
  } else window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export const pdfName = publisherFileName;
export async function deliverPDF(
  bytes: Uint8Array,
  name: string,
  action: "download" | "print" | "share" = "download",
): Promise<"download" | "print" | "share" | "cancel"> {
  if (action === "download") {
    offerPDF(bytes, name);
    return "download";
  }
  if (action === "share") {
    const file = new File([Uint8Array.from(bytes).buffer], name, {
      type: "application/pdf",
    });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Congregation document",
        });
        return "share";
      } catch (error) {
        if ((error as Error).name === "AbortError") return "cancel";
        throw error;
      }
    }
    offerPDF(bytes, name);
    return "download";
  }
  const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type: "application/pdf" }),
    ),
    frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "Print document";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  document.body.append(frame);
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 60000);
  return "print";
}

export async function publisherS21(
  c: Context,
  id: string,
  fictional?: Record<string, unknown>,
  year = new Date().getFullYear() + (new Date().getMonth() >= 8 ? 1 : 0),
  action: "download" | "print" | "share" = "download",
) {
  const repo = repositories(storeFor(c.cong, c.roles), c.cong),
    people = fictional
      ? [publisherRecord(fictional)]
      : (await repo.people.list())
          .filter((p) => p.id === id)
          .map(publisherRecord);
  if (!people.length)
    throw Error("Publisher unavailable in your accessible roster.");
  const reports = fictional
    ? []
    : (await repo.reports.year(year)).map(reportRecord);
  const bytes = await runPDF(
    "s21",
    { id: c.cong, name: c.name, publishers: people, reports },
    [people, year],
  );
  const delivered = await deliverPDF(
    bytes,
    "S-21_" + pdfName(people[0].name) + "_" + year + ".pdf",
    action,
  );
  const missing = missingReportMonths(id, year, reports);
  if (delivered === "cancel") return;
  c.notify(
    (delivered === "download"
      ? "S-21 downloaded"
      : delivered === "print"
        ? "S-21 prepared for printing"
        : "S-21 share opened") +
      (missing ? " · " + missing + " months have no report" : "") +
      " · Review in Reports",
  );
}
