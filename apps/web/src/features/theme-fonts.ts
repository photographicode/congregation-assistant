import font0 from "../../../../assets/fonts/instrument-serif-latin-400-normal.woff2?url";
import font1 from "../../../../assets/fonts/inter-latin-wght-normal.woff2?url";
import font2 from "../../../../assets/fonts/jetbrains-mono-latin-wght-normal.woff2?url";
import font3 from "../../../../assets/fonts/newsreader-latin-wght-normal.woff2?url";
import font4 from "../../../../assets/fonts/source-sans-3-latin-wght-normal.woff2?url";
import font5 from "../../../../assets/fonts/fraunces-latin-wght-normal.woff2?url";
import themes from "../../../../packages/core/theme-fonts.json";
const urls: Record<string, string> = {
  "Instrument Serif": font0,
  Inter: font1,
  "JetBrains Mono": font2,
  Newsreader: font3,
  "Source Sans 3": font4,
  Fraunces: font5,
};
export function preloadThemeFonts(theme: string) {
  const selected = themes[theme as keyof typeof themes] || themes.paper;
  for (const link of document.querySelectorAll<HTMLLinkElement>(
    "link[data-theme-font]",
  ))
    if (!selected.includes(link.dataset.themeFont!)) link.remove();
  for (const family of selected) {
    if (document.querySelector('link[data-theme-font="' + family + '"]'))
      continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = urls[family];
    link.dataset.themeFont = family;
    document.head.append(link);
  }
}
