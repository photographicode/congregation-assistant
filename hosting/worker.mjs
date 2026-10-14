const policy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://ejosykrxjvwrhxfnputo.supabase.co wss://ejosykrxjvwrhxfnputo.supabase.co https://challenges.cloudflare.com; frame-src 'self' blob: https://challenges.cloudflare.com; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; upgrade-insecure-requests";
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') { url.protocol = 'https:'; return Response.redirect(url, 308); }
  if (url.hostname === 'www.congregationassistant.com') return Response.redirect('https://congregationassistant.com' + url.pathname + url.search, 308);
  if (env.APP_HOST === 'true' && url.pathname.startsWith('/v2/')) return Response.redirect(url.origin + url.pathname.slice(3) + url.search, 301);
  if (env.APP_HOST === 'true' && ['/index.html','/login.html'].includes(url.pathname)) return Response.redirect(url.origin + '/' + url.search, 301);
  const asset = await env.ASSETS.fetch(request);
  const response = new Response(asset.body, asset);
  const headers = response.headers;
  headers.set('Content-Security-Policy', env.APP_HOST === 'true' ? policy : policy.replace(" 'wasm-unsafe-eval'", ''));
  headers.set('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  headers.set('Cross-Origin-Opener-Policy','same-origin');
  headers.set('Cross-Origin-Resource-Policy','same-origin');
  if (env.APP_HOST === 'true') headers.set('X-Robots-Tag','noindex, nofollow');
  const contentType = headers.get('Content-Type') || '';
  headers.set('Cache-Control', /\/[\w.-]+-[\w-]{8,}\.(js|css|woff2|wasm)$/.test(url.pathname) ? 'public, max-age=31536000, immutable' : /html/.test(contentType) || /service-worker|manifest|version\.json/.test(url.pathname) ? 'no-store' : 'public, max-age=3600');
  return response;
 }
};
