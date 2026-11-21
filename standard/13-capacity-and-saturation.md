# 13 · Capacity and saturation

> **In 30 seconds:** capacity is **demand vs supply**. Demand is traffic and its growth; supply is what a pod, node,
> database or queue *really* handles, found with **load tests**. Keep **headroom** for peaks and lost zones (N+2),
> watch **saturation** (the "S" in USE) on every resource that can run out, right-size requests, and alert on the
> **forecast** date when demand will cross capacity, weeks before it hurts. Not on "CPU is high".

## Demand vs supply

<div data-widget="viz" data-chart="capacity-forecast"></div>

| Side | What to know | How to get it |
|---|---|---|
| **Demand** | Peak requests/s, weekly pattern, growth per month, planned events (launches, campaigns: "inorganic" demand) | Request rate per service over 90+ days; product calendar |
| **Supply** | Requests/s one pod handles within the SLO; pods per node; DB connections and IOPS; queue throughput per consumer | **Load tests** (gradual and spike), repeated after big changes |
| **Headroom** | How much extra you keep for peaks, failures and deploys | Policy per tier (below) |

Google's SRE guidance: an accurate organic demand forecast, inorganic demand included, and **regular load tests that map raw resources to service capacity**. Past performance is not a capacity number: re-test after the system changes.

## Headroom policy (per tier ⚠️)

| Tier | Rule | Means |
|---|---|---|
| 1 | **N+2** at forecast peak | Peak served with the two largest instances (or one zone + one instance) gone: planned + unplanned outage at once |
| 2 | N+1 at forecast peak | One instance or zone may fail |
| 3 | Best effort, autoscale | Batch and tools can queue |

Example ⚠️: a pod handles 100 req/s within the SLO (load test); forecast peak is 1,200 req/s → N = 12; tier 1 → 14 pods minimum, spread over 3 zones.

## Saturation: what can run out

