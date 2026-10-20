import { preloadThemeFonts } from "./theme-fonts";
import { resolvedTheme } from "../../../../packages/core/themes";
export function adapt(preferences: {
  theme: string;
  tone: string;
  size: string;
  weight: string;
  solid: boolean;
  auto: boolean;
  fit?: string;
  style?: string;
  motion?: string;
  colorIntensity?: string;
  background?: string;
  density?: string;
  navigation?: string;
  backgroundIntensity?: number;
}) {
  const root = document.documentElement;
  let frame = 0;
  const measureChrome = () => {
    for (const [selector, property] of [
      [".bottom-tabs", "--nav-h"],
      [".topbar", "--header-h"],
    ]) {
      const element = document.querySelector(selector),
        value =
          element && getComputedStyle(element).display !== "none"
            ? element.getBoundingClientRect().height + "px"
            : "0px";
      if (root.style.getPropertyValue(property) !== value)
        root.style.setProperty(property, value);
    }
  };
  const update = () => {
    const media = (q: string) => matchMedia(q).matches;
    const width = window.innerWidth,
      height = window.visualViewport?.height || window.innerHeight;
    const scale = parseFloat(getComputedStyle(root).fontSize) / 16;
    const keyboard = Boolean(
      window.visualViewport &&
      window.innerHeight - height > 150 &&
      /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || ""),
    );
    root.dataset.hidden = String(document.hidden);
    root.dataset.lowPower = String(
      (navigator.hardwareConcurrency || 4) <= 2 ||
        Boolean(
          (navigator as Navigator & { connection?: { saveData?: boolean } })
            .connection?.saveData,
        ),
    );
    root.dataset.experience = preferences.style || "balanced";
    root.dataset.motion = media("(prefers-reduced-motion: reduce)")
      ? "reduced"
      : preferences.motion || "reduced";
    root.dataset.colorIntensity = preferences.colorIntensity || "soft";
    root.dataset.background = preferences.background || "static";
    root.dataset.navigation = preferences.navigation || "classic";
    root.removeAttribute("data-ca-theme");
    root.dataset.theme = resolvedTheme(
      preferences.theme,
      media("(prefers-color-scheme: dark)"),
    );
    preloadThemeFonts(root.dataset.theme);
    root.style.setProperty(
      "--background-intensity",
      String(
        Math.max(0, Math.min(100, preferences.backgroundIntensity ?? 100)) /
          100,
      ),
    );
    root.dataset.tone = preferences.tone;
    root.dataset.highContrast = String(
      media("(prefers-contrast: more)") || media("(forced-colors: active)"),
    );
    root.dataset.solid = String(
      preferences.solid ||
        media("(prefers-reduced-transparency: reduce)") ||
        root.dataset.lowPower === "true",
    );
    root.dataset.coarse = String(media("(pointer: coarse)"));
    root.dataset.hover = String(media("(hover: hover)"));
    root.dataset.reducedMotion = String(
      media("(prefers-reduced-motion: reduce)"),
    );
    root.dataset.textSize = preferences.size;
    root.dataset.iconWeight = preferences.weight;
    root.dataset.largeText = String(
      scale >= 1.3 || ["L", "XL"].includes(preferences.size),
    );
    root.dataset.textBucket = scale >= 2 ? "200" : scale >= 1.3 ? "130" : "100";
    root.dataset.sizeClass =
      width < 360
        ? "xs"
        : width < 480
          ? "sm"
          : width < 768
            ? "md"
            : width < 1024
              ? "lg"
              : "xl";
    root.dataset.short = String(height < 500 && !keyboard);
    root.dataset.orientation = width > height ? "landscape" : "portrait";
    root.dataset.standalone = String(media("(display-mode: standalone)"));
    root.dataset.density =
      preferences.fit === "auto" || !preferences.fit
        ? scale >= 1.3
          ? "spacious"
          : preferences.density || (width < 360 ? "compact" : "comfortable")
        : preferences.fit === "large"
          ? "spacious"
          : preferences.fit;
    root.dataset.keyboardOpen = String(keyboard);
    root.style.setProperty("--visible-h", height + "px");
    root.style.setProperty("--viewport-w", width + "px");
    if (keyboard)
      document.activeElement?.scrollIntoView({
        block: "nearest",
        behavior: "instant",
      });
    measureChrome();
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        getComputedStyle(root).getPropertyValue("--bg").trim(),
      );
    if (
      import.meta.env.DEV &&
      new URLSearchParams(location.search).get("layout") === "debug"
    ) {
      let overlay = document.getElementById("layout-debug");
      if (!overlay) {
        overlay = document.createElement("output");
        overlay.id = "layout-debug";
        overlay.className = "layout-debug";
        document.body.append(overlay);
      }
      overlay.textContent = `${root.dataset.sizeClass} · ${root.dataset.density} · ${width}×${Math.round(height)} · text ${Math.round(scale * 100)}% · keyboard ${keyboard}`;
    }
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  };
  const queries = [
    "(prefers-color-scheme: dark)",
    "(prefers-contrast: more)",
    "(forced-colors: active)",
    "(prefers-reduced-transparency: reduce)",
    "(prefers-reduced-motion: reduce)",
    "(pointer: coarse)",
    "(hover: hover)",
    "(display-mode: standalone)",
  ].map((q) => matchMedia(q));
  queries.forEach((q) => q.addEventListener("change", schedule));
  for (const event of ["resize", "orientationchange", "pageshow", "focus"])
    window.addEventListener(event, schedule);
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("focusin", schedule);
  document.addEventListener("focusout", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  const fontProbe = document.createElement("span");
  fontProbe.setAttribute("aria-hidden", "true");
  fontProbe.style.cssText =
    "position:fixed;inset:0 auto auto 0;width:1rem;height:1rem;visibility:hidden;pointer-events:none";
  document.body.append(fontProbe);
  const observer = new ResizeObserver(() => {
    measureChrome();
    schedule();
  });
  observer.observe(root);
  observer.observe(fontProbe);
  let bar: Element | null = null,
    header: Element | null = null;
  const watchChrome = () => {
    const nextBar = document.querySelector(".bottom-tabs"),
      nextHeader = document.querySelector(".topbar");
    if (nextBar !== bar) {
      if (bar) observer.unobserve(bar);
      bar = nextBar;
      if (bar) observer.observe(bar);
    }
    if (nextHeader !== header) {
      if (header) observer.unobserve(header);
      header = nextHeader;
      if (header) observer.observe(header);
    }
  };
  const mutation = new MutationObserver((records) => {
    if (
      records.some((record) =>
        [...record.addedNodes, ...record.removedNodes].some(
          (node) => node instanceof Element,
        ),
      )
    ) {
      watchChrome();
      schedule();
    }
  });
  mutation.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
  });
  watchChrome();
  update();
  schedule();
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    mutation.disconnect();
    fontProbe.remove();
    queries.forEach((q) => q.removeEventListener("change", schedule));
    for (const event of ["resize", "orientationchange", "pageshow", "focus"])
      window.removeEventListener(event, schedule);
    document.removeEventListener("visibilitychange", schedule);
    document.removeEventListener("focusin", schedule);
    document.removeEventListener("focusout", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    document.getElementById("layout-debug")?.remove();
  };
}
