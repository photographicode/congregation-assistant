// territory.congregationassistant.com: serves the territory manager at the site root, from the same published
// app as congregationassistant.com/app/, with the same security headers as hosting/worker.mjs.
// Deployed as the Cloudflare Worker "territory-site" with the custom domain territory.congregationassistant.com.
const ORIGIN = 'https://congregationassistant.com';
const HOST = 'territory.congregationassistant.com';
const GENERATOR_HOST = 'generator.congregationassistant.com';
// Same policy as the app's index.html meta tag, plus frame-ancestors, which only works as a header.
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://ejosykrxjvwrhxfnputo.supabase.co wss://ejosykrxjvwrhxfnputo.supabase.co; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests";

export default {
 async fetch(request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') { url.protocol = 'https:'; return Response.redirect(url, 308); }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  // Search engines: the landing page is indexable; robots.txt and the sitemap list only it.
  if (url.pathname === '/robots.txt') return new Response(`User-agent: *
Allow: /$
Disallow: /?
Sitemap: https://${HOST}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  if (url.pathname === '/sitemap.xml') return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${HOST}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
  // The generator moved to its own origin so it can never read the owner's session here; keep old links working.
  if (url.pathname === '/generator' || url.pathname.startsWith('/generator/')) return Response.redirect(`https://${GENERATOR_HOST}${url.pathname.slice('/generator'.length) || '/'}${url.search}`, 301);
  // The site root is the territory manager; everything else (assets, manifests, the service worker) is the app's own path.
  const path = url.pathname === '/' || url.pathname === '/index.html' ? '/app/' : url.pathname;
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
  // allow-popups keeps the link to the generator window this site opens, so a request's file can be handed over.
  headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  // Same caching as hosting/worker.mjs: hashed assets forever, pages and the service worker never from a shared cache.
  const contentType = headers.get('Content-Type') || '';
  headers.set('Cache-Control', /\/[\w.-]+-[\w-]{8,}\.(js|css|woff2|wasm)$/.test(url.pathname) ? 'public, max-age=31536000, immutable' : /html/.test(contentType) || /service-worker|manifest|version\.json/.test(url.pathname) ? 'no-store' : 'public, max-age=3600');
  // Only the bare landing page is indexed; app screens (any query string) and files stay out of search.
  const landing = path === '/app/' && !url.search;
  if (!landing) { headers.set('X-Robots-Tag', 'noindex, nofollow'); return response; }
  // The app's own noindex tag would override ours (Google obeys the stricter one), so drop it here.
  return new HTMLRewriter().on('meta[name="robots"]', { element(meta) { meta.remove(); } }).on('head', new SeoHead()).on('title', { element(title) { title.setInnerContent(TITLE); } }).transform(response);
 }
};

const TITLE = 'Territory manager and territory cards for Jehovah’s Witnesses congregations · Congregation Assistant';
const DESCRIPTION = 'Keep every congregation territory in one place: assign and return territory cards, keep the S-13 record and share each map with a QR code. We also make territories for you, from your boundary KML file to printed Territory Map Cards and a full named map. Available in all Indian languages.';
const KEYWORDS = 'territory, territory manager, territory card, territory map card, territory maker, congregation territory, Jehovah’s Witnesses, Jehovah’s Witnesses territory, JW territory, S-13, territory assignment record, congregation, KML territory map, QR code territory map, KML file splitter, KML territory splitter, split KML into territories, KML to territory cards, Google My Maps territory, territory map maker, territory QR code, printable territory cards, territory card generator, territory assignment, territory tracker, territory records app, Jehovah’s Witnesses territory cards, JW territory map, JW territory app, field service territory, congregation territory map, territory boundaries, door to door territory, India congregations, Malayalam, Hindi, Tamil, Telugu, Kannada';
const JSONLD = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
 { '@type': 'SoftwareApplication', name: 'Territory manager · Congregation Assistant', url: `https://${HOST}/`, applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS', description: DESCRIPTION, inLanguage: ['en', 'ml', 'kn', 'te', 'hi', 'ta'] },
 { '@type': 'Service', name: 'Territory map cards and territory making', serviceType: 'Territory maker', provider: { '@type': 'Organization', name: 'Congregation Assistant', url: 'https://congregationassistant.com/' }, areaServed: 'IN', description: 'From the congregation boundary (KML) to territories, a Territory Map Card for each with a QR code to Google Maps, and a high-resolution full map with every territory number.' },
] });
const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
class SeoHead {
 element(head) {
  head.append(`<meta name="description" content="${escape(DESCRIPTION)}"><meta name="keywords" content="${escape(KEYWORDS)}"><meta name="robots" content="index, follow"><link rel="canonical" href="https://${HOST}/"><meta property="og:type" content="website"><meta property="og:title" content="${escape(TITLE)}"><meta property="og:description" content="${escape(DESCRIPTION)}"><meta property="og:url" content="https://${HOST}/"><meta name="twitter:card" content="summary"><script type="application/ld+json">${JSONLD.replace(/</g, '\u003c')}</script>`, { html: true });
 }
}

