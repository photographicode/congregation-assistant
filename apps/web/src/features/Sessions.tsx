import {
  Disclosure,
  DisclosureLabel,
} from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { client, demo, rpc } from "./client";
import type { Context } from "../main";
const schema = z.array(
  z.object({
    id: z.string(),
    createdAt: z.string().nullable(),
    lastActiveAt: z.string().nullable(),
    device: z.string(),
  }),
);
export function Sessions({ context: c }: { context: Context }) {
  const data = useQuery({
      queryKey: ["own-sessions"],
      queryFn: async () =>
        demo
          ? [
              {
                id: "fictional",
                createdAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString(),
                device: "Fictional browser session",
              },
            ]
          : schema.parse(await rpc("ca_v2_own_sessions")),
    }),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  const [idle, setIdle] = React.useState(() => {
    try {
      return localStorage.getItem("ca-admin-idle-minutes") || "0";
    } catch {
      return "0";
    }
  });
  return (
    <section className="card stack">
      <h2>{t("ui.sessions.devices.7d2f51c4")}</h2>
      <p>{t("refine.sessionsHelp0")}</p>
      <p>{t("refine.sessionsHelp1")}</p>
      {data.isLoading ? (
        <p role="status">{t("ui.loading.your.sessions.d5cf8f9a")}</p>
      ) : data.error ? (
        <p role="alert">
          {t("ui.sessions.could.not.load.apply.the.session..3c2f68dc")}
          <button onClick={() => void data.refetch()}>
            {t("ui.retry.942087cc")}
          </button>
          .
        </p>
      ) : (
        <Disclosure>
          <DisclosureLabel>
            {t("ui.view.9a92a27a")}
            {data.data?.length || 0} {t("ui.sessions.1225ae6c")}
          </DisclosureLabel>
          <div className="list">
            {data.data?.map((s) => (
              <article className="list-row" key={s.id}>
                <div>
                  <strong>{s.device}</strong>
                  <p>
                    {t("ui.last.active.2de5bde8")}
                    {s.lastActiveAt
                      ? new Date(s.lastActiveAt).toLocaleString()
                      : "Not recorded"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Disclosure>
      )}
      <label>
        {t("ui.admin.idle.timeout.on.this.device.076b6711")}
        <LegacySelect
          value={idle}
          onChange={(e) => {
            setIdle(e.target.value);
            try {
              localStorage.setItem("ca-admin-idle-minutes", e.target.value);
              window.dispatchEvent(new Event("ca-idle-preference"));
            } catch {
              setError(
                "This browser could not save the timeout. Keep this device locked when away.",
              );
            }
          }}
        >
          <option value="0">{t("ui.off.ca7981b4")}</option>
          <option value="15">{t("ui.15.minutes.2f18bc2a")}</option>
          <option value="30">{t("ui.30.minutes.f01a042b")}</option>
          <option value="60">{t("ui.1.hour.f8b8883f")}</option>
        </LegacySelect>
      </label>
      <p>{t("refine.signOutHelp0")}</p>
      <p>{t("refine.signOutHelp1")}</p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            if (demo) {
              c.notify("Fictional demo: account sessions would be signed out.");
              return;
            }
            const { error } = await client.auth.signOut({ scope: "global" });
            if (error) throw error;
            c.notify("Account signed out everywhere.");
          } catch (e) {
            setError(
              "Sign-out did not complete. Retry; " + (e as Error).message,
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {t("ui.sign.out.everywhere.af180fca")}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
export function AdminIdleTimeout({
  enabled,
  notify,
}: {
  enabled: boolean;
  notify: (value: string) => void;
}) {
  React.useEffect(() => {
    if (!enabled || demo) return;
    let last = Date.now(),
      busy = false;
    const mark = () => {
        last = Date.now();
      },
      check = async () => {
        let minutes = 0;
        try {
          minutes = Number(localStorage.getItem("ca-admin-idle-minutes") || 0);
        } catch {}
        if (
          ![15, 30, 60].includes(minutes) ||
          Date.now() - last < minutes * 60000 ||
          busy
        )
          return;
        busy = true;
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) {
          busy = false;
          notify("Idle sign-out failed. Lock your device and retry sign-out.");
        } else
          notify("Signed out after inactivity. Sign in again to continue.");
      };
    const resume = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("pointerdown", mark);
    window.addEventListener("keydown", mark);
    window.addEventListener("ca-idle-preference", mark);
    document.addEventListener("visibilitychange", resume);
    const timer = setInterval(() => void check(), 10000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("ca-idle-preference", mark);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [enabled]);
  return null;
}
