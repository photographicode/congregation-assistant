import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import { existsSync } from "node:fs";
export function luminance(rgb) {
  return rgb
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function ratio(a, b) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function themeIds(css) {
  return [
    ...new Set(
      [...css.matchAll(/\[data-theme="([\w-]+)"\]/g)].map((m) => m[1]),
    ),
  ];
}
export async function checkContrast(css) {
  const browser = await chromium.launch(
    existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
      : {},
  );
  const results = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 360, height: 360 },
      reducedMotion: "reduce",
    });
    await page.setContent(
      "<style>" +
        css +
        '</style><style>body{margin:0;min-height:100vh;background-color:var(--bg);background-image:var(--bg-image)}.sample{position:absolute;inset:0;background:var(--surface);backdrop-filter:blur(var(--glass-blur))}</style><div id="sample"></div>',
    );
    for (const theme of themeIds(css)) {
      await page
        .locator("html")
        .evaluate((el, theme) => el.setAttribute("data-theme", theme), theme);
      const colors = await page.evaluate(() => {
        const names = ["text-1", "text-2", "text-3", "text-on-accent", "link"];
        return Object.fromEntries(
          names.map((name) => {
            const el = document.createElement("i");
            el.style.color = "var(--" + name + ")";
            document.body.append(el);
            const rgb = getComputedStyle(el)
              .color.match(/[\d.]+/g)
              .slice(0, 3)
              .map(Number);
            el.remove();
            return [name, rgb];
          }),
        );
      });
      for (const surface of [
        "surface",
        "surface-solid",
        "surface-2",
        "accent",
      ]) {
        await page.locator("#sample").evaluate((el, surface) => {
          el.replaceChildren();
          if (surface === "bg") {
            el.removeAttribute("class");
            el.style.background = "none";
            return;
          }
          el.className = "sample";
          el.style.background =
            "var(--" + (surface === "surface-2" ? "surface" : surface) + ")";
          if (surface === "surface-2") {
            const child = document.createElement("div");
            child.className = "sample";
            child.style.background = "var(--surface-2)";
            el.append(child);
          }
        }, surface);
        const bitmap = PNG.sync.read(
          await page.screenshot({ animations: "disabled" }),
        );
        for (const tone of ["soft", "standard", "sharp"])
          for (const key of surface === "accent"
            ? ["text-on-accent"]
            : ["text-1", "text-2", "text-3", "link"]) {
            const color =
              colors[
                tone === "sharp" && ["text-2", "text-3"].includes(key)
                  ? "text-1"
                  : key
              ];
            let lowest = Infinity,
              point;
            for (let y = 5; y < 360; y += 10)
              for (let x = 5; x < 360; x += 10) {
                const i = (y * bitmap.width + x) * 4,
                  background = Array.from(bitmap.data.subarray(i, i + 3)),
                  value = ratio(color, background);
                if (value < lowest) {
                  lowest = value;
                  point = { x, y, background };
                }
              }
            const required = key === "text-1" ? 7 : 4.5;
            results.push({
              theme,
              tone,
              surface,
              text: key,
              ratio: Number(lowest.toFixed(3)),
              required,
              passed: lowest >= required,
              point,
            });
          }
      }
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return {
    themes: themeIds(css),
    method:
      "Chromium composites text-bearing panels over all sampled gradient stops (1296 pixels per surface). Raw canvases carry no text; actual rendered text/control checks are recorded separately. Thresholds remain text-1 7:1 and other text 4.5:1.",
    results,
    failures: results.filter((row) => !row.passed),
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const css = process.argv[2]
      ? await readFile(process.argv[2], "utf8")
      : (await readFile("packages/ui/themes.css", "utf8")) +
        "\\n" +
        (await readFile("packages/ui/noir-pop.css", "utf8")),
    report = await checkContrast(css);
  report.oclm = [
    ["crimson", [126, 0, 36], [255, 255, 255]],
    ["slate", [87, 90, 93], [255, 255, 255]],
    ["gold", [190, 137, 0], [31, 22, 0]],
    ["gold-text", [255, 255, 255], [122, 88, 0]],
  ].map(([token, background, foreground]) => ({
    token,
    ratio: ratio(background, foreground),
    passed: ratio(background, foreground) >= 4.5,
  }));
  report.failures.push(...report.oclm.filter((row) => !row.passed));
  await mkdir("docs/qa", { recursive: true });
  await writeFile(
    "docs/qa/contrast-report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        themes: report.themes.length,
        checks: report.results.length,
        failures: report.failures.length,
        firstFailures: report.failures.slice(0, 6),
      },
      null,
      2,
    ),
  );
  if (report.failures.length) process.exitCode = 1;
}
