# Android distribution

The PWA is the free default. Chrome on Android can install a WebAPK; browser and device support varies, so use the install event when available and show browser instructions otherwise. Samsung Internet wording varies. Firefox may provide an Add to Home Screen shortcut rather than Chrome's WebAPK behavior.

| Option | Requirements | Distribution |
|---|---|---|
| PWA | HTTPS, valid manifest, appropriate icons and service worker | Browser install; no developer fee |
| Signed TWA APK/AAB | Bubblewrap/PWABuilder, owner signing keystore, verified app origin and Digital Asset Links | APK sideload; AAB intended for an app store |
| Google Play | Developer account, one-time fee (currently $25), applicable account/testing eligibility and policies | Owner-controlled publication |

For qualifying new personal developer accounts, Google's closed-test requirement is generally at least 12 opted-in testers for 14 consecutive days before applying for production access. Verify the owner's actual account requirements and current policy before publication. Keep website billing outside the store-distributed app unless the payment integration has been reviewed for the applicable Google Play rules.

Owner steps: verify HTTPS/manifest/install behavior; generate and retain an owner-controlled keystore; configure GitHub signing secrets; build and verify an APK/AAB; add the package and exact SHA-256 signing certificate fingerprint to `/.well-known/assetlinks.json`; test origin association; publish the signed artifacts to a verified release. On sideload, allow Install unknown apps only for the downloading browser and turn it off after installation.

Current status: signed packaging workflow and real release artifacts are not ready. No dummy APK download is shown. Maskable safe-zone icons, manifest screenshots and physical device install checks remain release gates. On iOS, use Safari Share → Add to Home Screen; installed-web-app push requires a supported version (16.4+) and an active configured sender. Installation does not establish delivery.
