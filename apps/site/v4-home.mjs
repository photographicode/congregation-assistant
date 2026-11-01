// English home page. Visual language matches the V4 app (paper/forest themes): Newsreader display,
// Source Sans 3 text, forest accent, quiet panels. Pictures are real V4 demo screens (fictional data).
const screens=[
 ['today','phone-today','Today in the publisher workspace: the monthly report card and the next assignment','Today shows what’s next.','Your published assignments with their date and time, the monthly report and congregation announcements wait on your home screen.'],
 ['meetings','phone-meetings','The weekly schedule in the publisher workspace with Midweek, Weekend, Duties and Print','Meetings, ready when you are.','Open the schedule your meeting overseer has published: midweek, weekend and duties, ready to print.'],
 ['reports','phone-reports','Reports in the publisher workspace with household reports and linked publishers','Your report in a minute.','Review the month and submit it. Linked household members can be reported from the same screen.']
];
const tools={
 s21:['people-s21','Publisher rows with S-21 download and Options buttons',1000,451],
 reports:['reports-month','Monthly submissions beside the list of missing reports',1120,444],
 meetings:['meetings-midweek','Weekly schedule with Midweek, Weekend, Duties and Print tabs',1120,405],
 assistant:['assistant','On-device assistant with suggested commands and a command field',1120,227]
};
export function v4Home({app,site,escape:e,mark,t,featureKeys,price,pricingText,pricingHref,pricingLabel,securityHref}){
 const img=(file,alt,w,h,lazy=true)=>`<img src="assets/app/${file}.webp" alt="${e(alt)}" width="${w}" height="${h}" decoding="async"${lazy?' loading="lazy"':''}>`;
 const statements=screens.map(([id,file,alt,title,body],i)=>`<article class="statement reveal" data-stage-step="${id}"><div class="statement-picture">${img(file,alt,780,1688)}</div><h3>${e(title)}</h3><p>${e(body)}</p></article>`).join('');
 const stage=screens.map(([id,file,alt],i)=>`<div class="stage-screen" data-stage-screen="${id}"${i?'':' data-active'}>${img(file,alt,780,1688,i>0)}</div>`).join('');
 const tabs=screens.map(([id],i)=>`<button type="button" data-stage-tab="${id}" aria-pressed="${i?'false':'true'}">${id[0].toUpperCase()+id.slice(1)}</button>`).join('');
 const shown=featureKeys.filter(key=>tools[key]),rest=featureKeys.filter(key=>!tools[key]);
 const modules=shown.map(key=>{const [file,alt,w,h]=tools[key];return `<article class="tool reveal"><div class="tool-picture" data-ui>${img(file,alt,w,h)}</div><div class="tool-copy"><h3>${e(t('feature.'+key+'.title'))}</h3><p>${e(t('feature.'+key+'.body'))}</p></div></article>`;}).join('');
 const more=rest.map(key=>`<li><h3>${e(t('feature.'+key+'.title'))}</h3><p>${e(t('feature.'+key+'.body'))}</p></li>`).join('');
 const answers=['who','access','protection'].map(key=>`<div class="reveal"><h3>${e(t('security.'+key+'.q'))}</h3><p>${e(t('security.'+key+'.a'))}</p></div>`).join('');
 const faq=Array.from({length:10},(_,i)=>`<p><strong>${e(t('faq.'+(i+1)+'.q'))}</strong> ${e(t('faq.'+(i+1)+'.a'))}</p>`).join('');
 return `<div class="stage-page">
 <div class="stage-copy">
  <section class="hero-copy-block" aria-labelledby="home-title"><h1 id="home-title" class="reveal">Less to manage.<br>More time for people.</h1><p class="lead reveal">Your assignments, meeting schedules and monthly report in one calm place, made for your phone.</p><div class="actions reveal"><a class="button primary" href="${e(app)}">Open your workspace</a><a class="button" href="${site}/#how-it-works">See how it works</a></div><p class="fine-print reveal">Independent and unofficial. Sign in with the Google account your congregation approved.</p></section>
  <section id="how-it-works" class="statements" aria-labelledby="how-title"><h2 id="how-title" class="reveal">Your month, in three places.</h2>${statements}</section>
 </div>
 <aside class="stage" aria-label="Publisher workspace screens"><div class="stage-frame">${stage}</div><div class="stage-tabs" role="group" aria-label="Show a screen">${tabs}</div></aside>
</div>
<section class="section tools-section" id="features" aria-labelledby="tools-title"><div class="wrap"><div class="tools-head"><h2 id="tools-title" class="reveal">The tools behind the week.</h2><p class="reveal">Overseers and the main admin get the detailed tools: records, reports, schedules and duties, each limited to the people their role allows.</p></div><div class="tools">${modules}</div>${more?`<ul class="more-tools" aria-label="Also in the app">${more}</ul>`:''}</div></section>
<section class="trust-field" aria-labelledby="trust-title"><div class="wrap trust-layout"><div><h2 id="trust-title" class="reveal">${e(t('security.title'))}</h2><a class="button on-field reveal" href="${securityHref}">${e(t('security.more'))}</a></div><div class="trust-answers">${answers}</div></div></section>
<section class="section" id="pricing" aria-labelledby="pricing-title"><div class="wrap pricing-layout"><h2 id="pricing-title" class="reveal">${e(t('pricing.title'))}</h2><div class="pricing-figure reveal"><p class="price"><span translate="no">₹${e(price.toLocaleString('en-IN'))}</span> <small>a year</small></p><p>${e(pricingText)}</p><a class="button" href="${pricingHref}">${e(pricingLabel)}</a></div></div></section>
<section class="section faq-section" id="faq" aria-labelledby="faq-title"><div class="wrap faq-layout"><h2 id="faq-title" class="reveal">${e(t('faq.title'))}</h2><div class="faq-text">${faq}</div></div></section>
<section class="closing-field" aria-labelledby="closing-title"><div class="wrap closing-layout"><div class="closing-copy"><h2 id="closing-title" class="reveal">Your workspace is ready.</h2><p class="reveal">Open it in any browser, then add it to your home screen if you like.</p></div><div class="signin-card reveal" data-ui><div class="signin-mark"><span class="signin-logo" aria-hidden="true">${mark}</span><span>Congregation Assistant</span></div><h3>A calmer way to keep things together.</h3><p>Sign in with the account your congregation approved.</p><a class="button primary" href="${e(app)}">Open your workspace</a><p class="signin-note">Independent and unofficial. Your congregation controls access.</p></div></div></section>`;
}
