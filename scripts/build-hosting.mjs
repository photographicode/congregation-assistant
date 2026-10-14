import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
const c=JSON.parse(await readFile('public-config.json'));const report=JSON.parse(await readFile('dist/build-report.json'));const commit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const worker=await readFile('hosting/worker.mjs','utf8');const csp=worker.match(/const policy = "([^"]+)"/)[1];
for(const root of ['dist','dist-site']){
 const app=root==='dist';await mkdir(root+'/.well-known',{recursive:true});
 await writeFile(root+'/version.json',JSON.stringify({commit,buildHash:report.hash,builtAt:new Date().toISOString()},null,2));
 await writeFile(root+'/_headers',`/*\n  Content-Security-Policy: ${app?csp:csp.replace(" 'wasm-unsafe-eval'",'')}\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Resource-Policy: same-origin\n  Cache-Control: no-store\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
 await writeFile(root+'/_redirects',app?'/v2/* /:splat 301\n/index.html / 301\n':'https://www.congregationassistant.com/* https://congregationassistant.com/:splat 301\n/how-to-use.html /help/ 301\n/android/* /install/ 301\n');
 await writeFile(root+'/.well-known/security.txt',`Contact: mailto:${c.SECURITY_EMAIL}\nExpires: 2027-10-14T00:00:00Z\nPreferred-Languages: en, hi\nPolicy: ${c.PUBLIC_SITE_URL}/security/\nCanonical: ${app?c.APP_URL:c.PUBLIC_SITE_URL}/.well-known/security.txt\n`);
 await writeFile(root+'/.well-known/assetlinks.json','[]\n');
 await writeFile(root+'/robots.txt',app?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${c.PUBLIC_SITE_URL}/sitemap.xml\n`);
}
const routes=['','features/','security/','about/','pricing/','install/','help/','updates/','contact/','privacy/','terms/','status/','data-processing/','cookies/'];
await writeFile('dist-site/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+routes.map(p=>`<url><loc>${c.PUBLIC_SITE_URL}/${p}</loc></url>`).join('')+'</urlset>');
