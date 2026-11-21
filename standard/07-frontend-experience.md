# 07 · Frontend and user experience

> Backend metrics say the API answered in 120 ms. The user may still have waited 4 s for the page.
> Measure **what the user's browser experienced** (real user monitoring), **whether key journeys work when nobody
> is using them** (synthetic monitoring), and **link both to backend traces**.

## How it fits together

<div data-widget="viz" data-chart="frontend-flow"></div>

| Method | Answers | Tool (Dynatrace backend) | Open-source alternative |
|---|---|---|---|
| **Real User Monitoring (RUM)** | What did real users experience, on which browser, country, page? | Dynatrace RUM JavaScript | Grafana Faro, OTel browser SDK (experimental) |
| **Synthetic monitoring** | Does login/checkout work right now, from outside, even at 3 a.m.? | Dynatrace synthetic monitors (browser clickpaths, HTTP) | k6, blackbox exporter, OTel `httpcheck` (internal only) |
| **Frontend → backend link** | Which backend call made this page slow? | W3C trace context from RUM to the OTel-instrumented backend | Faro + OTel traces |

OpenTelemetry has **no stable RUM specification** yet, and the browser SDK is **experimental**. If you send frontend data through plain OTel SDKs into Dynatrace, you lose RUM features (sessions, user actions, Core Web Vitals scoring, session replay). Dynatrace's recommended setup is **RUM JavaScript in the frontend + OpenTelemetry in the backend**, linked by W3C trace context.

## What to measure

### Core Web Vitals (Google's user-experience metrics)

| Metric | Measures | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Loading: when the main content appeared | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | Responsiveness: delay after a click or key press | ≤ 200 ms | 200–500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | Visual stability: content jumping around | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Judge each at the **75th percentile of real page visits** (3 of 4 visits must be "good"). INP replaced FID; tools that still show FID are outdated.

### Beyond Web Vitals

| Signal | Why | Typical SLI |
|---|---|---|
| JavaScript errors per session | Broken UI that the backend never sees | % of sessions without errors |
| Failed XHR/fetch calls (by endpoint) | Backend errors as the user saw them, incl. CORS and timeouts | % of successful requests from the browser |
| User action duration (click → done) | The real "it's slow" | % of key actions < 2 s |
| Journey / funnel completion | Business impact (login → cart → pay) | conversion rate per step |
| Apdex | One satisfaction score per app | Apdex ≥ 0.9 ⚠️ |
| Segment: browser, device, country, release | Problems hidden in averages | per-segment p75 |

### Frontend SLOs (examples ⚠️)

| SLO | Target |
|---|---|
| LCP ≤ 2.5 s for the checkout page | 75% of visits (Google's threshold), tighten to 90% if you can |
| Key user action "Pay" completes without error | 99.5% over 28 days |
| Synthetic checkout journey succeeds | 99.9% of runs, from 3 locations |

Alert on SLO burn, not on single slow page views ([11](11-alerting.md), [10](10-slos-and-error-budgets.md)).

## Synthetic monitoring

| Rule | Why |
|---|---|
| Script the **business journeys** (login, search, checkout), not only the home page | The home page is rarely what breaks |
| Run from **several locations** and alert when ≥ 2 fail ⚠️ | One location failing is often the location's network |
| Use **dedicated test accounts** and mark synthetic traffic (header / user agent) | Filter it out of real-user SLOs and business KPIs |
| Internal endpoints: OTel `httpcheck` in the cluster collector ([collector/cluster.yaml](../collector/)) | Cheap availability check for services without public UI |
| Low-traffic apps: synthetics are the only reliable SLI at night | Real traffic is too thin for ratios ([11 §3](11-alerting.md)) |

## Privacy and cost

| Topic | Practice |
|---|---|
| Personal data | Mask user input, IP addresses and URLs with IDs; session replay masked by default |
| Consent | Respect the cookie/consent banner (opt-in mode in the RUM agent) |
| Cost | RUM is billed per session (session replay costs more); sample sessions for high-traffic sites |
| Sampling | Keep 100% of sessions with errors if your tool allows it |

## Sources

- [web.dev: Web Vitals](https://web.dev/articles/vitals) · [How the thresholds were defined](https://web.dev/articles/defining-core-web-vitals-thresholds) · [INP](https://web.dev/articles/inp): LCP/INP/CLS thresholds, 75th percentile ✅ 2026-11-20
- [Dynatrace: OpenTelemetry and Dynatrace](https://docs.dynatrace.com/docs/ingest-from/opentelemetry): no stable OTel RUM spec; RUM JS + OTel backend linked by W3C trace context ✅ 2026-11-20
- [Dynatrace: Real User Monitoring](https://docs.dynatrace.com/docs/observe/digital-experience/rum) · [Experience Vitals](https://docs.dynatrace.com/docs/observe/digital-experience/new-rum-experience/experience-vitals) ✅ 2026-11-20
- [OpenTelemetry JS: Browser](https://opentelemetry.io/docs/languages/js/getting-started/browser/): experimental ✅ 2026-11-20
- [Grafana Faro](https://grafana.com/oss/faro/) (open-source alternative) ✅ 2026-11-20
- SLO targets, synthetic location rule, Apdex target: rules of thumb ⚠️
