# Public V3 checkpoint

Both repositories are merged and live. See [the complete deployment record](V3-PROGRESS.md#verified-deployment-result--17-october-2026) and [the incomplete-scope report](CUTOVER-REPORT.md).

[Website](https://photographicode.github.io/Congregation-Assistant_Public/) · [App demo](https://photographicode.github.io/Congregation-Assistant_Public/app/?demo=admin) · [Source app mirror](https://photographicode.github.io/congregation-assistant/app/?demo=admin)

Verified live on both origins: the source commit in deployment.json, app service-worker control, manifest scope/start URL, no console/page errors, no demo cloud calls, zero assistant parsing requests, and preservation of other apps' caches. Source/public deployment runs: 39040915431 and 39041017472.

This is a checkpoint, not full V3 completion. The original production migration rejection was resolved by an accepted narrower migration; official publication fetching returned HTTP 400; DNS is not confirmed. The remaining feature and acceptance work is listed in the cutover report. The supplied nine-theme CSS remains byte-identical.
