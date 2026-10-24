/* Fail on actual secret formats without printing matched values. Public keys are allowed. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),failures=[];
const patterns=[['Google OAuth secret',/GOCSPX-[A-Za-z0-9_-]{20,}/],['Supabase secret key',/sb_secret_[A-Za-z0-9_-]{16,}/],['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]];
const {execFileSync}=require('node:child_process');
for(const relative of execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean)){
 const file=path.join(root,relative);if(!fs.existsSync(file)||! /\.(?:html|js|cjs|mjs|ts|tsx|json|sql|md|yml|yaml|txt)$/.test(file))continue;
 const text=fs.readFileSync(file,'utf8');for(const [kind,pattern]of patterns)if(pattern.test(text))failures.push({file:relative,kind});
 for(const match of text.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){try{if(JSON.parse(Buffer.from(match[0].split('.')[1],'base64url')).role==='service_role')failures.push({file:relative,kind:'privileged JWT'});}catch{}}
}
assert.deepEqual(failures,[],'Tracked source contains credentials: '+JSON.stringify(failures));
const html=fs.readFileSync(path.join(root,'apps/web/index.html'),'utf8');assert.match(html,/<meta name="referrer" content="no-referrer">/);assert.match(html,/Content-Security-Policy/);
// Generated website metadata is checked by scripts/site-audit.mjs after build.
console.log('PASS tracked source credential scan and native entry privacy metadata');
