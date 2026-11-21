# 14 · Dashboards

> **In 30 seconds:** a dashboard set is a **hierarchy you click down** (overview → service → component → explore),
> built from **one template per level**, kept as code. Inside each dashboard, the question picks the tile: one
> number → stat tile; trend → line; distribution → heatmap; parts of a whole → segmented bar, never a pie.
> Never show a percentage without its volume. All charts on this page use example data.

## Part A · Structure

### The four levels

<div data-widget="viz" data-chart="dash-hierarchy"></div>

| Level | Question | Audience | Content | Links to |
|---|---|---|---|---|
| **L0 · Overview** | Which service is unhealthy right now? | On-call, leadership | One row per service: SLO status, budget left, burn rate, traffic. Worst first | L1 with `service` set |
| **L1 · Service** | What is wrong, for whom, since which change? | On-call, service team | The service template: SLO → RED → per client → per version → saturation | L2 |
| **L2 · Component** | Which part is the cause? | Service and platform teams | Pods/containers, database, queue, external API, collector health | L3 |
| **L3 · Explore** | Why exactly? | Whoever is debugging | Traces, logs, profiles (Dynatrace Notebooks, Distributed Tracing, Logs) | – |

Rules ⚠️: L0 fits on one screen; **L1 is one template with a `service` variable** for every service; every alert links to L1 with the variables filled in.

### Dashboards by audience

| Audience | Dashboard | Refresh | Time range |
|---|---|---|---|
| Leadership / business | Business KPIs + SLO summary per product | 5–15 min | 7–30 days |
| On-call | L0 + L1 | 30 s–1 min | 1–6 h |
| Service team | L1 + L2 for their service | 1 min | 6 h–7 days |
| Platform team | Cluster, collectors, ingest cost | 1 min | 1–7 days |
| Delivery | DORA tiles + deployments ([12](12-releases-and-dora.md)) | 1 h | 30–90 days |

### Naming and ownership

| Convention | Example | Why |
|---|---|---|
| Title = `scope · level` | `checkout · Service`, `payments · Overview` | Searchable, sorts well |
| Owner and team in the dashboard | Owner: payments | Someone answers questions |
| Templates in Git, deployed by Monaco | `templates/dashboard-service.json` ([18](18-automation-and-scale.md)) | No hand-made copies |
| Unused dashboards archived after 90 days ⚠️ | – | The list stays usable |

Maturity (Grafana's model, applies to any tool): **low** = hand-made copies; **medium** = templates, variables, hierarchical drill-downs; **high** = dashboards as code, provisioned by CI, usage tracked.

## Part B · Inside a dashboard

### The question → the tile

| The reader must… | Use | Avoid |
|---|---|---|
| Know one current value ("are we OK?") | **Stat tile** (value + delta + sparkline) | A one-bar chart, a gauge dial |
| See a value against a limit | **Meter** | A pie with 2 slices |
| Compare that ratio across services/clients | **Meter list** | A gauge per row |
| Follow a trend | **Line** (area for one series) | Bars for long time ranges |
| Compare two measures with different units | **Two charts stacked on one time axis** | **A second y-axis** |
| See a distribution over time (latency) | **Heatmap**, one hue | Average line alone |
| See states over time (alert firing, pod phase) | **State timeline** | Lines jumping 0↔1 |
| Rank many entities | **Table**, colored cells, worst first | Pie or donut |
| See how one whole splits | **Segmented bar** (≤ 6 parts) | Pie with tiny slices |
| Compare before → after | **Dumbbell** | Two separate charts |

### 1 · Stat tiles: the first row

<div data-widget="viz" data-chart="kpi-tiles"></div>

Volume tile next to the percentage tiles; deltas against a **named** period; color only for state, always with an icon or word.

### 2 · Two measures, one time axis

<div data-widget="viz" data-chart="red-stack"></div>

Hover one chart and the crosshair follows on both. Never put them on one chart with two y-axes: how the scales line up is arbitrary and invents correlations.

### 3 · Latency: a heatmap shows what an average hides

<div data-widget="viz" data-chart="latency-heatmap"></div>

### 4 · Ratios against a limit: meter list

<div data-widget="viz" data-chart="client-meters"></div>

### 5 · Parts of a whole: segmented bar, not a pie

<div data-widget="viz" data-chart="traffic-share"></div>

### 6 · States over time: state timeline

<div data-widget="viz" data-chart="state-timeline"></div>

### The L1 service template (tile list)

| Row | Tiles | Question |
|---|---|---|
| SLO status | Availability (28d), budget left, burn rate (1h), requests | Are we OK? |
| RED | Requests and error % stacked on one time axis; latency distribution + p99 | What changed and when? |
| Per client | Table: requests · errors · error % · p95, worst first | Who is affected? |
| Per version | Error % by `service.version`; traffic share by version; deployment events overlaid | Did a release cause it? |
| Saturation | Memory vs limit, CPU vs request, throttling, active requests | Why? |
| Drill-down | Links to traces and logs filtered by `service.name` | Root cause |

Build it once in Dynatrace Dashboards with a DQL **`service` variable** (every tile filters `service.name == $service`), then export it with `monaco download` and keep it as the template.

### Rules for every tile

| Rule | Why |
|---|---|
| One y-axis per chart | Two scales invent correlations |
| Units on every value (`s`, `req/s`, `%`) | Unitless numbers get misread |
| Normalize (percent of limit, per second) | Pods and hosts differ in size |
| Thin lines, light grid, no 3D, no gradients | The data is the only loud thing |
| Legend for 2+ series, direct label on the one that matters | Identity never by color alone |
| ≤ ~6 colors per chart; color follows the entity | Readable, stable across filters |
| Status colors only for state, with icon/word; avoid red–green as the only difference | Accessibility |
| Deployment events overlaid on time series | Connects changes to symptoms |

<details>
<summary>Open-source variant (Grafana)</summary>

The same L1 template as Grafana JSON, generated and import-tested: [dashboards/](../dashboards/) (`service-red.json`, 19 panels, variables `service`, `namespace`, `slo`, deploy annotations).

</details>

## Sources

- [Dynatrace: Dashboards](https://docs.dynatrace.com/docs/analyze-explore-automate/dashboards-and-notebooks/dashboards-new) · [Dashboard variables](https://docs.dynatrace.com/docs/analyze-explore-automate/dashboards-and-notebooks/dashboards-new/components/dashboard-component-variable) ✅ 2026-11-20
- [Dynatrace: Monaco](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/monaco-getting-started) ✅ 2026-11-20
- [Grafana: Dashboard best practices / maturity levels](https://grafana.com/docs/grafana/latest/best-practices/dashboard-management-maturity-levels/) · [Visualizations](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) ✅ 2026-11-20
- Chart rules: data-visualization method used to build this page (colorblind-validated palette) ⚠️
- Level names, audience table, archive rule: rules of thumb ⚠️
