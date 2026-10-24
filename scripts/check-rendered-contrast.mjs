import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { PNG } from "pngjs";
import { ratio } from "./contrast-check.mjs";
import assert from "node:assert/strict";
const negativeGradientFixture = process.argv.includes("--negative-gradient-fixture");
const root = path.resolve("dist"),
  server = createServer(async (req, res) => {
    try {
      const u = new URL(req.url, "http://localhost"),
        file = path.resolve(
          root,
          "." +
            (u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname),
        );
      if (!file.startsWith(root + "/")) return res.writeHead(403).end();
      await stat(file);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".wasm": "application/wasm",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port,
  browser = await chromium.launch(
    existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
      : {},
  ),
  views = [],
  failures = [];
try {
  for (const theme of (negativeGradientFixture ? ["mono-light"] : [
    "mono-light",
    "mono-dark",
    "paper",
    "lagoon-glass",
    "neon-night",
    "sunset-pop",
    "neo-brutal",
    "forest",
    "aurora",
  ])) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 1100 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      (theme) =>
        localStorage.setItem(
          "ca-v2-appearance",
          JSON.stringify({
            theme,
            style: "balanced",
            experienceChosen: true,
            backgroundIntensity: 100,
          }),
        ),
      theme,
    );
    await context.route("**/*.supabase.co/**", (r) => r.abort());
    const page = await context.newPage();
    for (const [screen, heading] of (negativeGradientFixture ? [["home", "Monthly submissions"]] : [
      ["home", "Monthly submissions"],
      ["people", "A place for all."],
      ["pdf", "Forms to share"],
      ["schedule", "Midweek assignments"],
    ])) {
      await page.goto(base + "/?demo=admin&screen=" + screen);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (negativeGradientFixture) await page.addStyleTag({content:".greeting-name{background-image:linear-gradient(transparent,transparent)!important}"});
      for (const scroll of (negativeGradientFixture ? [0] : [0, 0.5, 1])) {
        await page.evaluate((scroll) => {
          const node = document.querySelector(".main-content");
          node.scrollTop = (node.scrollHeight - node.clientHeight) * scroll;
        }, scroll);
        const pairs = await page.evaluate(() => {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 1;
          const ctx = canvas.getContext("2d");
          function rgba(color) {
            ctx.clearRect(0, 0, 1, 1);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 1, 1);
            return [...ctx.getImageData(0, 0, 1, 1).data];
          }
          const probe = document.createElement("span");
          probe.style.color = "var(--text-1)";
          document.body.append(probe);
          const primary = rgba(getComputedStyle(probe).color);
          probe.remove();
          const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
            ),
            out = [];
          while (walker.nextNode()) {
            const node = walker.currentNode,
              el = node.parentElement;
            if (
              !el ||
              !node.textContent.trim() ||
              el.closest("script,style,.ui-home-preview,[aria-hidden=true]")
            )
              continue;
            // Disabled controls are unavailable interface components and are exempt
            // from WCAG contrast requirements. Their reduced opacity is intentional.
            if (el.closest(':disabled,[aria-disabled="true"]')) continue;
            const closed = el.closest("details:not([open])");
            if (closed && !closed.querySelector(":scope>summary")?.contains(el))
              continue;
            const style = getComputedStyle(el),
              box = el.getBoundingClientRect();
            if (style.visibility === "hidden" || !box.width || !box.height)
              continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            const fg = rgba(style.color);
            const gradient = fg[3] === 0 && style.backgroundClip.includes("text") && style.backgroundImage !== "none";
            if (gradient) el.setAttribute("data-contrast-gradient-paint", "");
            let opacity = 1;
            for (let parent = el; parent; parent = parent.parentElement)
              opacity *= Number(getComputedStyle(parent).opacity);
            fg[3] *= opacity;
            let panel = false;
            for (
              let parent = el;
              parent && parent !== document.body;
              parent = parent.parentElement
            ) {
              const s = getComputedStyle(parent);
              if (rgba(s.backgroundColor)[3] > 0) {
                panel = true;
                break;
              }
            }
            let top = 0,
              bottom = innerHeight,
              left = 0,
              right = innerWidth;
            for (
              let parent = el.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              const s = getComputedStyle(parent),
                b = parent.getBoundingClientRect();
              if (/auto|scroll|hidden|clip/.test(s.overflowY)) {
                top = Math.max(top, b.top);
                bottom = Math.min(bottom, b.bottom);
              }
              if (/auto|scroll|hidden|clip/.test(s.overflowX)) {
                left = Math.max(left, b.left);
                right = Math.min(right, b.right);
              }
            }
            const rects = [...range.getClientRects()]
              .filter(
                (r) =>
                  r.width > 1 &&
                  r.height > 1 &&
                  r.top >= top &&
                  r.bottom <= bottom &&
                  r.left >= left &&
                  r.right <= right,
              )
              .map((r) => ({
                x: r.x + scrollX,
                y: r.y + scrollY,
                width: r.width,
                height: r.height,
                fractions: (gradient ? Array.from({length:21},(_,index)=>(index+.5)/21) : [0.2, 0.5, 0.8]).filter((f) => {
                  const hit = document.elementFromPoint(
                    r.x + r.width * f,
                    r.y + r.height / 2,
                  );
                  return hit && (el.contains(hit) || hit.contains(el));
                }),
              }))
              .filter((r) => r.fractions.length);
            if (!rects.length) continue;
            out.push({
              text: node.textContent.trim().slice(0, 72),
              selector:
                el.tagName.toLowerCase() +
                (el.className && typeof el.className === "string"
                  ? "." + el.className.split(" ").filter(Boolean).join(".")
                  : ""),
              foreground: fg,
              gradient,
              required:
                !el.closest("button.primary,.oclm-section,.oclm-week") &&
                fg.slice(0, 3).every((n, i) => n === primary[i])
                  ? 7
                  : 4.5,
              panel,
              rects,
            });
          }
          return out;
        });
        let gradientPaint;
        if (pairs.some(pair=>pair.gradient)) {
          const paintMask = await page.addStyleTag({content:'[data-contrast-gradient-paint]{background-clip:border-box!important;-webkit-background-clip:border-box!important}'});
          gradientPaint = PNG.sync.read(await page.screenshot({fullPage:true,animations:"disabled"}));
          await paintMask.evaluate(el=>el.remove());
        }
        const mask = await page.addStyleTag({
          content:
            "*{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important}svg text{fill:transparent!important}[data-contrast-gradient-paint]{background-image:none!important}",
        });
        const bitmap = PNG.sync.read(
          await page.screenshot({ fullPage: true, animations: "disabled" }),
        );
        await mask.evaluate((el) => el.remove());
        await page.locator("[data-contrast-gradient-paint]").evaluateAll(elements=>elements.forEach(el=>el.removeAttribute("data-contrast-gradient-paint")));
        const results = [];
        for (const pair of pairs) {
          let min = Infinity,
            point;
          for (const rect of pair.rects) {
            const y = Math.max(
              0,
              Math.min(bitmap.height - 1, Math.floor(rect.y + rect.height / 2)),
            );
            for (const f of rect.fractions) {
              const x = Math.floor(rect.x + rect.width * f);
              if (x < 0 || x >= bitmap.width) continue;
              const i = (y * bitmap.width + x) * 4,
                bg = [...bitmap.data.subarray(i, i + 3)],
                alpha = pair.foreground[3] / 255,
                fg = pair.gradient
                  ? [...gradientPaint.data.subarray(i,i+3)]
                  : pair.foreground.slice(0,3).map((n,index)=>Math.round(n*alpha+bg[index]*(1-alpha))),
                value = ratio(fg, bg);
              if (value < min) {
                min = value;
                point = { x, y, foreground:fg, background: bg };
              }
            }
          }
          const row = {
            ...pair,
            rects: undefined,
            ratio: Number(min.toFixed(3)),
            point,
            passed: min >= pair.required,
          };
          results.push(row);
          if (!row.passed || !row.panel)
            failures.push({
              theme,
              screen,
              scroll,
              ...row,
              reason: !row.panel
                ? "Text on a bare canvas"
                : "Contrast below required threshold",
            });
        }
        views.push({
          theme,
          screen,
          scroll,
          pairs: results.length,
          minimum: Math.min(...results.map((r) => r.ratio)),
          bareCanvasText: results.filter((r) => !r.panel).length,
          failures: results.filter((r) => !r.passed || !r.panel),
        });
      }
    }
    await context.close();
    console.log("Rendered pairs checked:", theme);
  }
} finally {
  await browser.close();
  server.close();
}
await mkdir(negativeGradientFixture ? "work/quality" : "docs/qa", { recursive: true });
await writeFile(
  negativeGradientFixture ? "work/quality/contrast-gradient-negative.json" : "docs/qa/contrast-rendered.json",
  JSON.stringify(
    {
      method:
        "Actual visible, unoccluded rendered text colors and background pixels with text paint suppressed; gradient text foreground sampled from browser-rendered unclipped paint and suppressed separately from the panel background, full-intensity backgrounds, panel-ancestor requirement. Synthetic panel gate separately composites every gradient stop. Text-1 >=7, all other text >=4.5.",
      views,
      failures,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      views: views.length,
      pairs: views.reduce((sum, v) => sum + v.pairs, 0),
      failures: failures.length,
      first: failures.slice(0, 5),
    },
    null,
    2,
  ),
);
if (negativeGradientFixture) {
  assert(failures.some(row=>row.gradient && row.ratio===1),"An invisible gradient must fail the unchanged contrast threshold");
  console.log("PASS invisible-gradient negative control is rejected");
} else if (failures.length) process.exitCode = 1;
