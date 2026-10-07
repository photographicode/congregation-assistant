/* Build a separate pilot artifact; only public backend configuration is included. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts/staging');
const backend = JSON.parse(fs.readFileSync(path.join(root, 'supabase/new-project-public.json'), 'utf8'));
if (backend.supabaseUrl !== 'https://ejosykrxjvwrhxfnputo.supabase.co' || !backend.supabaseAnonKey.startsWith('sb_publishable_')) throw new Error('Expected the reviewed pilot project and a public key.');
const files = ['index.html', 'app.css','app-utilities.css', 'app-support.js', 'pdf-tools.js', 'public-links.js', 'app-install.js','app-attendance.js','app-onboarding.js','app-oclm-cloud.js','app-reminders.js','app-guide.js','app-readability.js','app-publisher-home.js','app-recovery.js','app-push.js','app-home.js','app-demo.js','app-departments.js','app-transfer.js','app-imports.js', 'service-worker.js', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/icon-512.png','assets/vendor/fontkit-1.1.1.min.js',...fs.readdirSync(path.join(root,'assets/fonts')).map(name=>'assets/fonts/'+name)];
fs.mkdirSync(output, {recursive: true});
for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(output, file)), {recursive: true});
    fs.copyFileSync(path.join(root, file), path.join(output, file));
}
fs.writeFileSync(path.join(output, 'app-config.js'), '/* Public staging configuration. */\nwindow.CA_CONFIG = Object.freeze(' + JSON.stringify({...backend, secureBackend: true, trialDays: 30, introductoryAnnualPrice: 1499}, null, 2) + ');\n');
files.push('app-config.js');
fs.writeFileSync(path.join(output, 'verification-manifest.json'), JSON.stringify({preparedAt: new Date().toISOString(), backend: backend.supabaseUrl, deploymentVerified: false, oauthVerified: false, files: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex')]))}, null, 2));
console.log('Prepared secure pilot files:', output);
console.log('Register the staging HTTPS URL in Supabase Auth before Google sign-in. Deployment and OAuth still require verification.');
