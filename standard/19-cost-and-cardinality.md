# 19 · Cost and cardinality

> Every unique combination of label values is a new time series. Series drive memory, storage and cost.
> Most observability bills and outages of the monitoring system itself come from **one bad label**.

## How cardinality explodes

| Label | Values | Series for one histogram with 12 buckets × 5 routes × 3 status codes |
|---|---|---|
| none extra | – | 12 × 5 × 3 = 180 |
| `client_id` (3 clients) | 3 | 540 ✅ fine |
| `pod` (20 pods, churn on every deploy) | 20+ | 3,600+ ⚠️ watch it |
| `user_id` (100k users) | 100,000 | 18,000,000 ❌ never |
| raw URL `/orders/48213` | unbounded | ❌ never: use `http.route` |

Rule ⚠️: a label is OK for metrics if its values are **bounded and known** (tens, not thousands). Put IDs in traces and logs.

## Cardinality budget (per service)

| Item | Budget (starting point ⚠️) |
|---|---|
| Active series per service | ≤ 10,000 |
| Labels per metric | ≤ 10 |
| Values per label | ≤ 100 |
| New label on a shared metric | Needs review (PR to the standard) |

## Find what's expensive

<details>
<summary>Open-source variant (PromQL)</summary>

```promql
# Top 10 metrics by series count
topk(10, count by (__name__) ({__name__=~".+"}))

# Which label of a metric is exploding
count(count by (http_route) (http_server_request_duration_seconds_count))

# Series per job (who sends the most)
topk(10, count by (job) ({__name__=~".+"}))
```

</details>

```bash
# Prometheus TSDB stats: head series, top metric names and label pairs by series count
curl -s 'http://prometheus:9090/api/v1/status/tsdb?limit=20' | jq '.data.seriesCountByMetricName'
```

`{__name__=~".+"}` touches every series: run it on demand, not in dashboards.

## Reduce

| Where | How |
|---|---|
| In the app | Use `http.route`; don't add IDs as attributes on metrics; fewer histogram buckets |
| OTel Collector | `filter` processor (drop metrics), `transform` processor (drop or rewrite attributes), span metrics `aggregation_cardinality_limit` |
| Prometheus scrape | `metric_relabel_configs` with `action: drop` / `labeldrop` |
| Prometheus OTLP ingest | Promote only the resource attributes you need (`promote_resource_attributes`), don't use `promote_all_resource_attributes` |
| Traces | Tail sampling ([15](15-opentelemetry-practices.md#sampling)) |
| Logs | Drop debug logs in production at the collector; short retention for verbose streams |

```yaml
# Prometheus: drop a noisy metric and a high-cardinality label at scrape time
metric_relabel_configs:
  - source_labels: [__name__]
    regex: "go_gc_duration_seconds.*"
    action: drop
  - regex: "request_id"
    action: labeldrop
```

## Retention per signal (starting point ⚠️)

| Signal | Hot retention | Why |
|---|---|---|
| Metrics (raw) | 15–30 days | SLO windows (28–30d) need it |
| Metrics (downsampled / recording rules) | 13 months | Year-over-year comparisons |
| Traces | 7–14 days | Debugging recent incidents |
| Logs (app) | 14–30 days | Postmortems |
| Logs (audit / security) | Per compliance | Legal requirements |

## Make cost visible

| Practice | How |
|---|---|
| Cost per team | Series / GB ingested grouped by the `team` attribute ([20](20-ownership-and-communication.md)) |
| Alert on cardinality growth | `count({job="x"}) > 1.5 * count({job="x"} offset 1d)` ⚠️ |
| Review | Monthly, with the alert and SLO review |

## In Dynatrace

| Concern | Where to act |
|---|---|
| Cost driver | Metric data points (histogram = 10), log and trace GiB, retention, queries ([17](17-dynatrace-integration.md#cost-what-drives-the-bill-dps)) |
| Cardinality limit | ≤ 50 dimensions per data point; allow-list labels in the gateway ([16](16-collector-templates.md)) |
| Reduce before ingest | Gateway filters and transforms (your control point); OpenPipeline processing after ingest |
| Track usage | Billing usage metrics and the cost notebooks in Account Management, split by team via the `team` attribute |

## Sources

- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/): don't use labels for unbounded values 📚
- [Prometheus HTTP API: TSDB stats](https://prometheus.io/docs/prometheus/latest/querying/api/): `/api/v1/status/tsdb`, `seriesCountByMetricName`, `limit` ✅ 2026-11-20
- [Prometheus configuration: `metric_relabel_configs`, `otlp`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) ✅ 2026-11-20
- [Span metrics connector: `aggregation_cardinality_limit`](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md) ✅ 2026-11-20