| Resource | Saturation signal | Source (OTel → Dynatrace) | Warning sign |
|---|---|---|---|
| CPU | Throttling (time a container wanted CPU but hit its limit) | cAdvisor via `prometheus` receiver; OneAgent | Throttling > 25% while latency rises |
| Memory | Working set vs limit; OOM kills | `kubeletstats` `k8s.container.memory_limit_utilization`; `k8s_cluster` OOM reason ([08](08-kubernetes-cluster.md)) | > 90% of limit, any OOMKilled |
| Pods per node / cluster | Pending pods; requests vs allocatable | `k8s_cluster` | Requests > 80% of allocatable |
| Autoscaler | Current = max replicas | `k8s.hpa.current_replicas` vs `k8s.hpa.max_replicas` | At max for > 15 min |
| Connection pools | Used vs max (DB, HTTP clients) | `db.client.connection.count` vs max (semconv, development) or app metric | > 80%, waits for a connection |
| Thread / worker pools | Busy vs total; queued work | Runtime metrics (.NET, JVM) | Queue of work items grows |
| Queues | Backlog, **oldest message age** | [06](06-workload-types.md#queues-and-async-processing) | Age grows while consumers are at max |
| Disk / volumes | Free space and its trend | `kubeletstats` `k8s.volume.available` | Forecast full < 2 weeks |
| Quotas and limits | Namespace quotas, IP addresses, cloud API rate limits, license limits | Quota objects; cloud metrics; 429 responses | > 80% of quota |
| External APIs | Rate limit headers / 429s | `http.client.request.duration` with status 429 ([06](06-workload-types.md#external-dependencies)) | 429 rate > 0 |

Rule: alert on **saturation that hurts users soon** (OOM, autoscaler at max with growing latency or backlog, disk full forecast); keep the rest on the capacity dashboard.

## Right-sizing

| Look at | Over-provisioned | Under-provisioned |
|---|---|---|
| CPU request vs p95 usage | Usage < 30% of request most of the time ⚠️ → cost | Usage > request → noisy neighbours, throttling if limited |
| Memory request/limit vs working set | Working set < 40% of limit ⚠️ → cost | Working set near limit → OOM |
| Replicas vs load | Many replicas idle at peak | HPA often at max |

Review per service monthly; the HPA's utilization target is computed **against requests**, so wrong requests make autoscaling wrong too.

## Autoscaling

| Scaler | Scale on | Watch |
|---|---|---|
| HPA (CPU/memory) | % of **requests** | Requests must be realistic; CPU lags behind traffic |
| HPA (custom/external metric) | Requests per pod, latency, queue length | Metric adapter must be healthy, or scaling stops |
| KEDA | Queue lag / backlog (Kafka, RabbitMQ, SQS, …) | `lagThreshold` meaning differs by KEDA version; max replicas ≤ partitions |
| Cluster autoscaler / node pools | Pending pods | Node provisioning time adds minutes |

Capacity alerts for autoscaled services: **at max replicas for 15 min AND (latency burn or backlog growing)**. At max alone is fine; at max while users suffer is a capacity incident.

## Forecasting in Dynatrace

Dynatrace's forecast analyzer (Davis / Dynatrace Intelligence) can run on a schedule in a **Workflow**: a DQL query feeds the generic forecast analysis, and a step raises a ticket only if the predicted value crosses the limit within the window. The docs' example forecasts disk usage weeks ahead; the same pattern works for request rate vs tested capacity, connection pools or quotas.

```text
// DQL shape: daily peak requests/s for checkout over 90 days, the input for a forecast
fetch spans, from:-90d
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries peak_rps = count() / 60, interval:1m
| summarize daily_peak = max(arrayMax(peak_rps)), by:{ day = bin(timestamp, 1d) }
```

Forecasts get wider the further they look ahead; plan on the **lower** confidence bound for "when do we run out".

## Capacity review (monthly, tier-1 services)

| Service | Peak (30d) | Tested capacity | Headroom policy | Forecast date crossing headroom | Action |
|---|---|---|---|---|---|
| checkout | 1,050 req/s | 1,400 req/s (14 pods) | N+2 | in 9 weeks | Load test 1.43, add a node pool in 6 weeks |

<div data-widget="viz" data-chart="capacity-tiles"></div>

## Common mistakes

| ❌ | ✅ |
|---|---|
| Alert on CPU > 80% | Alert on users hurting (burn rate) and on forecast exhaustion |
| Capacity = last quarter's peak | Capacity = load-tested throughput within the SLO |
| HPA on CPU with wrong requests | Fix requests first, or scale on requests per pod |
| One big load test before launch, never again | Repeat after big changes; compare with forecast |
| Ignoring quotas and rate limits | They are capacity too, and fail hard |

## Sources

- [Google SRE Book: Production services best practices (capacity planning, N+2)](https://sre.google/sre-book/service-best-practices/) · [Introduction (demand forecasting, load testing)](https://sre.google/sre-book/introduction/) · [Software engineering in SRE (intent-based capacity planning)](https://sre.google/sre-book/software-engineering-in-sre/) · [Handling overload](https://sre.google/sre-book/handling-overload/) ✅ 2026-11-20
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) (utilization against requests, behavior, tolerance) ✅ 2026-11-20
- [KEDA: Apache Kafka scaler](https://keda.sh/docs/2.21/scalers/apache-kafka/) (`lagThreshold`) ✅ 2026-11-20
- [Dynatrace: Forecast disk and resource utilization (Workflows)](https://docs.dynatrace.com/docs/dynatrace-intelligence/use-cases/dynatrace-intelligence-for-workflows) · [Predictive AI analysis](https://docs.dynatrace.com/docs/dynatrace-intelligence/reference/ai-models/forecast-analysis) ✅ 2026-11-20
- Headroom per tier, right-sizing percentages, review template: rules of thumb ⚠️
