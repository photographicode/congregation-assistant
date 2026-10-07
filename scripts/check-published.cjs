/* Verify a Pages deployment serves the tested local assets before browser checks. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..', process.env.CA_CHECK_ASSET_ROOT || '.');
const base = process.env.CA_CHECK_BASE_URL;
if (!base || new URL(base).protocol !== 'https:') throw new Error('Set CA_CHECK_BASE_URL to the published HTTPS site.');
const names = ['index.html', 'app.css','app-utilities.css', 'app-support.js', 'pdf-tools.js','app-config.js','public-links.js','app-install.js','app-attendance.js','app-reminders.js','app-guide.js','app-onboarding.js','app-oclm-cloud.js','app-publisher-home.js','app-recovery.js','app-push.js','app-home.js','app-demo.js','app-departments.js','app-imports.js','app-readability.js','service-worker.js','manifest.webmanifest','assets/icon-192.png','assets/icon-512.png'];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expected = new Map(names.map(name => [name, digest(fs.readFileSync(path.join(root, name)))]));
(async () => {
    let last = [];
    for (let attempt = 0; attempt < 48; attempt++) {
        last = await Promise.all(names.map(async name => {
            const url = new URL(name, base.endsWith('/') ? base : base + '/');
            try {
                const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000) });
                const actual = response.ok ? digest(Buffer.from(await response.arrayBuffer())) : null;
                return { file: name, status: response.status, matches: actual === expected.get(name), expected: expected.get(name), actual };
            } catch (error) { return { file: name, matches: false, error: error.message }; }
        }));
        const pending = last.filter(result => !result.matches);
        if (!pending.length) {
            if(!process.env.CA_CHECK_ASSET_ROOT){for(const name of ['supabase/google-sign-in.md','supabase/functions/owner-password-session/index.ts','scripts/check-app.cjs']){const response=await fetch(new URL(name,base),{signal:AbortSignal.timeout(15000)});if(response.status!==404)throw new Error('Internal source remains served by Pages: '+name+' ('+response.status+')');}console.log('PASS owner setup, backend source and tests are excluded from the public software deployment');}
            const output = path.join(root, 'artifacts/published');fs.mkdirSync(output, { recursive: true });
            fs.writeFileSync(path.join(output, 'deployment.json'), JSON.stringify({ url: base, checkedAt: new Date().toISOString(), files: last }, null, 2));
            console.log('PASS published HTML, CSS, and JavaScript match the checked-out commit:', base);
            return;
        }
        console.log(`Waiting for Pages deployment (${attempt + 1}/48):`, pending.map(result => `${result.file}: ${result.status || result.error}`).join(', '));
        if (attempt < 47) await new Promise(resolve => setTimeout(resolve, 15000));
    }
    throw new Error('Published files do not match this commit: ' + JSON.stringify(last));
})().catch(error => { console.error(error);process.exitCode = 1; });
