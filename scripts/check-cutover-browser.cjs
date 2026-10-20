const { chromium } = require("playwright"),
  http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { transformSync } = require("esbuild");
const AxeBuilder = require("@axe-core/playwright").default;
const root = path.resolve("dist"),
  output = path.resolve(process.env.CA_LAYOUT_OUTPUT || "work/cutover-browser");
fs.mkdirSync(output, { recursive: true });
const detector = transformSync(
  fs.readFileSync("scripts/layout-detector.ts", "utf8"),
  { loader: "ts", format: "iife", globalName: "LayoutDoctor" },
).code;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/old-shell.html") {
    res.setHeader("Content-Type", "text/html");
    res.end(
      "<!doctype html><title>Migration fixture</title><h1>Old shell fixture</h1>",
    );
    return;
  }
  if (url.pathname === "/old-worker.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(
      "self.addEventListener('install',e=>e.waitUntil(caches.open('ca-shell-old-v1').then(c=>c.put('/',new Response('Old shell fixture'))).then(()=>self.skipWaiting())));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));",
    );
    return;
  }
  let file = path.resolve(
    root,
    "." +
      (url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname),
  );
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile())
    file = path.join(root, "404.html");
  res.setHeader(
    "Content-Type",
    {
      ".html": "text/html",
      ".wasm": "application/wasm",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".woff2": "font/woff2",
      ".png": "image/png",
      ".webmanifest": "application/manifest+json",
    }[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch(
    fs.existsSync("/usr/bin/chromium")
      ? { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }
      : {},
  );
  const base = "http://127.0.0.1:" + server.address().port;
  const results = [],
    failures = [];
  try {
    const full = process.env.CA_LAYOUT_FULL === "1";
    const sizes = process.env.CA_LAYOUT_SIZES
      ? process.env.CA_LAYOUT_SIZES.split(",").map((v) =>
          v.split("x").map(Number),
        )
      : full
        ? [
            [280, 653],
            [360, 740],
            [375, 667],
            [430, 932],
            [412, 915],
            [768, 1024],
            [667, 375],
            [915, 412],
          ]
          : [
              [320, 653],
            [375, 667],
            [768, 1024],
          ];
    for (const [width, height] of sizes)
      for (const scale of full ? [1, 1.3, 2] : [1, 2])
        for (const theme of full
          ? ["paper", "slate", "glass-lagoon", "glass-aurora"]
          : ["paper"]) {
          const context = await browser.newContext({
            viewport: { width, height },
            serviceWorkers: "allow",
          });
          const page = await context.newPage(),
            errors = [],
            requests = [];
          page.on("pageerror", (e) => errors.push(e.message));
          page.on("console", (m) => {
            if (["error", "warning"].includes(m.type())) errors.push(m.text());
          });
          await context.route("**/*.supabase.co/**", (route) => {
            requests.push(route.request().url());
            return route.abort();
          });
          await page.goto(base + "/?demo=admin");
          await page
            .locator(".dashboard > .dashboard-hero > .greeting h1")
            .waitFor();
          await page.evaluate(
            ({ scale, theme }) => {
              document.documentElement.style.fontSize = scale * 100 + "%";
              const data = JSON.parse(
                localStorage.getItem("ca-v2-appearance") || "{}",
              );
              data.theme = theme;
              localStorage.setItem("ca-v2-appearance", JSON.stringify(data));
            },
            { scale, theme },
          );
          if (theme !== "paper") {
            await page.reload();
            await page.evaluate(
              (scale) =>
                (document.documentElement.style.fontSize = scale * 100 + "%"),
              scale,
            );
          }
          await page
            .locator(".dashboard > .dashboard-hero > .greeting h1")
            .waitFor();
          const nav = async (label) => {
            const routes={"Schedule":"schedule","People":"people","Reports":"reports","Messages":"messages","Access & Links":"access","Print & PDF":"pdf","Settings":"settings"};
            if(routes[label]){await page.goto(base+"/?demo=admin&screen="+routes[label]);return;}
            const navigationLabel=label==="Schedule"?"Meetings":label;
            const phone = await page.locator(".bottom-tabs").isVisible();
            const host = page.locator(phone ? ".bottom-tabs" : ".rail");
            const direct=host.getByRole("button",{name:navigationLabel,exact:true});
            if (phone && (await direct.count())===0) {
              await host
                .getByRole("button", { name: "More", exact: true })
                .click();
              await page
                .getByRole("dialog")
                .getByRole("button", { name: navigationLabel, exact: true })
                .click();
            } else await direct.click();
          };
          console.log("Layout", width, height, scale, theme);
          for (const screen of [
            "Home",
            "Schedule",
            "People",
            "Reports",
            "Messages",
            "Access & Links",
            "Print & PDF",
            "Settings",
          ]) {
            if (screen !== "Home") await nav(screen);
            await page.locator("h1").first().waitFor();
            await page.waitForTimeout(80);
            let issues = await page.evaluate(
              detector + "\n;LayoutDoctor.inspectLayout()",
            );
            if (screen === "People") {
              await page
                .getByRole("button", { name: /Add publisher/ })
                .click();
              await page.getByRole("dialog").waitFor();
              await page.getByRole("dialog").getByLabel("Full name").focus();
              await page.waitForTimeout(80);
              issues.push(
                ...(
                  await page.evaluate(
                    detector + "\n;LayoutDoctor.inspectLayout()",
                  )
                ).map((i) => "Dialog: " + i),
              );
              await page.keyboard.press("Escape");
              await page.getByRole("dialog").waitFor({ state: "detached" });
              assert.equal(await page.getByRole("dialog").count(), 0);
            }
            if (screen === "Print & PDF") {
              await page
                .getByText("Choose publishers", { exact: false })
                .click();
              issues.push(
                ...(
                  await page.evaluate(
                    detector + "\n;LayoutDoctor.inspectLayout()",
                  )
                ).map((i) => "Publisher selection: " + i),
              );
            }
            if (screen === "Reports") {
              await page
                .getByRole("button", { name: "Enter report", exact: true })
                .click();
              await page.getByLabel("Bible studies", { exact: true }).fill("2");
              await page
                .getByRole("button", { name: /(?:Save|Submit) report/ })
                .click();
              await page.getByText("Report saved.", { exact: true }).waitFor();
            }
            if (screen === "Settings") {
              await page
                .getByRole("button", { name: "Open setup guide", exact: true })
                .click();
              await page
                .getByRole("dialog")
                .getByRole("button", { name: "Close", exact: true })
                .focus();
              await page.waitForTimeout(80);
              issues.push(
                ...(
                  await page.evaluate(
                    detector + "\n;LayoutDoctor.inspectLayout()",
                  )
                ).map((i) => "Setup: " + i),
              );
              await page.keyboard.press("Escape");
              await page.getByRole("dialog").waitFor({ state: "detached" });
            }
            if (
              width === 375 &&
              scale === 1 &&
              ["Home", "Schedule", "Reports", "Settings"].includes(screen)
            )
              await page.screenshot({
                path: path.join(output, screen.toLowerCase() + ".png"),
                fullPage: false,
              });
            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            const violations = axe.violations.map(
              (v) => v.id + ": " + v.nodes.length + " nodes",
            );
            const row = {
              width,
              height,
              scale,
              theme,
              screen,
              issues: [...new Set(issues)],
              axe: violations,
            };
            results.push(row);
            fs.writeFileSync(
              path.join(output, "results.json"),
              JSON.stringify({ complete: false, results, failures }, null, 2),
            );
            if (issues.length || violations.length) failures.push(row);
          }
          if (errors.length || requests.length)
            failures.push({ width, scale, errors, backendRequests: requests });
          await context.close();
        }
    const publisher = await browser.newPage({
      viewport: { width: 375, height: 667 },
    });
    await publisher.goto(base + "/?demo=publisher");
    await publisher
      .getByRole("heading", { name: "My service report", exact: true })
      .waitFor();
    await publisher
      .locator(".bottom-tabs")
      .getByRole("button", { name: "Reports", exact: true })
      .click();
    await publisher.getByText("Household reports", { exact: true }).waitFor();
    await publisher.close();
    const expiredContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
      }),
      expired = await expiredContext.newPage(),
      expiredRequests = [];
    await expiredContext.route("**/*.supabase.co/**", (r) => {
      expiredRequests.push(r.request().url());
      return r.abort();
    });
    await expired.goto(base + "/?demo=expired&code=fictional");
    await expired
      .getByRole("heading", { name: "Your workspace is paused.", exact: true })
      .waitFor();
    assert.equal(await expired.locator(".greeting").count(), 0);
    const [exported] = await Promise.all([
      expired.waitForEvent("download"),
      expired
        .getByRole("button", { name: "Download records archive", exact: true })
        .click(),
    ]);
    assert(fs.statSync(await exported.path()).size > 100);
    assert.equal(expiredRequests.length, 0);
    await expiredContext.close();
    const redirect = await browser.newPage();
    await redirect.goto(base + "/v2/?demo=admin");
    await redirect.locator(".greeting h1").waitFor();
    assert.equal(new URL(redirect.url()).pathname, "/");
    await redirect.goto(base + "/site/");
    await redirect.locator(".tour-controls").waitFor();
    await redirect.getByRole("button", { name: "Pause guided tour" }).click();
    await redirect.screenshot({
      path: path.join(output, "website.png"),
      fullPage: false,
    });
    await redirect.close();
    const migration = await browser.newPage();
    await migration.goto(base + "/old-shell.html");
    await migration.evaluate(async () => {
      await navigator.serviceWorker.register("/old-worker.js", { scope: "/" });
      await navigator.serviceWorker.ready;
    });
    await migration.reload();
    assert.equal(
      await migration.evaluate(async () =>
        (await caches.keys()).includes("ca-shell-old-v1"),
      ),
      true,
    );
    await migration.goto(base + "/?demo=admin");
    await migration.getByText("Update available", { exact: true }).waitFor();
    await migration
      .getByRole("button", { name: "Reload app", exact: true })
      .click();
    await migration.waitForLoadState("networkidle");
    await migration.locator(".greeting h1").waitFor();
    assert.equal(
      await migration.evaluate(async () =>
        (await caches.keys()).includes("ca-shell-old-v1"),
      ),
      false,
    );
    assert(
      !(await migration.locator("body").innerText()).includes(
        "Old shell fixture",
      ),
    );
    await migration.close();
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify({ complete: true, results, failures }, null, 2),
    );
    console.log(
      JSON.stringify(
        { screens: results.length, failures: failures.length, output },
        null,
        2,
      ),
    );
    if (failures.length) {
      console.log(JSON.stringify(failures.slice(0, 12), null, 2));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
