// Browser origins are exact matches; originless server-to-server workers remain valid.
export const allowedOrigins = [
 'https://congregationassistant.com',
 'https://app.congregationassistant.com',
 'https://photographicode.github.io',
] as const;
export function acceptsOrigin(origin: string | null): boolean {
 return origin === null || allowedOrigins.some(allowed => allowed === origin);
}
