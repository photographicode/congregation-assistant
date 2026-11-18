// territory.congregationassistant.com: serves the territory manager at the site root, from the same published
// app as congregationassistant.com/app/, with the same security headers as hosting/worker.mjs.
// Deployed as the Cloudflare Worker "territory-site" with the custom domain territory.congregationassistant.com.
const ORIGIN = 'https://congregationassistant.com';
const HOST = 'territory.congregationassistant.com';
const GENERATOR_HOST = 'generator.congregationassistant.com';
// Same policy as the app's index.html meta tag, plus frame-ancestors, which only works as a header.
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://ejosykrxjvwrhxfnputo.supabase.co wss://ejosykrxjvwrhxfnputo.supabase.co; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests";

export default {
 async fetch(request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') { url.protocol = 'https:'; return Response.redirect(url, 308); }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  // Search engines: only the landing page (with its questions and answers) is indexable; robots.txt and the sitemap list only it.
  if (url.pathname === '/robots.txt') return new Response(`User-agent: *
Allow: /$
Disallow: /?
Sitemap: https://${HOST}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  // Plain summary for AI search (ChatGPT, Claude, Perplexity and others).
  if (url.pathname === '/llms.txt') return new Response(LLMS, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  // IndexNow key (Bing, Yandex and others): public by design, proves this site sent the change list.
  if (url.pathname === '/f4229fc3717dfac1f6afd4b460687b07.txt') return new Response('f4229fc3717dfac1f6afd4b460687b07', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (url.pathname === '/sitemap.xml') return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${HOST}/</loc><lastmod>${LASTMOD}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  // The generator moved to its own origin so it can never read the owner's session here; keep old links working.
  if (url.pathname === '/generator' || url.pathname.startsWith('/generator/')) return Response.redirect(`https://${GENERATOR_HOST}${url.pathname.slice('/generator'.length) || '/'}${url.search}`, 301);
  // The questions and answers live on the landing page now.
  if (url.pathname === '/faq') return Response.redirect(`https://${HOST}/#tl-faq`, 301);
  // Search engines look for /favicon.ico; the app icon is a 192 px PNG.
  if (url.pathname === '/favicon.ico') return Response.redirect(`https://${HOST}/app/assets/icon-192.png`, 301);
  // The site root is the territory manager; everything else (assets, manifests, the service worker) is the app's own path.
  const page = PAGES[url.pathname === '/index.html' ? '/' : url.pathname];
  const path = page ? '/app/' : url.pathname;
  const upstream = await fetch(ORIGIN + path + url.search, { method: request.method, headers: { Accept: request.headers.get('Accept') || '*/*' }, redirect: 'manual' });
  const response = new Response(upstream.body, upstream);
  const headers = response.headers;
  const location = headers.get('Location');
  // Exact origin match: a prefix test would also rewrite https://congregationassistant.com.evil.example.
  if (location && (location === ORIGIN || location.startsWith(ORIGIN + '/'))) headers.set('Location', 'https://' + HOST + location.slice(ORIGIN.length));
  headers.set('Content-Security-Policy', policy);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  // Location is allowed for this site only: the issue form records where a house is.
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()');
  // No opener policy: the generator opens this site to send its territories, and this site opens the generator to hand
  // over a request's file. Any policy here (even same-origin-allow-popups) cuts the window the generator opened, which then
  // looks closed to it. The upstream app's own policy is dropped too.
  headers.delete('Cross-Origin-Opener-Policy');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // Same caching as hosting/worker.mjs: hashed assets forever, pages and the service worker never from a shared cache.
  const contentType = headers.get('Content-Type') || '';
  headers.set('Cache-Control', /\/[\w.-]+-[\w-]{8,}\.(js|css|woff2|wasm)$/.test(url.pathname) ? 'public, max-age=31536000, immutable' : /html/.test(contentType) || /service-worker|manifest|version\.json/.test(url.pathname) ? 'no-store' : 'public, max-age=3600');
  // Only the bare landing page is indexed; app screens (any query string) and files stay out of search.
  if (!page || url.search) { headers.set('X-Robots-Tag', 'noindex, nofollow'); return response; }
  // The app's own noindex tag would override ours (Google obeys the stricter one), so drop it here.
  return new HTMLRewriter().on('meta[name="robots"]', { element(meta) { meta.remove(); } }).on('meta[name="description"]', { element(meta) { meta.remove(); } }).on('head', new SeoHead(page)).on('title', { element(title) { title.setInnerContent(page.title); } }).on('div#root', { element(root) { root.setInnerContent(page.body, { html: true }); } }).on('noscript', { element(note) { note.remove(); } }).transform(response);
 }
};

// Search results cut titles near 60 characters and descriptions near 160.
const TITLE = 'Territory Assistant: JW territory manager and map cards';
const DESCRIPTION = 'Keep, assign and return congregation territories, with the S-13 record and digital cards. We also make Territory Map Cards from your KML file. Free.';
// Date the landing page last changed, for the sitemap.
const LASTMOD = '2026-11-18';
const KEYWORDS = 'territory assistant, territory manager, JW territory, JW territory card, JW territory manager, Jehovah’s Witnesses territory card, Jehovahs Witnesses territory card, S-13, S-13 territory assignment record, digital territory card, language search territory, territory, territory manager, territory card, territory map card, territory maker, congregation territory, Jehovah’s Witnesses, Jehovah’s Witnesses territory, JW territory, S-13, territory assignment record, congregation, KML territory map, QR code territory map, KML file splitter, KML territory splitter, split KML into territories, KML to territory cards, Google My Maps territory, territory map maker, territory QR code, printable territory cards, territory card generator, territory assignment, territory tracker, territory records app, Jehovah’s Witnesses territory cards, JW territory map, JW territory app, field service territory, congregation territory map, territory boundaries, door to door territory, India congregations, Malayalam, Hindi, Tamil, Telugu, Kannada, territory map jw, JW territory map maker, territory JW map maker, territory kml, KML territory maker, kml file splitter, split KML file, KML boundary to territories, territory map generator, territory cards PDF, territory helper, territory app for congregations, Jehovah’s Witnesses congregation, Jehovahs Witnesses, Jehovah witness territory, congregation assistant, publisher territory card, field service territory map';
const LLMS = `# Territory Assistant

> JW territory manager for congregations of Jehovah’s Witnesses, part of Congregation Assistant (https://congregationassistant.com/). Free; voluntary donations only. Independent; not made by or affiliated with the Watch Tower Bible and Tract Society.

- Territory manager: keep, assign and return territories, with the S-13 territory assignment record, digital territory cards that publishers open on the phone, and reports of houses or places routed to the right territory.
- Territory making: send the congregation boundary as a KML file (from Hub); we split it into territories (KML file splitter / KML territory maker), the congregation names them through a private link, and we print Territory Map Cards with a QR code to Google Maps plus a high-resolution full map with every territory number.
- Languages: English, Malayalam, Kannada, Telugu, Hindi, Tamil.

## Pages

- [Territory Assistant home and FAQ](https://${HOST}/)
- [Ask for territory help](https://${HOST}/#tl-help)
- [Congregation Assistant (OCLM meeting scheduler, publisher manager)](https://congregationassistant.com/)
`;
// Questions and answers for search results; they match apps/web/src/features/TerritoryFaq.tsx on the landing page.
const FAQ = { '@type': 'FAQPage', mainEntity: [
 ['What does it cost?', 'Nothing. We accept only voluntary donations, and none is needed for any service.'],
 ['What do we need to start?', 'Just the KML file of your boundary from Hub. Then choose Territory Cards, a full map, the territory manager, or all three.'],
 ['How do we name the territories?', 'On one private link, with no sign-in. You see each territory on a street map, write its locality name, correct the landmarks and add notes.'],
 ['Who checks the cards?', 'Your congregation’s admin signs in with Google, looks at every card, and comments on any that needs a change or approves them all.'],
 ['Can we try it first?', 'Yes. The demo has 25 fictional territory cards. Nothing is saved.'],
 ['Is this an official app?', 'No. It is independent and unofficial, made to help congregations keep their territories in order.'],
].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) };
const JSONLD = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
 { '@type': 'WebSite', name: 'Territory Assistant', alternateName: ['Territory manager · Congregation Assistant', 'JW territory manager', 'JW territory map maker', 'KML territory maker', 'KML file splitter for territories', 'Territory map cards'], url: `https://${HOST}/` },
 { '@type': 'Organization', name: 'Congregation Assistant', url: 'https://congregationassistant.com/', logo: `https://${HOST}/app/assets/icon-512.png` },
 { '@type': 'SoftwareApplication', name: 'Territory Assistant · Congregation Assistant', offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' }, url: `https://${HOST}/`, applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS', description: DESCRIPTION, inLanguage: ['en', 'ml', 'kn', 'te', 'hi', 'ta'] },
 { '@type': 'Service', name: 'Territory map cards and territory making', serviceType: 'Territory maker', provider: { '@type': 'Organization', name: 'Congregation Assistant', url: 'https://congregationassistant.com/' }, areaServed: 'IN', description: 'From the congregation boundary (KML) to territories, a Territory Map Card for each with a QR code to Google Maps, and a high-resolution full map with every territory number.' },
 FAQ,
] });
// The landing page as plain HTML inside #root: search engines and link previews read it without running the app,
// and the app replaces it as soon as it starts. Same words as apps/web/src/features/TerritoryLanding.tsx (English).
const li = (items) => items.map(([title, text]) => `<li><h3>${title}</h3><p>${text}</p></li>`).join('');
const BODY = `<main class="tl"><header><p>Territory Assistant · Congregation Assistant</p></header>
<h1>Every territory, in one place.</h1>
<p>Keep your territory cards, assign and return them, keep the S-13 record and share each map with the publisher who has it. Only have the congregation boundary? We make the territories and cards for you.</p>
<p><a href="/#tl-help">Request help with territories</a> · <a href="/?territory&amp;demo">Try the demo</a></p>
<h2>What the territory manager does</h2><ul>${li([
 ['Every territory in one list', 'Number, locality and map for each territory, with who has it and how long it has been out.'],
 ['S-13 kept for you', 'Assign and return a territory in two taps. The S-13 assignment record fills itself.'],
 ['Share the map', 'Send a publisher their territory card or its Google Maps link straight from the phone.'],
 ['Hear about problems', 'Publishers report a do-not-call, a new building or a dog to avoid. You see it on the dashboard.'],
])}</ul>
<h2>The Territory Map Card</h2><p>Every territory gets a card in the familiar printed format: locality name and number at the top, the territory shaded on the map with its boundary roads named, a QR code that opens it in Google Maps, and the card-care note in your language.</p>
<h2>Who makes the territories</h2><p>A brother makes them, as a service to help congregations that find it hard to make their own territories. It is not compulsory: use it only if your congregation needs the help.</p><ul>${li([
 ['A service, not a business', 'There is no fee and nothing is sold. Your data is never used for advertising or any commercial purpose.'],
 ['Your data is kept safe', 'Your boundary, names and cards are kept private. Only your congregation and the brother making them can open them.'],
 ['Try the manager for free', 'Anyone can open the demo of the territory manager, with no sign-in and nothing to install.'],
 ['Only if it helps', 'Keep your own way of working if it serves you well. Ask for all of it, or only the part you need.'],
])}</ul>
<h2>We can make your territories</h2><p>Territories from scratch, Territory Map Cards, or the complete package: from your KML file to the territories, a card for each, the territory manager set up and a full congregation map. There is no fee: we accept only voluntary donations.</p>
<h2>How we work with you</h2><ol>${li([
 ['You send the boundary', 'Send the KML file from Hub with the request form. That is all we need to start.'],
 ['We draw and split', 'We split the boundary into territories along the roads and email you as each stage is done.'],
 ['You name them on one link', 'Your congregation opens one private link. For each territory: write the locality name, check the landmarks and add notes. It saves as you type, with no sign-in.'],
 ['We make the cards, you check them', 'Your names go on every Territory Map Card with its QR code. Sign in with Google to check each card, comment or approve. Then we make the full map and you download everything.'],
])}</ol>
<h2>Questions and answers</h2><dl>${FAQ.mainEntity.map((q) => `<dt>${q.name}</dt><dd>${q.acceptedAnswer.text}</dd>`).join('')}</dl>
<p>Available in English, Malayalam, Kannada, Telugu, Hindi and Tamil. Independent and unofficial. <a href="https://congregationassistant.com/">Congregation Assistant</a></p></main>`;
const PAGES = {
 '/': { title: TITLE, description: DESCRIPTION, url: `https://${HOST}/`, jsonld: JSONLD, body: BODY },
};
const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
class SeoHead {
 constructor(page) { this.page = page; }
 element(head) {
  const { title, description, url, jsonld } = this.page;
  head.append(`<meta name="description" content="${escape(description)}"><meta name="keywords" content="${escape(KEYWORDS)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:site_name" content="Territory Assistant"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${url}"><meta property="og:image" content="https://${HOST}/app/assets/icon-512.png"><meta name="twitter:card" content="summary"><script type="application/ld+json">${jsonld.replace(/</g, '\\u003c')}</script>`, { html: true });
 }
}

