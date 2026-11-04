// Browser origins are exact matches; originless server-to-server workers remain valid.
export const allowedOrigins = [
 'https://congregationassistant.com',
 'https://app.congregationassistant.com',
 'https://photographicode.github.io',
] as const;
export function acceptsOrigin(origin: string | null): boolean {
 return origin === null || allowedOrigins.some(allowed => allowed === origin);
}
// Browser-called functions answer only an accepted origin, never "*".
export function corsHeaders(origin: string | null): Record<string, string> {
 return origin && acceptsOrigin(origin) ? {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
 } : {};
}
