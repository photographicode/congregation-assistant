import {manageGroupLink} from './link-action';
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { rpc, demo } from "./client";
import type { Context } from "../context";
import { Dialog } from "../../../../packages/ui/Dialog";
import { Button } from "../../../../packages/ui/components";

const schema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    token: z.string().nullable(),
    total: z.number(),
    submitted: z.number(),
    lastSubmission: z.string().nullable(),
  }),
);
export function HomeGroupLinks({
  context: c,
  period,
  manage = false,
}: {
  context: Context;
  period: string;
  manage?: boolean;
}) {
  const [year, month] = period.split("-").map(Number),
    allowed = c.roles.some((r) =>
      ["admin", "field_service", "group_overseer"].includes(r),
    ),
    [busy, setBusy] = React.useState(""),
    [qr, setQR] = React.useState(""),
    [qrImage, setQRImage] = React.useState("");
  const query = useQuery({
    queryKey: ["home-group-links", c.cong, period],
    enabled: allowed,
    queryFn: async () =>
      demo
        ? [
            {
              id: "1",
              name: "Group 1",
              token: null,
              total: 2,
              submitted: 2,
              lastSubmission: null,
            },
            {
              id: "2",
              name: "Group 2",
              token: null,
              total: 2,
              submitted: 1,
              lastSubmission: null,
            },
          ].slice(
            0,
            c.roles.includes("group_overseer") && !c.roles.includes("admin")
              ? 1
              : 2,
          )
        : schema.parse(
            await rpc("ca_v3_home_group_links", {
              p_cong_id: c.cong,
              p_year: year + (month >= 9 ? 1 : 0),
              p_month: month - 1,
            }),
          ),
    refetchOnWindowFocus: true,
  });
  const url = (token: string) =>
    location.origin +
    import.meta.env.BASE_URL +
    "?form=report#token=" +
    encodeURIComponent(token);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      c.notify("Links copied. Share them only with the intended groups.");
    } catch {
      c.notify(
        "Copy is unavailable in this browser. Open the link and copy its address.",
      );
    }
  }
  if (!allowed) return null;
  return (
    <section className="card stack">
      <h2>{t("ui.group.report.links.0ce81c1e")}</h2>
      <p>
        {period} {t("ui.share.privately.3d1912ff")}
        {manage
          ? " Rotating or revoking stops the old link immediately."
          : " Manage links in Links Hub."}
      </p>
      {query.isPending && (
        <p role="status">{t("ui.loading.group.links.34ede8a5")}</p>
      )}
      {query.error && (
        <p role="alert">
          {t("ui.group.links.could.not.load.35780a65")}
          <Button onClick={() => void query.refetch()} type="button">
            {t("ui.retry.942087cc")}
          </Button>
        </p>
      )}
      {query.data?.map((group) => (
        <article className="list-row" key={group.id}>
          <div>
            <strong>{group.name}</strong>
            <p>
              {group.submitted} {t("ui.of.4acb731c")}
              {group.total} {t("ui.submitted.this.month.afb9cd68")}
            </p>
            <p className="muted">
              {t("ui.last.submission.ae379f10")}
              {group.lastSubmission
                ? new Date(group.lastSubmission).toLocaleString()
                : "No submission time recorded"}
            </p>
          </div>
          <div className="actions">
            {group.token ? (
              <>
                <Button onClick={() => void copy(url(group.token!))} type="button">
                  {t("ui.copy.link.dbf362d4")}
                </Button>
                <Button
                  onClick={() => {
                    void import("qrcode")
                      .then(async ({ default: QRCode }) => {
                        setQRImage(
                          await QRCode.toDataURL(url(group.token!), {
                            margin: 2,
                            width: 320,
                          }),
                        );
                        setQR(group.name);
                      })
                      .catch(() =>
                        c.notify(
                          "QR generation failed. Copy the link instead.",
                        ),
                      );
                  }} type="button"
                >
                  {t("ui.qr.a439fba4")}
                </Button>
                <Button
                  onClick={() => {
                    const text =
                      group.name +
                      " · Submit your " +
                      period +
                      " report: " +
                      url(group.token!);
                    if (navigator.share)
                      void navigator.share({ text }).catch((error) => {
                        if (error.name !== "AbortError")
                          c.notify("Share unavailable. Use Copy link.");
                      });
                    else void copy(text);
                  }} type="button"
                >
                  {t("ui.share.29887a5f")}
                </Button>
                <a
                  className="button"
                  href={url(group.token)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("ui.open.ed077f3d")}
                </a>
                {manage &&
                  (["rotate", "revoke"] as const).map((action) => (
                    <Button
                      key={action}
                      disabled={!!busy}
                      onClick={() => {
                        setBusy(group.id);
                        void manageGroupLink(c.cong,group.token!,action)
                          .then(() => query.refetch())
                          .then(() =>
                            c.notify(
                              action === "rotate"
                                ? "New group link created; the old link is withdrawn."
                                : "Group link withdrawn.",
                            ),
                          )
                          .catch((error) => c.notify(error.message))
                          .finally(() => setBusy(""));
                      }} type="button"
                    >
                      {action === "rotate" ? "Rotate link" : "Revoke link"}
                    </Button>
                  ))}
              </>
            ) : (
              <Button
                disabled={!!busy}
                onClick={() => {
                  if (demo) {
                    c.notify("The demo creates no public links.");
                    return;
                  }
                  setBusy(group.id);
                  void rpc("create_public_link", {
                    p_cong_id: c.cong,
                    p_kind: "report",
                    p_group: group.name,
                    p_pub_id: null,
                  })
                    .then(() => query.refetch())
                    .catch((error) => c.notify(error.message))
                    .finally(() => setBusy(""));
                }} type="button"
              >
                {t("ui.create.link.e6b850cf")}
              </Button>
            )}
          </div>
        </article>
      ))}
      {!query.isPending && !query.error && !query.data?.length && (
        <p>{t("ui.add.your.field.service.groups.in.people.to.24551af2")}</p>
      )}
      <Button
        disabled={!query.data?.some((g) => g.token)}
        onClick={() =>
          void copy(
            query
              .data!.filter((g) => g.token)
              .map((g) => g.name + " · " + period + " report: " + url(g.token!))
              .join("\n"),
          )
        } type="button"
      >
        {t("ui.copy.all.for.whatsapp.93e107d6")}
      </Button>
      <Dialog
        open={!!qr}
        title={t("refine.qrReportTitle")}
        onClose={() => {
          setQR("");
          setQRImage("");
        }}
      >
        <p>
          <strong>{qr}</strong>
        </p>
        {qrImage && (
          <img
            src={qrImage}
            alt={"Private report link for " + qr}
            width={320}
            height={320}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        )}
      </Dialog>
    </section>
  );
}
