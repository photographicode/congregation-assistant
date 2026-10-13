// CI-owned browser acceptance. All records fictional and production APIs blocked.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { chromium } = require("playwright"),
  AxeBuilder = require("@axe-core/playwright").default;
const root = path.resolve("dist"),
  output = path.resolve("artifacts/v2");
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const relative = new URL(req.url, "http://localhost").pathname;
  const file = path.resolve(
    root,
    "." + (relative.endsWith("/") ? relative + "index.html" : relative),
  );
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".html": "text/html",
      ".js": "application/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".woff2": "font/woff2",
    }[path.extname(file)] || "application/octet-stream",
  );
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch(),
    base = "http://127.0.0.1:" + server.address().port;
  const results = [];
  try {
    for (const size of [
      { name: "phone", width: 390, height: 844 },
      { name: "desktop", width: 1440, height: 900 },
    ]) {
      const context = await browser.newContext({
        viewport: size,
        serviceWorkers: "block",
      });
      const requests = [];
      await context.route("**/*.supabase.co/**", (route) => {
        requests.push(route.request().url());
        return route.abort();
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => d.accept());
      await page.goto(base + "/v2/?demo=admin");
      await page
        .getByRole("heading", { name: "Good to have you here." })
        .waitFor();
      const nav = (label) =>
        (size.name === "phone"
          ? page.locator(".bottom-tabs")
          : page.locator(".rail")
        )
          .getByRole("button", { name: label, exact: true })
          .click();
      await nav("Schedule");
      try {
        await page
          .getByRole("heading", { name: "Make the week clear.", exact: true })
          .waitFor({ timeout: 5000 });
        await page
          .getByRole("button", { name: "Weekend", exact: true })
          .click();
      } catch (error) {
        console.error(
          "Schedule diagnostics",
          JSON.stringify({
            errors,
            url: page.url(),
            main: await page.locator("#main-content").innerText(),
          }),
        );
        throw error;
      }
      await page.getByLabel("Public talk title").fill("Fictional weekend talk");
      await page.getByLabel("Public talk speaker").fill("Fictional Visitor");
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await page.getByText("Weekend draft saved.", { exact: true }).waitFor();
      await nav("People");
      await page
        .getByRole("button", { name: "Add publisher", exact: true })
        .click();
      await page
        .getByLabel("Full name", { exact: true })
        .fill("Synthetic Household");
      await page
        .getByLabel("Email (for sign-in)", { exact: true })
        .fill("maria@example.com");
      await page
        .getByRole("button", { name: "Yes, share reports", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save publisher & email", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit Synthetic Household", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Add publisher", exact: true })
        .click();
      await page
        .getByLabel("Full name", { exact: true })
        .fill("Never save this");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      await page
        .getByRole("heading", { name: "Discard changes?", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Full name", { exact: true }).inputValue(),
        "Never save this",
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();
      assert.equal(await page.getByRole("dialog").count(), 0);
      await page.waitForFunction(
        () => document.activeElement?.textContent.trim() === "Add publisher",
        null,
        { timeout: 5000 },
      );
      await page
        .getByRole("button", { name: "Import Center", exact: true })
        .click();
      await page
        .getByLabel("Spreadsheet rows")
        .fill(
          "Name,Phone,Email,Group\nSynthetic Import,+919876543215,import@example.com,Group 1",
        );
      await page
        .getByRole("button", { name: "Review rows", exact: true })
        .click();
      await page.getByRole("heading", { name: "Review 1 rows" }).waitFor();
      await page
        .getByRole("button", { name: "Import 1 selected", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Undo import", exact: true })
        .click();
      await nav("Home");
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      assert.deepEqual(
        axe.violations
          .filter((v) => ["serious", "critical"].includes(v.impact))
          .map((v) => v.id),
        [],
      );
      await page.addStyleTag({ content: "html{font-size:200%}" });
      await page.evaluate(() => dispatchEvent(new Event("resize")));
      assert.equal(
        await page.evaluate(() => document.body.scrollWidth > innerWidth),
        false,
        "200% text overflow",
      );
      await page.waitForFunction(() => !document.querySelector(".notice"));
      await page.screenshot({
        path: path.join(output, size.name + "-200-text.png"),
      });
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, [], "Demo contacted production");
      results.push({ profile: size.name, passed: true, axeSerious: 0 });
      await context.close();
    }
    const siteContext = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      serviceWorkers: "block",
    });
    const site = await siteContext.newPage();
    await site.route("**/*.supabase.co/**", (route) => route.abort());
    await site.goto(base + "/site/");
    await site
      .getByRole("heading", { name: "More time for what matters." })
      .waitFor();
    const siteAxe = await new AxeBuilder({ page: site })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    assert.deepEqual(
      siteAxe.violations
        .filter((v) => ["serious", "critical"].includes(v.impact))
        .map((v) => v.id),
      [],
    );
    await site.screenshot({
      path: path.join(output, "website.png"),
      fullPage: true,
    });
    await siteContext.close();
    fs.writeFileSync(
      path.join(output, "results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(
      "PASS V2 demo, household confirmation, dialog dirty guard/focus return, weekend save, import undo, axe and 200% reflow",
    );
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
