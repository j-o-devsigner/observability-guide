# 17 · Dynatrace platform: OneAgent, ActiveGate and OpenTelemetry

> **In 30 seconds:** OpenTelemetry **collects** (one pipeline, standard names, masking and filtering in your gateway);
> Dynatrace **stores, analyzes and alerts** (Grail, Davis, SLOs, Workflows). Keep OneAgent where its automatic depth is
> worth the price; send everything else through the OTel collectors to Dynatrace, where **you decide what is sent and
> paid for**. Lab results quoted here come from the aks-observability comparison (two identical clusters, 2026-10).

## The architecture

<div data-widget="viz" data-chart="dt-architecture"></div>

| Component | Role | Where it runs |
|---|---|---|
| **OTel agent** (DaemonSet) | Container logs, kubelet stats, OTLP from local pods; disk buffer | Every node ([16](16-collector-templates.md)) |
| **OTel cluster collector** | Kubernetes state, events, internal synthetic checks | 1 replica |
| **OTel gateway** | Identity, masking, label allow-list, filtering, delta, **export to Dynatrace** | 2+ replicas |
| **ActiveGate** (in-cluster, via Dynatrace Operator) | Kubernetes API monitoring; routes OneAgent traffic; optional OTLP endpoint inside the cluster | DynaKube |
| **OneAgent code module** (optional) | Automatic deep traces and code-level detail for selected tier-1 services | Injected by the Operator |
| **Dynatrace** | Grail (metrics, logs, traces, events), Davis problems, SLOs, dashboards, Workflows | SaaS |

The gateway exports straight to the tenant (`https://<tenant>.live.dynatrace.com/api/v2/otlp`, as in the lab) or to the in-cluster ActiveGate. A **second backend** (e.g. an open-source stack) is one more exporter in the gateway: [collector/gateway-fanout.yaml](../collector/).

## OneAgent path vs OpenTelemetry path

<div data-widget="viz" data-chart="dt-paths"></div>

| | OneAgent | OpenTelemetry → Dynatrace |
|---|---|---|
| What you get | Automatic deep traces, code-level hotspots, Smartscape topology, Davis root cause | Exactly what your instrumentation and collectors send (standard names, any language) |
| Effort | Almost none (Operator + annotations) | Instrumentation (Operator), collector config, enrichment |
| Control of volume | Low (adaptive traffic management) | **High**: filter, drop labels, sample, mask in the gateway |
| Billing driver (DPS) | Full-Stack: memory GiB-hours (trace and metric allowance included) | Metrics per data point; traces and logs per GiB; **no Kubernetes pod-hours** without a Dynatrace agent |
| Portability | Dynatrace only | Same data can go to any backend |
| Best for | Tier-1 services where code-level detail pays off | Everything else; the default |

## Decide per workload

| Workload | Recommendation | Why |
|---|---|---|
| Tier-1, customer-facing, hard to debug | OTel auto-instrumentation (default) **or** OneAgent code module if you need code-level hotspots | Depth where incidents cost money |
| Tier-2 / internal services | OTel auto-instrumentation → gateway → Dynatrace | Cheaper, portable, same names everywhere |
| Batch / cron jobs | OTel metrics (last success, duration) | Short-lived pods; agents add little |
| Cluster and nodes | OTel `k8s_cluster` + `kubeletstats` ([08](08-kubernetes-cluster.md)) + ActiveGate Kubernetes monitoring | Coverage with OTel; Kubernetes app experience from the ActiveGate |
| Prometheus exporters (DB, queue, ingress) | Scrape with the **OTel Collector** and send to Dynatrace | Dynatrace recommends it over ActiveGate scraping at scale (limits: 1,000 exporter pods, 1,000 metrics per pod) |
| Logs | **One** collector per log stream: OTel `filelog` **or** the OneAgent log module | Two collectors = double cost and duplicates |
| Never | OneAgent code module **and** OTel auto-instrumentation on the same service | Duplicate spans; shared runtime profiler slot (.NET) |

## Rules for sending OpenTelemetry to Dynatrace

Templates that apply all of these: [collector/gateway.yaml](../collector/) ([16](16-collector-templates.md)).

| Rule | Detail | Source |
|---|---|---|
| Delta temporality | `cumulative_to_delta` in one gateway hop; each series must reach the same gateway replica | Dynatrace docs ✅ |
| Endpoint | SaaS `https://<tenant>.live.dynatrace.com/api/v2/otlp` (lab) or ActiveGate `https://<ag>:9999/e/<env-id>/api/v2/otlp`; signals under `/v1/traces`, `/v1/metrics`, `/v1/logs` | Dynatrace docs ✅ + lab |
| Token scopes | Classic: `metrics.ingest`, `logs.ingest`, `openTelemetryTrace.ingest`; platform token: `openpipeline:*:ingest` | Dynatrace docs ✅ |
| ≤ 50 dimensions per data point | Above it the whole point is dropped: allow-list labels | Dynatrace docs ✅ + lab |
| ≤ 4 MB per request, protobuf | Cap batches in bytes; JSON was rejected (415) in the lab | Lab |
| Topology enrichment | Set `k8s.*` and host resource attributes so data links to Smartscape | Dynatrace docs ✅ |
| No duplicates | Don't enable the OneAgent OpenTelemetry Span Sensor on a service that also exports OTLP | Dynatrace docs ✅ |

## Cost: what drives the bill (DPS)

