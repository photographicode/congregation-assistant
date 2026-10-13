# Public website V2

Source template fetched from photographicode/Congregation-Assistant_Public on 2026-10-13. Assets and guide retained; rebuilt index uses the shared UI tokens, fictional device frame, capability cards, delivery comparison, honest privacy status, request wizard, INR price with USD quote disclosure, and install guide.

Build with `npm run build:v2` from repository root. Output is `dist/site/` and shares `dist/assets/fonts` and `dist/capabilities.json`. When publishing standalone at the apex, adjust sibling paths to the configured APP_URL, publish shared fonts/catalogue at their referenced locations, and verify links; the app's preview path is supported directly.

Requests wrap the existing approved request RPC and persist versioned choices for newly created requests. A duplicate pending request is acknowledged without allowing an anonymous caller to overwrite its existing choices. Private selections record interest only.
