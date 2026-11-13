// generator.congregationassistant.com: the territory generator ("Territory Studio", repo territory-manager on GitHub Pages).
// It has its own origin on purpose: the owner's Supabase session lives on territory.congregationassistant.com, and
// code served here can never read it. Files come from the owner dashboard only by postMessage, checked on both sides.
// Deployed as the Cloudflare Worker "generator-site" with the custom domain generator.congregationassistant.com.
const UPSTREAM = 'https://photographicode.github.io/territory-manager';
const HOST = 'generator.congregationassistant.com';
// The generator reads OpenStreetMap roads from Overpass and draws maps from OpenStreetMap and OpenFreeMap tiles.
const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self' https://tiles.openfreemap.org https://overpass-api.de https://overpass.kumi.systems https://maps.mail.ru; worker-src 'self' blob:; child-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; upgrade-insecure-requests";

export default {
 async fetch(request) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') { url.protocol = 'https:'; return Response.redirect(url, 308); }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });
  const upstream = await fetch(UPSTREAM + url.pathname + url.search, { method: request.method, headers: { Accept: request.headers.get('Accept') || '*/*' }, redirect: 'manual' });
  const response = new Response(upstream.body, upstream);
  const headers = response.headers;
  const location = headers.get('Location');
  // Exact prefix with a slash, so only upstream's own redirects are rewritten.
  if (location && (location === UPSTREAM || location.startsWith(UPSTREAM + '/'))) headers.set('Location', `https://${HOST}${location.slice(UPSTREAM.length) || '/'}`);
  headers.set('Content-Security-Policy', policy);
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  // No opener policy: the dashboard opens this page and must keep its window handle to send a request's file.
  headers.delete('Cross-Origin-Opener-Policy');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  const contentType = headers.get('Content-Type') || '';
  headers.set('Cache-Control', /\/assets\/[\w.-]+-[\w-]{8,}\.(js|css|woff2|wasm)$/.test(url.pathname) ? 'public, max-age=31536000, immutable' : /html/.test(contentType) ? 'no-store' : 'public, max-age=3600');
  return response;
 }
};
