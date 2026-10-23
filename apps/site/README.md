# Generated marketing website

`scripts/build-marketing-site.mjs` generates the public B/W website into `dist/site` using `site.css`, `site.js`, locale catalogues and content flags in this directory. `npm run build` copies that output to `dist-site`; `scripts/build-pages.mjs` assembles the canonical Pages artifact.

The old HTML, Android and downloadable-guide templates and duplicate root `site/` tree are retired. Installation and usage instructions are generated pages; the usage page offers a text download. The contact form opens the visitor's email app; server delivery and Turnstile are not active.

Verify generated output with `node scripts/site-audit.mjs` and `node scripts/site-audit-browser.mjs`. Design authority: `docs/SITE-DESIGN-LOCK.md`. Translation review and reference screenshot baselines remain open.
