import {
  Disclosure,
  DisclosureLabel, Button } from "../../../../packages/ui/components";
import React from "react";
import { useAppearance } from "./store";
import { themeIds } from "../../../../packages/core/themes";
import { t } from "../../../../packages/core/i18n";
const themes = themeIds.map((id) => [id, t(`theme.${id}`)] as const);
export function ThemeGallery() {
  const a = useAppearance();
  return (
    <Disclosure className="theme-gallery">
      <DisclosureLabel>{t("theme.gallery")}</DisclosureLabel>
      <div className="actions">
        <Button
          onClick={() => {
            const choice = new Uint32Array(1);
            crypto.getRandomValues(choice);
            const index = choice.at(0) ?? 0;
            const theme = themeIds[index % themeIds.length];
            if (theme) a.set({ theme });
          }} type="button"
        >
          {t("theme.surprise")}
        </Button>
      </div>
      <div className="experience-cards">
        {themes.map(([id, label]) => (
          <Button
            key={id}
            className="theme-option"
            aria-pressed={a.theme === id}
            onClick={() => a.set({ theme: id })} type="button"
          >
            <span className="theme-preview" data-theme={id}>
              <span className="theme-preview-surface">
                <strong>{t("ui.aa.81acaafb")}</strong>
                <span>{t("theme.preview")}</span>
                <span className="theme-preview-accent">
                  {t("theme.accent")}
                </span>
              </span>
            </span>
            <strong>{label}</strong>
          </Button>
        ))}
      </div>
      <p>{t("theme.hint")}</p>
    </Disclosure>
  );
}
