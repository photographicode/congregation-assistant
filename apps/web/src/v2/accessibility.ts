export function adapt(preferences: {
  theme: string;
  tone: string;
  size: string;
  weight: string;
  solid: boolean;
  auto: boolean;
}) {
  const root = document.documentElement;
  const update = () => {
    const media = (q: string) => matchMedia(q).matches;
    root.dataset.caTheme =
      preferences.theme === "auto"
        ? media("(prefers-color-scheme: dark)")
          ? "slate"
          : "paper"
        : preferences.theme;
    root.dataset.tone = preferences.tone;
    root.dataset.highContrast = String(
      preferences.auto &&
        (media("(prefers-contrast: more)") || media("(forced-colors: active)")),
    );
    root.dataset.solid = String(
      preferences.solid ||
        (preferences.auto && media("(prefers-reduced-transparency: reduce)")),
    );
    root.dataset.coarse = String(media("(pointer: coarse)"));
    root.dataset.reducedMotion = String(
      media("(prefers-reduced-motion: reduce)"),
    );
    root.dataset.textSize = preferences.size;
    root.dataset.iconWeight = preferences.weight;
    const systemScale = parseFloat(getComputedStyle(root).fontSize) / 16;
    root.dataset.largeText = String(
      systemScale >= 1.3 || ["L", "XL"].includes(preferences.size),
    );
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--bg").trim(),
      );
  };
  const queries = [
    "(prefers-color-scheme: dark)",
    "(prefers-contrast: more)",
    "(forced-colors: active)",
    "(prefers-reduced-transparency: reduce)",
    "(prefers-reduced-motion: reduce)",
    "(pointer: coarse)",
  ].map((q) => matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", update));
  window.addEventListener("resize", update);
  document.addEventListener("visibilitychange", update);
  update();
  return () => {
    queries.forEach((q) => q.removeEventListener("change", update));
    window.removeEventListener("resize", update);
    document.removeEventListener("visibilitychange", update);
  };
}
