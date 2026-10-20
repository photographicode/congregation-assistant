import {
  Disclosure,
  DisclosureLabel,
} from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { normalizeTheme } from "../../../../packages/core/themes";
import { rpc, demo } from "./client";
import { useAppearance, hasAppearanceProfile } from "./store";
import { experiencePresets, type Experience } from "./experience";
import type { Context } from "../main";
const style = z.enum(["calm", "balanced", "lively"]);
const preferences = z.object({
  style,
  navigation: z.enum(["classic", "rail", "tabs"]),
  density: z.enum(["comfortable", "compact"]),
  motion: z.enum(["full", "reduced"]),
  colorIntensity: z.enum(["soft", "vivid"]),
  charts: z.boolean(),
  background: z.enum(["static", "ambient", "off"]),
  theme: z.string().max(40).transform(normalizeTheme),
  backgroundIntensity: z.number().int().min(0).max(100).default(100),
  tone: z.enum(["soft", "standard", "sharp"]),
  size: z.enum(["S", "M", "L", "XL"]),
  weight: z.enum(["light", "regular", "bold"]),
  solid: z.boolean(),
  auto: z.boolean(),
  fit: z.enum(["auto", "compact", "comfortable", "large"]),
  clock: z.enum(["locale", "12", "24"]),
});
const schema = z.object({
  preferences: preferences.nullable(),
  revision: z.number().int().nonnegative(),
  adminStyle: style,
  publisherStyle: style,
});
function useProfile(c: Context) {
  return useQuery({
    queryKey: ["experience-profile", c.account, c.cong],
    queryFn: async () =>
      schema.parse(
        demo
          ? {
              preferences: null,
              revision: 0,
              adminStyle: "balanced",
              publisherStyle: "calm",
            }
          : await rpc("ca_v2_get_experience", { p_cong_id: c.cong }),
      ),
    enabled: demo || (!!c.account && !!c.cong),
    retry: false,
  });
}
export function ExperienceDefaults({ context: c }: { context: Context }) {
  const profile = useProfile(c);
  React.useEffect(() => {
    if (demo || !profile.data || hasAppearanceProfile()) return;
    const publisher =
        c.roles.includes("publisher") && !c.roles.includes("admin"),
      preset = profile.data[publisher ? "publisherStyle" : "adminStyle"];
    useAppearance
      .getState()
      .set(
        profile.data.preferences
          ? { ...profile.data.preferences, experienceChosen: true }
          : { ...experiencePresets[preset], experienceChosen: false },
      );
  }, [profile.data, c.cong, c.account]);
  return null;
}
export function ExperienceProfile({ context: c }: { context: Context }) {
  const a = useAppearance(),
    profile = useProfile(c),
    cache = useQueryClient(),
    [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState(""),
    [defaults, setDefaults] = React.useState({
      adminStyle: "balanced",
      publisherStyle: "calm",
    });
  React.useEffect(() => {
    if (profile.data)
      setDefaults({
        adminStyle: profile.data.adminStyle,
        publisherStyle: profile.data.publisherStyle,
      });
  }, [profile.data]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      if (!demo)
        await cache.invalidateQueries({
          queryKey: ["experience-profile", c.account, c.cong],
        });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!demo && !c.cong)
    return <p>{t("ui.choose.a.congregation.to.manage.its.accoun.839b95ae")}</p>;
  return (
    <Disclosure>
      <DisclosureLabel>
        {t("ui.account.profile.congregation.defaults.0bf371bc")}
      </DisclosureLabel>
      <div className="stack">
        {demo && (
          <p className="chip">
            {t("ui.fictional.account.profile.changes.remain.i.cd936cbf")}
          </p>
        )}
        <p>{t("ui.your.device.keeps.its.own.choices.save.an..2ab2031b")}</p>
        {profile.isPending && (
          <p role="status">{t("ui.loading.account.appearance.3192c23c")}</p>
        )}
        {profile.error && (
          <p role="alert">
            {t("ui.account.appearance.could.not.load.device.c.2c92cfab")}
            <button onClick={() => void profile.refetch()}>
              {t("ui.retry.account.profile.86032f8f")}
            </button>
          </p>
        )}
        {profile.data && (
          <>
            <div className="actions">
              <button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const saved = preferences.parse(a);
                    if (demo)
                      cache.setQueryData(
                        ["experience-profile", c.account, c.cong],
                        {
                          ...profile.data!,
                          preferences: saved,
                          revision: profile.data!.revision + 1,
                        },
                      );
                    else
                      await rpc("ca_v2_save_experience", {
                        p_cong_id: c.cong,
                        p_preferences: saved,
                        p_revision: profile.data!.revision,
                      });
                    c.notify(
                      "Account appearance saved. Existing device choices are preserved.",
                    );
                  })
                }
              >
                {t("ui.save.these.choices.to.my.account.5c7ac6f9")}
              </button>
              <button
                disabled={busy || !profile.data.preferences}
                onClick={() => {
                  if (profile.data?.preferences)
                    a.set({
                      ...profile.data.preferences,
                      experienceChosen: true,
                    });
                }}
              >
                {t("ui.use.my.saved.account.profile.2762df04")}
              </button>
              <button
                onClick={() => {
                  const key =
                    c.roles.includes("publisher") && !c.roles.includes("admin")
                      ? "publisherStyle"
                      : "adminStyle";
                  a.set(experiencePresets[profile.data![key]]);
                }}
              >
                {t("ui.use.congregation.default.6f0e2e50")}
              </button>
            </div>
            {c.roles.includes("admin") && (
              <>
                <h3>{t("ui.defaults.for.new.devices.a9af3262")}</h3>
                <div className="form-grid">
                  {(["adminStyle", "publisherStyle"] as const).map((key) => (
                    <label key={key}>
                      {key === "adminStyle"
                        ? "Congregation experience"
                        : "Publisher portal experience"}
                      <LegacySelect
                        value={defaults[key]}
                        onChange={(e) =>
                          setDefaults({ ...defaults, [key]: e.target.value })
                        }
                      >
                        {(["calm", "balanced", "lively"] as const).map(
                          (value) => (
                            <option key={value} value={value}>
                              {value[0].toUpperCase() + value.slice(1)}
                            </option>
                          ),
                        )}
                      </LegacySelect>
                    </label>
                  ))}
                </div>
                <p>
                  {t("ui.defaults.never.remove.tools.or.overwrite.s.3985c07d")}
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      if (demo)
                        cache.setQueryData(
                          ["experience-profile", c.account, c.cong],
                          { ...profile.data!, ...defaults },
                        );
                      else
                        await rpc("ca_v2_set_experience_defaults", {
                          p_cong_id: c.cong,
                          p_admin_style: defaults.adminStyle,
                          p_publisher_style: defaults.publisherStyle,
                        });
                      c.notify("Congregation experience defaults saved.");
                    })
                  }
                >
                  {t("ui.save.congregation.defaults.ee2d5f03")}
                </button>
              </>
            )}
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}{" "}
            <button onClick={() => void profile.refetch()}>
              {t("ui.reload.saved.profile.a187f03a")}
            </button>
          </p>
        )}
      </div>
    </Disclosure>
  );
}
