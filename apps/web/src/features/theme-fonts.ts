import font0 from "../../../../assets/fonts/noto-sans-latin-wght-normal.woff2?url";
import themes from "../../../../packages/core/theme-fonts.json";
const urls: Record<string, string> = {
  "Noto Sans": font0,
};
export function preloadThemeFonts(theme: string) {
  const selected = themes[theme as keyof typeof themes] || themes.paper;
  for (const link of document.querySelectorAll<HTMLLinkElement>(
    "link[data-theme-font]",
  ))
    if (!selected.includes(link.dataset.themeFont!)) link.remove();
  for (const family of selected) {
    const href = urls[family];
    if (!href || document.querySelector('link[data-theme-font="' + family + '"]'))
      continue;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = href;
    link.dataset.themeFont = family;
    document.head.append(link);
  }
}
