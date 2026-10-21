import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const roots = ["apps/web/src", "packages/ui"];
const extensions = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);
const files = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extensions.has(extname(path))) files.push(path);
  }
}
for (const root of roots) await walk(root);

const rules = [
  ["outline-removal", /outline\s*:\s*(?:none|0)(?:\s*!important)?\s*;/gi, true],
  ["transition-all", /transition(?:-property)?\s*:\s*all\b/gi, true],
  ["native-details", /<(?:details|summary)\b/gi, true],
  ["native-select", /<select\b/gi, true],
  ["img-dimensions", /<img\b(?![^>]*\bwidth=)(?![^>]*\bheight=)[^>]*>/gis, true],
  ["ascii-ellipsis", /(?:>|["'`])[^\n<"'`]*\.\.\.[^\n<"'`]*(?:<|["'`])/g, false],
];
const findings = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const [rule, expression, hard] of rules) {
    for (const match of source.matchAll(expression)) {
      const line = source.slice(0, match.index).split("\n").length;
      findings.push({ rule, hard, file: relative(process.cwd(), file), line });
    }
  }
}
for (const finding of findings)
  console.log(`${finding.hard ? "HARD" : "SOFT"} ${finding.rule} ${finding.file}:${finding.line}`);
const hard = findings.filter((finding) => finding.hard);
console.log(`Vercel guideline audit: ${hard.length} HARD, ${findings.length - hard.length} SOFT`);
if (hard.length) process.exitCode = 1;
