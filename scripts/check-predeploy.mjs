// Runs the release gates locally before a push to main, so one push = one deploy.
// CI stops at the first failing step; this runs every step and lists all failures at once.
// The browser steps are read from the e2e "sample" job in .github/workflows/e2e.yml, so the list
// cannot drift from CI. Usage: npm run check:predeploy  (add -- --from=<script> to resume part-way).
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflow = readFileSync('.github/workflows/e2e.yml', 'utf8');
const sample = workflow.slice(workflow.indexOf('\n  sample:'), workflow.indexOf('\n  full:'));
const fromCI = [...sample.matchAll(/^\s+- run: (.+)$/gm)]
  .map((match) => match[1].trim())
  .filter((command) => /^(node|npm run|npx vitest)\b/.test(command));
const staticGates = ['npm run check', 'npm run check:style', 'npm run check:css', 'npm run check:bundle'];
let steps = [...staticGates, ...fromCI];
const from = process.argv.find((arg) => arg.startsWith('--from='))?.slice(7);
if (from) steps = steps.slice(Math.max(0, steps.findIndex((step) => step.includes(from))));

const failed = [];
for (const step of steps) {
  const started = Date.now();
  const result = spawnSync(step, { shell: true, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', env: { ...process.env, ...envFor(step) } });
  const seconds = Math.round((Date.now() - started) / 1000);
  const ok = result.status === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${seconds}s  ${step}`);
  if (!ok) failed.push({ step, tail: (result.stdout + result.stderr).split('\n').filter((line) => line.trim()).slice(-8).join('\n') });
}
for (const { step, tail } of failed) console.log(`\n--- ${step}\n${tail}`);
console.log(failed.length ? `\n${failed.length} of ${steps.length} steps failed. Do not push.` : `\nAll ${steps.length} steps passed.`);
process.exitCode = failed.length ? 1 : 0;

// The layout matrix step takes its settings from the workflow's env block.
function envFor(step) {
  if (!step.includes('refinement-matrix')) return {};
  const block = sample.slice(sample.indexOf('scripts/refinement-matrix.ts')).split('\n').slice(1);
  const env = {};
  for (const line of block) {
    const match = line.match(/^\s+(CA_[A-Z_]+): '?([^']*)'?$/);
    if (match) env[match[1]] = match[2];
    else if (!/^\s+env:/.test(line)) break;
  }
  return env;
}
