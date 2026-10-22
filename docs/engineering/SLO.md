# Proposed service objectives

Targets, not measured promises: monthly application availability 99.5%; p95 authenticated API latency under 500 ms; unexpected request error rate under 1%. Provider outages, offline clients and planned maintenance are reported separately rather than hidden from the measurements.

The availability error budget is 0.5% of the measurement window. Exhaustion freezes releases except recovery/security fixes. An OWNER-configured monitor must check the canonical website, native app and provider health independently. No monitoring account or alert delivery is claimed configured by this document.

Recovery targets are RTO 4 hours and RPO 24 hours, contingent on verified encrypted backups and a completed restore drill. Record actual drill times and recovered counts before asserting those targets are met. Latency/load tests run against staging with fictional data, never production publisher records.
