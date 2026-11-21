# 06 · Workload types: queues, batch jobs, external dependencies

> RED fits request/response services. Other workloads need different signals: for a queue, "how far behind";
> for a batch job, "did it succeed recently"; for a third-party API, "how is *it* treating us".

## Pick the model

| Workload | Key question | Core signals | Alert type |
|---|---|---|---|
| Request/response API | Are requests served correctly and fast? | RED ([04](04-endpoint-coverage.md)) | SLO burn rate |
| **Queue consumer** (Kafka, RabbitMQ, SQS) | Are we keeping up? | Lag, age of oldest message, processing errors, processing duration | Lag/age over threshold, DLQ count |
| **Batch / cron job** | Did it run, succeed, and finish in time? | Last success timestamp, duration, failures | "No success in 2 intervals", count of failures |
| **External dependency** (payment provider, SaaS API) | Is the provider failing us? | Client-side RED by `server.address`, timeouts, circuit-breaker state | Ratio + min count; synthetic checks |
| **Data pipeline** | Is the data fresh and correct? | Freshness (data age), row counts, validation failures | Freshness SLO |

## Queues and async processing

### The queue model: why a backlog grows

<div data-widget="viz" data-chart="queue-flow"></div>

| Quantity | Meaning |
|---|---|
| **Arrival rate** (λ) | Messages produced per second |
| **Processing rate** (μ) | Messages the consumers finish per second (consumers × rate per consumer) |
| **Backlog** (L) | Messages waiting. Grows whenever λ > μ, by (λ − μ) per second |
| **Wait time** (W) | How late the work is |

**Little's law:** in steady state, L = λ × W, so **W ≈ backlog / processing rate**. 60,000 waiting messages at 500 msg/s processed = 2 minutes late. That is why **oldest-message age** (or end-to-end delay) is the SLI users feel, and lag in messages is only its cause: the same lag means seconds at peak throughput and hours when consumers are slow.

### Signals

| Signal | Source | Why |
|---|---|---|
| Arrival rate | Producer spans / `messaging.client.sent.messages`, broker metrics | Demand |
| Processing rate | `messaging.client.consumed.messages`, `messaging.process.duration` (OTel semconv, development) | Supply |
| **Oldest message age** / end-to-end delay | Broker metric (e.g. SQS age of oldest message), or now − produce timestamp on the consumer span | **The SLI** |
| Backlog / lag | Broker or kafka-exporter (`kafka_consumergroup_lag`), **per partition** | Cause; capacity planning |
| Processing errors and retries | Consumer spans with `error.type`, retry counter | Poison messages, flaky dependencies |
| Dead-letter queue | DLQ depth / messages added | Every DLQ message is a failed promise → **count alert** |
| Consumer utilization | Busy time / total, consumers vs max | At max = capacity limit ([13](13-capacity-and-saturation.md)) |

### Problems you only find per partition, per group, per message

