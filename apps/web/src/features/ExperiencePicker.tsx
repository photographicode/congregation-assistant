import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import { LegacySelect } from "../../../../packages/ui/components";
import { t } from "../../../../packages/core/i18n";
import React from "react";
import { HomePreview } from "../../../../packages/ui/HomePreview";
import { useAppearance } from "./store";
import { experiencePresets, type Experience } from "./experience";
export function ExperiencePicker() {
  const a = useAppearance();
  return (
    <section
      className="stack experience-picker"
      aria-label={t("ui.experience.8eab0f09")}
    >
      <div>
        <span className="eyebrow">
          {t("ui.make.yourself.at.home.a0548a89")}
        </span>
        <h2>{t("ui.choose.your.experience.b5fcd365")}</h2>
        <p>{t("ui.the.same.tools.presented.your.way.you.can..857f2e66")}</p>
      </div>
      <div className="experience-cards">
        {(["calm", "balanced", "lively"] as const).map((style) => (
          <article key={style} className={"experience-option " + style}>
            <HomePreview style={style} />
            <Button
              aria-pressed={a.style === style && a.experienceChosen}
              onClick={() =>
                a.set({
                  ...experiencePresets[style],
                  ...(style === "lively" && a.theme === "auto"
                    ? { theme: "lagoon-glass" }
                    : {}),
                })
              } type="button"
            >
              <strong>{style[0].toUpperCase() + style.slice(1)}</strong>
              <span>
                {style === "calm"
                  ? "Room to focus. Bigger actions and a quiet Home."
                  : style === "balanced"
                    ? "A useful overview. Clear numbers and gentle accents."
                    : "A richer dashboard. Color, charts and a little motion."}
              </span>
            </Button>
          </article>
        ))}
      </div>
      <Disclosure>
        <DisclosureLabel>
          {t("ui.customize.your.experience.d77df982")}
        </DisclosureLabel>
        <div className="form-grid">
          <label>
            {t("ui.navigation.3db65f8c")}
            <LegacySelect
              value={a.navigation}
              onChange={(e) =>
                a.set({
                  navigation: e.target.value as Experience["navigation"],
                })
              } aria-label={t("ui.navigation.3db65f8c")}
            >
              <option value="classic">
                {t("ui.classic.sidebar.aa73889e")}
              </option>
              <option value="rail">{t("ui.compact.rail.5f42bf75")}</option>
              <option value="tabs">{t("ui.bottom.tabs.0a0c9af3")}</option>
            </LegacySelect>
          </label>
          <label>
            {t("ui.density.77a283d6")}
            <LegacySelect
              value={a.density}
              onChange={(e) =>
                a.set({ density: e.target.value as Experience["density"] })
              } aria-label={t("ui.density.77a283d6")}
            >
              <option value="comfortable">
                {t("ui.comfortable.459a23a5")}
              </option>
              <option value="compact">{t("ui.compact.99452646")}</option>
            </LegacySelect>
          </label>
          <label>
            {t("ui.motion.8ca34424")}
            <LegacySelect
              value={a.motion}
              onChange={(e) =>
                a.set({ motion: e.target.value as Experience["motion"] })
              } aria-label={t("ui.motion.8ca34424")}
            >
              <option value="full">{t("ui.full.008dacb6")}</option>
              <option value="reduced">{t("ui.reduced.9f96285d")}</option>
            </LegacySelect>
          </label>
          <label>
            {t("ui.color.intensity.ad9bc8bf")}
            <LegacySelect
              value={a.colorIntensity}
              onChange={(e) =>
                a.set({
                  colorIntensity: e.target
                    .value as Experience["colorIntensity"],
                })
              } aria-label={t("ui.color.intensity.ad9bc8bf")}
            >
              <option value="soft">{t("ui.soft.5964d467")}</option>
              <option value="vivid">{t("ui.vivid.acbbdc93")}</option>
            </LegacySelect>
          </label>
          <label>
            {t("ui.background.ea2b8a87")}
            <LegacySelect
              value={a.background}
              onChange={(e) =>
                a.set({
                  background: e.target.value as Experience["background"],
                })
              } aria-label={t("ui.background.ea2b8a87")}
            >
              <option value="static">{t("ui.static.1d2c73dc")}</option>
              <option value="ambient">
                {t("ui.ambient.gradient.ff1fac81")}
              </option>
              <option value="off">{t("ui.off.ca7981b4")}</option>
            </LegacySelect>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={a.charts}
              onChange={(e) => a.set({ charts: e.target.checked })}
            />
            {t("ui.show.charts.dd2dbb5f")}
          </label>
        </div>
        <p>{t("ui.system.reduced.motion.and.contrast.setting.94c40be6")}</p>
      </Disclosure>
    </section>
  );
}
