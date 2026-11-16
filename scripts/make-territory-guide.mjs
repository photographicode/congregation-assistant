// Makes assets/territory-guide.pdf, the "how to use" guide sent in the "ready for use" email.
// Screenshots come from the fictional demo, so no real records appear. Run with the dev server up:
//   npx vite --config apps/web/vite.config.ts --port 5179   then   node scripts/make-territory-guide.mjs [http://localhost:5179]
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';

const base=(process.argv[2]||'http://localhost:5179').replace(/\/$/,'');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:420,height:740},deviceScaleFactor:2,colorScheme:'light'});
// The demo note is for visitors, not for the guide's pictures.
const shot=async()=>{await page.evaluate(()=>document.querySelectorAll('.tm-demo').forEach(el=>{el.hidden=true;el.style.display='none';}));return 'data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:80})).toString('base64');};
const open=async(query,ready)=>{await page.goto(`${base}/?${query}`);await page.getByText(ready).first().waitFor();await page.waitForTimeout(600);};
const tab=async name=>{await page.getByRole('button',{name,exact:true}).first().click();await page.waitForTimeout(500);};

const shots={};
await open('territory&demo','Dashboard');shots.dashboard=await shot();
await tab('Territories');shots.list=await shot();
await page.locator('.tm-card,.tm-list button').nth(2).click();await page.waitForTimeout(600);shots.detail=await shot();
await page.keyboard.press('Escape');
await tab('Issues');shots.issues=await shot();
await tab('Settings');await page.getByRole('heading',{name:'People with access'}).scrollIntoViewIfNeeded();shots.people=await shot();
await page.getByRole('heading',{name:'Reports from shared cards'}).scrollIntoViewIfNeeded();shots.reports=await shot();
await open('territory-card&demo#token=demo-share-3','Be aware');shots.card=await shot();
await page.getByRole('button',{name:/Report a house or place|Report an issue here/}).click();await page.getByText('Get my location').scrollIntoViewIfNeeded();await page.waitForTimeout(400);shots.report=await shot();

const steps=[
 ['Sign in','Open territory.congregationassistant.com and choose Sign in. Use the congregation’s official Gmail account: it is the first admin. The Dashboard shows how many territories are in use, overdue, available and never used.','dashboard'],
 ['Find a territory','Territories lists every card. Search by number, name or publisher, filter by status, and export the S-13 record or a CSV for any service year.','list'],
 ['Assign and return','Open a territory to assign it to a publisher, mark it returned, add past records, and download the card. Share link sends the digital card to the publisher’s phone.','detail'],
 ['Read reports','Issues collects what publishers report from the shared cards: houses not to call on, gates, dogs, and, with language search on, houses where a language is spoken.','issues'],
 ['People with access','Settings → People with access. An admin changes everything; a viewer looks only. Add each person’s Google account.','people'],
 ['Issues and language search','Settings → Reports from shared cards. Choose issues only, or issues and language search, and keep the list of languages. Add territory outlines (the KML file) so a report with a location goes to the right territory by itself.','reports'],
 ['The digital card','Whoever opens a shared link sees the card: the map, notes and open reports. Open map starts directions in Google Maps.','card'],
 ['Report a house or place','Tap Report, choose an issue or a language speaker, and tap Get my location while standing at the house. The report goes to the territory that holds that place.','report'],
];
const e=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Territories · How to use</title><style>
@page{size:A4;margin:14mm}body{font-family:'Noto Sans',system-ui,sans-serif;color:#1c2330;margin:0}
h1{font-size:30px;margin:0 0 6px}.lead{color:#4b5565;font-size:14px;margin:0 0 18px;line-height:1.5}
.cover{border-bottom:2px solid #1c2330;padding-bottom:12px;margin-bottom:16px}
.step{display:grid;grid-template-columns:1fr 58mm;gap:10mm;align-items:start;break-inside:avoid;padding:5mm 0;border-bottom:1px solid #d9dee6}
.step h2{font-size:18px;margin:0 0 6px}.step p{font-size:13px;line-height:1.55;margin:0;color:#2b3442}.n{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#1c2330;color:#fff;font-size:13px;margin-right:8px}
img{width:58mm;border-radius:10px;border:1px solid #d9dee6}.foot{font-size:11px;color:#6a7382;margin-top:10mm}
</style></head><body><div class="cover"><h1>Territories: how to use</h1><p class="lead">A short guide to the territory manager at territory.congregationassistant.com. The pictures show the fictional demo, so you can try every step there first.</p></div>
${steps.map(([t,p,k],i)=>`<section class="step"><div><h2><span class="n">${i+1}</span>${e(t)}</h2><p>${e(p)}</p></div><img src="${shots[k]}" alt=""></section>`).join('')}
<p class="foot">Theme options are in Settings → Display. Questions: support@congregationassistant.com. Independent and unofficial. There is no fee; we accept only voluntary donations.</p></body></html>`;
const pdf=await browser.newPage();
await pdf.setContent(html,{waitUntil:'load'});
await writeFile('assets/territory-guide.pdf',await pdf.pdf({format:'A4',printBackground:true}));
await browser.close();
console.log('assets/territory-guide.pdf written');