| Problem | Symptom | Measure |
|---|---|---|
| **Partition skew** (Kafka) | Total lag looks fine; one partition stuck or hot | Lag and age **per partition**; consumers per partition |
| More consumers than partitions | Extra consumers sit idle | Max useful consumers = partitions |
| **Poison message** | Same message fails again and again, blocks a partition | Retries per message, DLQ growth |
| **Retry storm** | Retries multiply load during an incident | Retry rate vs arrival rate; exponential backoff with jitter ([09](09-internal-services.md#protect-callers-from-slow-dependencies)) |
| Rebalancing loops | Throughput drops to 0 repeatedly | Consumer group rebalances per hour |

### Alerts ⚠️

| Alert | Condition | Severity |
|---|---|---|
| Queue SLO burn | Oldest-message-age SLO burning fast ([10](10-slos-and-error-budgets.md)) | Page (tier 1) |
| Backlog growing at max consumers | Autoscaler at max AND backlog grew for 15 min | Page / ticket |
| DLQ received messages | Count > 0 | Ticket (page if money) |
| Consumer group stopped | Processing rate = 0 while arrival > 0 for 5 min | Page |

```text
// DQL shape: processing rate vs arrival rate for one queue (consumer and producer spans)
fetch spans
| filter messaging.destination.name == "orders"
| makeTimeseries { produced = countIf(span.kind == "producer"), consumed = countIf(span.kind == "consumer") }, interval:1m
| fieldsAdd net_growth = produced[] - consumed[]
```

### Autoscaling consumers

KEDA scales consumers on lag or queue length (Kafka, RabbitMQ, SQS, …). Set the maximum to the number of partitions, alert when it is at max while age grows, and check what `lagThreshold` means in your KEDA version (total vs average lag differs between versions).

<details>
<summary>Open-source variant (PromQL)</summary>

```promql
# Lag growing for 15 minutes (consumers not keeping up)
sum by (consumergroup, topic) (kafka_consumergroup_lag) > 10000
and
deriv(sum by (consumergroup, topic) (kafka_consumergroup_lag)[15m:1m]) > 0
```

</details>

### Traces across the queue

Propagate trace context in message headers. The consumer span **links** to the producer span (OTel messaging conventions), so one order stays one trace from the API through the queue to the worker. Lab finding: an experimental .NET instrumentation broke this continuity; test it after every agent upgrade ([15](15-opentelemetry-practices.md)).

## Batch and cron jobs

| Signal | How |
|---|---|
| Last success time | Job pushes `job_last_success_timestamp_seconds` at the end (Pushgateway for **service-level** jobs; node-exporter textfile collector for machine-level jobs) |
| Kubernetes Jobs | kube-state-metrics: `kube_job_status_failed`, `kube_job_status_succeeded`, `kube_cronjob_status_last_successful_time` |
| Duration | `job_duration_seconds` pushed at the end, or Job start/completion times |

<details>
<summary>Open-source variant (PromQL)</summary>

```promql
# Nightly job (runs every 24h) hasn't succeeded in 2 intervals → alert
time() - job_last_success_timestamp_seconds{job="nightly-billing"} > 2 * 86400

# Kubernetes CronJob: last success too old
time() - kube_cronjob_status_last_successful_time{cronjob="nightly-billing"} > 2 * 86400

# Any failed Job (count alert)
kube_job_status_failed{namespace="batch"} > 0
```

</details>

Prometheus guidance: alert when a batch job **hasn't succeeded recently enough**, with a threshold of at least two full run intervals. Jobs that run more often than about every 15 minutes should become long-running services.

## Data pipelines (freshness, coverage, correctness)

| SLI | Definition (SRE Workbook) | Example SLO ⚠️ |
|---|---|---|
| **Freshness** | % of data processed within a time bound, or age of the newest complete data, or time since the last successful run | 99% of orders visible in reporting within 30 min |
| **Coverage** | Batch: % of runs that processed (at least) the expected amount of data. Streaming: % of records processed within a window | 99% of nightly runs cover 100% of the day's partitions |
| **Correctness** | % of output that is right, checked **independently** of the pipeline's own logic, e.g. with **golden data** (test records with known expected results) | 99.99% of golden records correct |

| Practice | Why |
|---|---|
| Measure **end to end** (source → final table), not only per stage | Data can be lost *between* stages (a dropped field, a skipped partition) |
| Inject golden / canary records and check them at the end | Correctness without knowing every real answer |
| Alert on freshness SLO burn and on "no successful run in 2 intervals" | Late data is the most common pipeline failure |
| Row counts vs the same period last week | Silent partial loads |

## External dependencies

You don't own the provider, but you own your experience of it.

| Signal | Example | Why |
|---|---|---|
| Client-side RED | `http.client.request.duration` by `server.address` | Their errors and latency, seen from your side |
| Timeouts / retries | `error.type="timeout"`, retry counters | Hidden latency and load amplification |
| Circuit breaker state | `circuit_breaker_state{dependency="payments-api"}` | Shows when you're failing fast on purpose |
| Synthetic check | Blackbox exporter / k6 against the provider's health or sandbox | Detects outages even with no traffic |

<details>
<summary>Open-source variant (PromQL)</summary>

```promql
# Provider error ratio from our side, with a minimum-count guard
(
  sum by (server_address) (rate(http_client_request_duration_seconds_count{server_address="api.payments.example", http_response_status_code=~"5..|429"}[10m]))
  /
  sum by (server_address) (rate(http_client_request_duration_seconds_count{server_address="api.payments.example"}[10m]))
  > 0.05
)
and
sum by (server_address) (increase(http_client_request_duration_seconds_count{server_address="api.payments.example", http_response_status_code=~"5..|429"}[10m])) > 20
```

</details>

| Practice | Why |
|---|---|
| Route provider alerts to the **owning team**, with the provider's status page in the runbook | You can't fix it, but you must communicate and mitigate |
| Track the provider's SLA vs what you measure | Evidence for service credits and vendor reviews |
| Separate "they're down" from "we're calling wrong" (4xx vs 5xx) | Different owners |

## Sources

- [OTel semconv: messaging metrics](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-metrics/): `messaging.client.consumed.messages`, `messaging.process.duration` (development stage) ✅ 2026-11-20
- [OTel semconv: messaging spans](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/): links between producer and consumer 📚
- [Prometheus: When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/): service-level batch jobs only; textfile collector for machine-level ✅ 2026-11-20
- [Prometheus: Alerting practices](https://prometheus.io/docs/practices/alerting/): batch jobs, "not succeeded recently enough", 2 intervals ✅ 2026-11-20
- [OTel semconv: HTTP client metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) 📚
- [kube-state-metrics: Job and CronJob metrics](https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics/workload) 📚