| Capability | Unit | Notes |
|---|---|---|
| Full-Stack Monitoring | memory GiB-hour | Includes trace volume (200 KiB/min per GiB) and a metric data-point allowance |
| Infrastructure Monitoring | host-hour | Host, process, network, logs; no code-level |
| Foundation & Discovery | host-hour, lowest tier | Basic health, discovery, topology; no custom metrics |
| Kubernetes Platform Monitoring | **pod-hour** (list $0.002) | Pods on Full-Stack hosts are covered by Full-Stack. **Pure OTel setups consume no pod-hours** |
| Metrics – Ingest & Process | per 100,000 data points | **A histogram data point counts as 10**; gauges and counters as 1 |
| Traces – Ingest & Process | per GiB | 10 days retention included |
| Logs | per GiB ingested + retain + query | – |

| Cost lever (in the gateway) | Saves |
|---|---|
| Send only the histograms you use for percentiles | Each histogram = 10 data points |
| Label allow-list (also keeps you under 50 dimensions) | Series and dropped points |
| Tail sampling: all errors and slow traces + a share of the rest | Trace GiB |
| Drop health-check spans and debug logs | Trace and log GiB |
| One log collector per stream | Log GiB |

List prices are Dynatrace's documentation examples; your rate card decides. Track usage with the billing metrics and cost notebooks. More levers: [19](19-cost-and-cardinality.md).

## How an SRE uses it

<div data-widget="viz" data-chart="sre-flow"></div>

| Question during an incident | Look in |
|---|---|
| Which service is burning its SLO? | L0 overview dashboard, SLO app |
| Which client / version is affected? | L1 service dashboard: per client, per `service.version` (OTel attributes) |
| What else broke? Root cause across topology? | Problems app (Davis grouping), Smartscape |
| Pod OOM, restarts, node pressure | Davis problems (OOM in ~1 min in the lab) |
| Which hop or method is slow? | Distributed traces; code-level where OneAgent runs |
| What did the logs say? | Logs filtered by `trace_id` / service |

**Alerting rule:** every symptom has **one** alert source: SLO burn rate, per-client, release regression and business alerts as custom alerts; infrastructure anomalies from Davis. Workflows route each problem to the owning team, so one incident means one page ([11](11-alerting.md)).

## What the lab measured (aks-observability, 2026-10)

| Topic | OpenTelemetry | Dynatrace OneAgent |
|---|---|---|
| OOM kill | Data present (`OOMKilled`, restarts), no alert until rules were written | Problem in **1 min**, no setup |
| +200 ms on PostgreSQL | DB latency metric **names the dependency** | Symptom visible, no DB latency metric without traces; no problem raised |
| RabbitMQ down 2 min | 5xx 86–100% visible | Failure rate 58–91% visible; no problem raised |
| Per-route metrics | `http.route` by default | `NON_KEY_REQUESTS` until key requests are configured |
| Log loss during a 10-min backend cut | 0% after resilience settings (83% before) | 0% |
| Series churn on container restart | 18 new series (with label allow-list) | 0 |
| Pipeline / ActiveGate cut-off detected | 4–11 min (collector self-monitoring alerts) | ~24 min ("Monitoring not available") |

One lab on a trial tenant: Davis may behave differently after a longer learning period.

## Moving from OneAgent to OpenTelemetry (Dynatrace stays the backend)

| Step | Done when |
|---|---|
| 1. Deploy the three collector tiers; send OTel data **alongside** OneAgent | Same RED numbers from both for one service |
| 2. Decide per workload (table above); keep OneAgent code modules only where code-level depth is needed | Workload list with owner and path |
| 3. Move Prometheus-exporter scraping to the collector | ActiveGate scraping off, no gaps |
| 4. One log path per stream | No duplicate log lines |
| 5. Rebuild alerts on OTel data (custom alerts, SLOs); keep Davis for infrastructure | Each alert fired once in a chaos test |
| 6. Remove OneAgent where replaced; keep the ActiveGate for Kubernetes monitoring | Cost per signal per team visible for 30 days |

Use the [transition plan](../framework/transition-plan.md) phases (shadow, then cutover) for each step.

## Sources

- [Dynatrace: OTLP API endpoints](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api) · [Telemetry ingest on Kubernetes](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/extend-observability-k8s/telemetry-ingest) ✅ 2026-11-20
- [Dynatrace: OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector) · [configuration](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/configuration) ✅ 2026-11-20
- [Dynatrace: Monitor Prometheus metrics](https://docs.dynatrace.com/docs/observe/infrastructure-observability/container-platform-monitoring/kubernetes-monitoring/monitor-prometheus-metrics) ✅ 2026-11-20
- [Dynatrace: OneAgent with OpenTelemetry data](https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/oneagent-and-opentelemetry/oneagent-otel) ✅ 2026-11-20
- [Dynatrace: DynaKube modes](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/reference/code-modules-delivery-modes) · [host monitoring](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/how-it-works/other-deployment-modes/host-monitoring) ✅ 2026-11-20
- [Dynatrace: Kubernetes Platform Monitoring](https://docs.dynatrace.com/docs/license/capabilities/container-monitoring/kubernetes-platform-monitoring) · [Host monitoring modes](https://docs.dynatrace.com/docs/license/capabilities/host-monitoring) · [Foundation & Discovery](https://docs.dynatrace.com/docs/license/capabilities/app-infra-observability/foundation-and-discovery) ✅ 2026-11-20
- [Dynatrace: OpenTelemetry licensing](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/opentelemetry-licensing) · [Metrics consumption](https://docs.dynatrace.com/docs/license/capabilities/telemetry/dps-metrics) · [Traces ingest](https://docs.dynatrace.com/docs/license/capabilities/traces/dps-traces-ingest) ✅ 2026-11-20
- Lab: `~/projects/aks-observability/results/` ✅ measured
- Per-workload recommendations, migration steps: rules of thumb ⚠️
