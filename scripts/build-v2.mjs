import { build } from "vite";
import { cp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import path from "node:path";
const root = process.cwd();
const fingerprint = createHash("sha256");
async function sourceFiles(dir) {
  const items = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) items.push(...(await sourceFiles(file)));
    else items.push(file);
  }
  return items.sort();
}
for (const file of [
  "public-config.json",
  "capabilities.json",
  "package-lock.json",
  ...(await sourceFiles("apps/web/src")),
  ...(await sourceFiles("packages/ui")),
  ...(await sourceFiles("apps/site")),
])
  fingerprint.update(file).update(await readFile(file));
const hash = fingerprint.digest("hex");
process.env.VITE_BUILD_HASH = hash;
await build({ configFile: path.join(root, "apps/web/vite.config.ts") });
await mkdir("dist", { recursive: true });
for (const file of await readdir(root))
  if (
    /^(app.*\.(js|css)|index\.html|weekend\.html|weekend-public\.js|public-links\.js|pdf-tools\.js|offline\.html|robots\.txt|manifest\.webmanifest)$/.test(
      file,
    )
  )
    await cp(file, "dist/" + file);
await cp("assets", "dist/assets", { recursive: true });
for(const file of await readdir('dist/v2/assets'))if(/^NotoSans-.*\.woff2$/.test(file))await rm('dist/v2/assets/'+file);
await cp("public-site-preview", "dist/public-site-preview", {
  recursive: true,
  filter: (src) => !src.includes("/scripts/"),
});
await writeFile(
  "dist/service-worker.js",
  (await readFile("service-worker.js", "utf8")).replace(
    /const CACHE='[^']+'/,
    "const CACHE='ca-shell-" + hash.slice(0, 16) + "'",
  ),
);
await mkdir("dist/assets/fonts", { recursive: true });
for (const name of ["NotoSans-Regular.woff2", "NotoSans-Bold.woff2"])
  await cp("assets/fonts/" + name, "dist/assets/fonts/" + name);
await mkdir("dist/site", { recursive: true });
await cp("apps/site", "dist/site", { recursive: true });
await cp("capabilities.json", "dist/capabilities.json");
await cp("public-config.json", "dist/public-config.json");
await cp("public-config.json", "dist/site/public-config.json");
await mkdir("dist/.well-known", { recursive: true });
await writeFile("dist/.well-known/build-hash.txt", hash + "\n");
await writeFile(
  "dist/site/tokens.css",
  (await readFile("packages/ui/tokens.css", "utf8")).replaceAll(
    "../../assets/",
    "../assets/",
  ),
);
let total = 0;
for (const file of await readdir("dist/v2/assets"))
  if (file.endsWith(".js") && !file.includes("crypto"))
    total += gzipSync(await readFile("dist/v2/assets/" + file)).length;
if (total > 250 * 1024)
  throw Error("Initial V2 JS exceeds 250 KiB gzip: " + total);
await writeFile(
  "dist/v2/build-report.json",
  JSON.stringify({ hash, jsGzipBytes: total, limit: 250 * 1024 }, null, 2),
);
console.log(
  "V2 build:",
  hash.slice(0, 12),
  "JS gzip upper bound:",
  total,
  "bytes",
);
