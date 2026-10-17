# GoDaddy cutover for congregationassistant.com

The public snapshot repository, `Congregation-Assistant_Public`, should own the custom domain. The source repository's Pages URL remains a separate preview. Do not assign the same custom domain to both GitHub Pages projects.

1. In GitHub account settings, verify domain ownership using the TXT record GitHub provides. Do not invent that verification token.
2. In GoDaddy DNS, point the apex to GitHub Pages using the current A/AAAA records in [GitHub's apex-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site#configuring-an-apex-domain). Point `www` to `photographicode.github.io` if using that alias. Preserve existing mail MX/TXT records. Remove only conflicting web records after reviewing their purpose.
3. Confirm the resulting DNS records with the owner. The resume orders explicitly require this before CNAME is added; no CNAME is currently published.
4. Rebuild the public snapshot with `CA_PAGES_URL=https://congregationassistant.com node scripts/build-pages.mjs` from the source checkout, then publish that artifact to the public repository with `CNAME` containing only `congregationassistant.com`. A rebuild is essential: the project-path preview assets, manifest and service-worker scope must change to the custom-domain paths. The app will be at `https://congregationassistant.com/app/`.
5. Set the public repository's Pages custom domain to that hostname and enable HTTPS when GitHub offers it. Verify the certificate before distributing links.
6. Add `https://congregationassistant.com/app/` to the intended Supabase authentication redirect allowlist. Confirm existing Google OAuth configuration still uses the correct Supabase project callback. Test an approved account and a rejected account; the fictional demo cannot verify real login.
7. Run `CA_LIVE_URL=https://congregationassistant.com/ node scripts/check-pages-deploy.cjs` with the expected source commit. Verify public forms, copied links and QR URLs after the cutover; links previously distributed on the preview host do not automatically become custom-domain links.

No GoDaddy account/DNS mutation tool is connected in this session. Domain purchase alone does not prove the records are configured. The custom-domain deployment remains a separate owner-confirmed step.
