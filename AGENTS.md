# Congregation Assistant

Preserve the legacy app until V2 release gates are green. New app code lives in apps/web/src/v2, shared UI in packages/ui and public website in apps/site. Run npm test, npm run check:v2 and npm run build:v2 before submitting. Do not apply SQL to production automatically. Never enable E2EE claims without the complete sentinel and device lifecycle suite. No secrets or real congregation records in fixtures.
