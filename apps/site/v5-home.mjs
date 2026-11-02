// English home page: the product performs. Each section is a working fragment of the app with fictional data.
// Styles live in home.css (scoped to .v5); behaviour lives in site.js under the .v5 guard.
const tools=[
 ['S-21 in one tap','Download a card beside any publisher, or choose everyone, pioneers, elders, ministerial servants, SFTS, or publishers with missing reports.',['people-s21','Publisher rows with S-21 download and Options buttons',1000,451]],
 ['Reports without chasing','Group links, household reporting, and reminders you send yourself. The month’s missing list is always one tap away.',['reports-month','Monthly submissions beside the list of missing reports',1120,443]],
 ['The week’s parts, already there','English meeting parts arrive from wol.jw.org. You choose who gives each part, then print or share the schedule.',['meetings-midweek','Weekly schedule with Midweek, Weekend, Duties and Print tabs',1120,475]],
 ['Fair suggestions','See who was used last, find someone not used yet, and review fill-empty auto-assignment before anything is saved.'],
 ['Weekend talks','Talks and speakers, with a heads-up when a talk number was given recently.'],
 ['S-89 slips','Download an assignment for the student and assistant, or share the PDF yourself.'],
 ['Duties','Audio Video, Attendants and Cleaning, drawn only from people the administrator approves.'],
 ['Attendance from the door','The meeting date and type come from your congregation’s calendar and timezone. Enter the count and you’re done.']
];
const trust=[
 ['Independent and unofficial','Made by one developer you can email. No affiliation with any religious organization.'],
 ['Roles decide what people see','Approved users see only what their assigned role allows.'],
 ['Encrypted connections','Database access rules, scoped public links, and tests on every release.'],
 ['Works on a weak signal','Loaded records and midweek drafts work offline and sync when you reconnect.'],
 ['Your records leave with you','Administrators can download exports and recovery backups from Settings.'],
 ['Nothing to install','Open it in any browser, then add it to your home screen if you like.']
];
export function v5Home({app,escape:e,t,price,pricingText,pricingHref,pricingLabel,securityHref}){
 const img=(file,alt,w,h)=>`<img src="assets/app/${file}.webp" alt="${e(alt)}" width="${w}" height="${h}" decoding="async" loading="lazy">`;
 const list=tools.map(([name,body,pic],i)=>`<li${i?'':' class="sel"'}><button type="button">${e(name)}</button><div class="cmd-detail"><p>${e(body)}</p>${pic?img(...pic):''}</div></li>`).join('');
 const tiles=trust.map(([title,body])=>`<div class="ptile reveal"><b>${e(title)}</b><p>${e(body)}</p></div>`).join('');
 const faq=[1,2,3,4,5,6,7,10].map((n,i)=>`<details name="faq"${i?'':' open'}><summary>${e(t('faq.'+n+'.q'))}<i class="plus" aria-hidden="true"></i></summary><p>${e(t('faq.'+n+'.a'))}</p></details>`).join('');
 return `<div class="v5">
<section class="v5-hero wrap" aria-labelledby="home-title">
 <div class="v5-copy">
  <h1 id="home-title">Less to manage.<br>More time for people.</h1>
  <p class="v5-lead">Reports, S-21 cards, meeting schedules, duties and attendance for your congregation, in one calm app that works on any phone.</p>
  <div class="acts"><a class="btn" href="${e(app)}">Open your workspace</a><a class="btn ghost" href="#how-it-works">See how it works</a></div>
  <p class="fine">Independent and unofficial. The sample report is live. Try it.</p>
 </div>
 <div class="v5-stage" role="group" aria-label="Live example with fictional data">
  <div class="report" data-ui>
   <div class="panel-head"><strong>October report</strong><span>Anita Joseph</span></div>
   <div class="row"><span id="shared-label">I shared in the ministry</span><button type="button" class="switch" role="switch" aria-checked="true" aria-labelledby="shared-label" data-v5-shared></button></div>
   <div class="row"><span>Bible studies</span><div class="stepper" data-v5-step="studies" data-max="20"><button type="button" aria-label="Fewer Bible studies">−</button><output>2</output><button type="button" aria-label="More Bible studies">+</button></div></div>
   <div class="row"><span>Hours<small>Only if you pioneered</small></span><div class="stepper" data-v5-step="hours" data-max="120"><button type="button" aria-label="Fewer hours">−</button><output>0</output><button type="button" aria-label="More hours">+</button></div></div>
   <label class="note"><span>Comments for the secretary</span><textarea data-v5-comment>Auxiliary pioneer next month</textarea></label>
   <button class="submit" type="button" data-v5-submit>Submit report</button>
  </div>
  <div class="sec" data-ui aria-live="polite">
   <div class="panel-head"><strong>Reports · October</strong><span>Secretary</span></div>
   <div class="count"><b data-v5-done>41</b><span>of 46 reported</span></div>
   <div class="bar"><i data-v5-bar style="width:89.1%"></i></div>
   <table class="s21" aria-label="Anita Joseph S-21, last three months">
    <thead><tr><th>Month</th><th>Shared</th><th>Studies</th><th>Hours</th><th>Remarks</th></tr></thead>
    <tbody><tr><td>Aug</td><td>Yes</td><td>2</td><td></td><td></td></tr><tr><td>Sep</td><td>Yes</td><td>1</td><td></td><td></td></tr><tr class="hot" data-v5-row><td>Oct</td><td>–</td><td>–</td><td></td><td></td></tr></tbody>
   </table>
   <ul class="miss"><li class="you" data-v5-you>Anita Joseph<span>Field group 2</span></li><li>Daniel Mathew<span>Field group 1</span></li><li>Ruth Abraham<span>Field group 3</span></li></ul>
  </div>
 </div>
</section>

<section id="how-it-works" class="how" aria-labelledby="how-title">
 <div class="how-l">
  <h2 id="how-title" class="how-clause" data-v5-clause>First, publishers report from any phone.</h2>
  <p class="how-sub" data-v5-sub>A two-minute form. Linked household members can be reported from the same screen.</p>
 </div>
 <div class="how-r">
  <div class="how-frag" data-ui data-v5-frag>
   <div class="state on"><div class="panel-head"><strong>Submitted this week</strong><span>October</span></div><ul class="feed"><li>Grace Thomas<span>2 studies · today</span></li><li>Thomas and Mary Paul<span>household · today</span></li><li>Priya Raman<span>52 hours · yesterday</span></li><li>Benny George<span>1 study · Mon</span></li></ul></div>
   <div class="state"><div class="panel-head"><strong>Missing reports</strong><span>5 of 46</span></div><ul class="feed"><li>Daniel Mathew<span>Field group 1</span></li><li>Ruth Abraham<span>Field group 3</span></li><li>Samuel Varghese<span>Field group 2</span></li><li>Joel Kurian<span>Field group 4</span></li><li>Leena Sam<span>Field group 1</span></li></ul></div>
   <div class="state"><div class="panel-head"><strong>Grace Thomas · S-21</strong><span>Service year 2027</span></div><table class="s21"><thead><tr><th>Month</th><th>Shared</th><th>Studies</th><th>Hours</th></tr></thead><tbody><tr><td>Sep</td><td>Yes</td><td>2</td><td></td></tr><tr class="hot"><td>Oct</td><td>Yes</td><td>2</td><td></td></tr><tr><td>Nov</td><td></td><td></td><td></td></tr><tr><td>Dec</td><td></td><td></td><td></td></tr></tbody></table></div>
   <div class="state"><div class="panel-head"><strong>Download S-21</strong><span>PDF</span></div><div class="choice"><span class="sel">Everyone</span><span>Pioneers</span><span>Elders</span><span>Ministerial servants</span><span>SFTS</span><span>Missing reports</span></div><p class="submit" style="display:flex;align-items:center;justify-content:center">Download 46 cards</p></div>
  </div>
 </div>
 <div class="how-ctl">
  <input class="range" type="range" min="0" max="3" step="1" value="0" aria-label="Step of the monthly report" data-v5-range>
  <div class="stops" data-v5-stops><button type="button" aria-current="true">Report</button><button type="button">Follow up</button><button type="button">Record</button><button type="button">Download</button></div>
 </div>
</section>

<section id="features" class="wrap sec-pad" aria-labelledby="tools-title">
 <h2 id="tools-title" class="visually-hidden">Features</h2>
 <div class="cmd-box" data-ui>
  <input class="cmd-input reveal" type="search" placeholder="Find a tool" aria-label="Find a tool" autocomplete="off" data-v5-find>
  <ul class="cmds" data-v5-list>${list}</ul>
  <p class="cmd-empty" data-v5-empty hidden>Nothing by that name yet. Try “report” or “S-21”.</p>
 </div>
</section>

<section class="wrap sec-pad say" aria-labelledby="say-title">
 <h2 id="say-title" class="say-label reveal">Or just type it the way you’d say it.</h2>
 <div class="say-line reveal" data-ui><input class="say-input" value="Attendants on Sunday: Benny George" aria-label="Type a request for the on-device assistant" autocomplete="off" spellcheck="false" data-v5-say></div>
 <div class="say-ans reveal" data-ui aria-live="polite" data-v5-answer></div>
 <div class="say-ex reveal" data-v5-examples><button type="button">Report 3 studies for October</button><button type="button">Attendance 87 on Thursday</button><button type="button">Who gave talk 54 last?</button></div>
 <p class="say-note reveal">Your words stay on your device. Nothing saves until you confirm it. This example uses fictional names.</p>
</section>

<section class="wrap sec-pad" aria-labelledby="trust-title">
 <div class="ptiles"><div class="ptile head reveal"><h2 id="trust-title">${e(t('security.title'))}</h2><a href="${securityHref}">${e(t('security.more'))}</a></div>${tiles}</div>
</section>

<section id="pricing" class="wrap sec-pad price-sec" aria-labelledby="pricing-title">
 <div class="copy reveal"><h2 id="pricing-title">One price for the whole congregation.</h2><p>${e(pricingText)}</p></div>
 <div class="figure reveal">
  <div class="numwrap"><p class="num"><sup>₹</sup><span translate="no">${e(price.toLocaleString('en-IN'))}</span></p>${img('phone-today','Today screen in the publisher workspace',780,1688).replace('<img ','<img class="phone" ')}</div>
  <p class="per">a year, for the whole congregation</p>
  <ul class="incl"><li>Every publisher, overseer and admin</li><li>Reports, S-21, schedules, duties and attendance</li><li>Exports and recovery backups</li><li>Email support from the developer</li></ul>
  <a class="btn" href="${pricingHref}">${e(pricingLabel)}</a>
 </div>
</section>

<section id="faq" class="wrap sec-pad v5-faq" aria-labelledby="faq-title">
 <h2 id="faq-title" class="reveal">${e(t('faq.title'))}</h2>
 <div>${faq}</div>
</section>

<section class="cta" aria-labelledby="closing-title">
 <div class="cta-copy reveal"><h2 id="closing-title">Your week,<br>handled.</h2><p>Sign in with the Google account your congregation approved. Your administrator decides what you see.</p></div>
 <div class="dialog reveal" data-ui>
  <div class="body">
   <h3>Open your workspace</h3>
   <p>River Park Congregation</p>
   <div class="seg" role="group" aria-label="I am a" data-v5-roles><button type="button" aria-pressed="true" data-role="pub">Publisher</button><button type="button" aria-pressed="false" data-role="ovs">Overseer</button></div>
   <ul class="gets" data-v5-gets><li>Your assignments and meeting schedule</li><li>Your monthly report, with household members</li><li>Congregation announcements</li></ul>
   <a class="go" href="${e(app)}">Continue</a>
   <p class="small">Independent and unofficial. Your congregation controls access.</p>
  </div>
 </div>
</section>
</div>`;
}
