# 16 · Collector templates and pipelines

> Three tiers, each with one job. The templates in [collector/](../collector/) export to **Dynatrace**; adding a
> second backend is one more exporter in the gateway. All templates pass `otelcol validate` with collector 0.162.0
> and are derived from the aks-observability lab, where their behavior was tested.

## The three tiers

<div data-widget="viz" data-chart="collector-tiers"></div>

| Tier | Runs as | Reads | Job | State | Template |
|---|---|---|---|---|---|
| **Agent** | DaemonSet (every node) | Container logs, kubelet stats, OTLP from local pods | Collect, add pod metadata, parse logs, **buffer on disk** | Persistent queue + log checkpoints | [collector/agent.yaml](../collector/) |
| **Cluster collector** | Deployment, **1 replica** | Kubernetes API (objects, events), synthetic checks | Cluster state, restarts, OOM reason, events | None | [collector/cluster.yaml](../collector/) |
| **Gateway** | Deployment, 2+ replicas, PDB | OTLP from agents and cluster collector | Identity, masking, label allow-list, filtering, delta, export | Memory queue that **blocks** when full | [collector/gateway.yaml](../collector/) |

Why three: the agent must run on every node; the cluster collector must run **once** (it duplicates data otherwise); the gateway applies every rule once and is the only thing that knows the backend.

## Base pipelines

| Tier | Pipeline | Receivers | Processors (in order) | Exporter |
|---|---|---|---|---|
| Agent | metrics | `otlp`, `kubeletstats` | `memory_limiter`, `k8sattributes` | gateway (persistent queue) |
| Agent | logs | `otlp`, `filelog` | `memory_limiter`, `k8sattributes`, `transform/parse_json_logs` | gateway |
| Agent | traces | `otlp` | `memory_limiter`, `k8sattributes` | gateway |
| Cluster | metrics | `k8s_cluster`, `httpcheck` | `memory_limiter` | gateway |
| Cluster | logs | `k8sobjects` (events) | `memory_limiter` | gateway |
| Gateway | metrics | `otlp` | `memory_limiter`, `resource/cluster`, `transform/metric_labels`, `cumulative_to_delta` | Dynatrace |
| Gateway | logs | `otlp` | `memory_limiter`, `transform/redact`, `resource/cluster` | Dynatrace |
| Gateway | traces | `otlp` | `memory_limiter`, `filter/drop_health_checks`, `transform/redact`, `resource/cluster` | Dynatrace |

Processor order rule: `memory_limiter` first; filters before expensive transforms; identity and conversion last.

## Settings that matter (all measured in the lab)

| Setting | Where | Effect measured |
|---|---|---|
| Persistent `sending_queue` on `file_storage` + `storeCheckpoints` | Agent | Log loss in a 10-min backend outage: **83% → 0%** (also 0% when the agent was killed mid-outage) |
| `retry_on_failure.max_elapsed_time: 0` | Agent, gateway | Default gives up after 5 min = data loss |
| Byte batches 1–3 MB | Agent, gateway | Stays under Dynatrace's 4 MB request limit during catch-up |
| `block_on_overflow: true` | Gateway | Backpressure: agents keep data on disk instead of the gateway dropping it |
| `transform/metric_labels` allow-list | Gateway | Labels 50 → 28; series churn on container restart 470 → 18 |
| `transform/redact` | Gateway | No usernames, tokens, emails in Dynatrace (40,892 leaked spans before) |
| `filter/drop_health_checks` | Gateway | Probe spans removed (1 per probe per pod, forever) |

## Self-monitoring

The pipeline can fail silently: if the collector dies, its own alerts die with it. Send the collectors' internal metrics to Dynatrace (the gateway template already does) and alert on them there.

```yaml
service:
  telemetry:
    metrics:
      level: detailed            # required by Dynatrace's collector self-monitoring dashboards
      readers:
        - periodic:
            exporter:
              otlp:
                protocol: http/protobuf
                endpoint: ${env:DT_ENDPOINT}/v1/metrics
                temporality_preference: delta
```

| Alert | Signal (internal metric) | Condition ⚠️ | Severity |
|---|---|---|---|
| Receiver refusing data | `otelcol_receiver_refused_*` | > 0 for 2 min | critical |
| Exporter dropping data (queue full) | `otelcol_exporter_enqueue_failed_*` | > 0 for 1 min | critical |
| Exporter send failing | `otelcol_exporter_send_failed_*` | > 0 for 5 min | warning |
| Queue filling | `otelcol_exporter_queue_size / otelcol_exporter_queue_capacity` | > 0.8 for 5 min (OTel docs: scale out at 60–70%) | warning |
| Exporter stuck | sent = 0 while received > 0 | 10 min | critical |
| Collector tier missing | no self-monitoring data from a tier | 3 min | critical |
| Node sends nothing | node without `k8s.node.*` metrics | 5 min | critical |

In Dynatrace, create these as custom alerts (anomaly detectors) on a DQL query, for example:

```text
timeseries failed = sum(otelcol_exporter_send_failed_log_records), by:{service.instance.id, exporter}
```

Check the exact metric keys in your tenant first: collector versions differ in naming (lab: 0.162 dropped the `_total` suffix, and rules written for `_total` matched nothing). In the lab, these alerts fired 4–11 min after a real fault; Dynatrace's built-in "monitoring not available" problem took ~24 min. **Test each alert by breaking something** (stop a collector, block the backend).

## Adapting the templates

| Change | Where |
|---|---|
| Endpoint and token | Gateway env `DT_ENDPOINT`, `DT_API_TOKEN` (direct SaaS, or the in-cluster ActiveGate) |
| Cluster identity | Gateway env `K8S_CLUSTER_NAME`, `K8S_CLUSTER_UID`, `DEPLOY_ENV` |
| Which labels Dynatrace gets | `transform/metric_labels` regex (only stable attributes you filter by) |
| What gets masked | `transform/redact` (the lab repo has the full rule set and a test) |
| Internal synthetic checks | `httpcheck` targets in the cluster collector |
| A second backend | Add an exporter to the gateway pipelines ([collector/gateway-fanout.yaml](../collector/)) |
| Deploy | OTel Collector Helm chart (`mode: daemonset` / `deployment`), the OTel Operator `OpenTelemetryCollector` CR, or Dynatrace's collector distribution |

## Anti-patterns

| ❌ | ✅ |
|---|---|
| Apps export straight to Dynatrace | Apps → agent → gateway: one place for masking, identity and backend changes |
| `k8s_cluster` in the DaemonSet | One cluster collector (DaemonSet = duplicate data per node) |
| Tail sampling or `cumulative_to_delta` behind a round-robin load balancer | Same trace / series must reach the same gateway replica |
| Memory-only queues at the edge | Persistent queue on the agent |
| No self-monitoring | Internal metrics → Dynatrace + alerts, tested |
| Contrib image with every component in production | Pinned version; ideally a custom build with only the components you use |

## Sources

- [OTel: Deployment patterns](https://opentelemetry.io/docs/collector/deploy/) · [Agent-to-gateway](https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/) · [Gateway](https://opentelemetry.io/docs/collector/deploy/gateway/): tiers, tail sampling on gateways, single writer, k8s_cluster duplicates ✅ 2026-11-20
- [OTel: Internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) · [Scaling](https://opentelemetry.io/docs/collector/scaling/) · [Resiliency](https://opentelemetry.io/docs/collector/resiliency/): queue metrics, 60–70% scaling guidance ✅ 2026-11-20
- [OTel: Collector anti-patterns](https://opentelemetry.io/blog/2024/otel-collector-anti-patterns/) 📚
- [Dynatrace: Collector self-monitoring](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/self-monitoring): level detailed, OTLP periodic reader, delta ✅ 2026-11-20
- [Dynatrace: Monitor Kubernetes with the OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/use-cases/kubernetes/k8s-monitoring): k8s_cluster + kubeletstats + events, hostmetrics overlap ✅ 2026-11-20
- [Dynatrace: Anomaly detection configuration](https://docs.dynatrace.com/docs/dynatrace-intelligence/anomaly-detection/anomaly-detection-configuration) · [via API](https://docs.dynatrace.com/docs/dynatrace-intelligence/anomaly-detection/set-up-anomaly-detectors-via-api): DQL static-threshold custom alerts ✅ 2026-11-20
- Lab: `~/projects/aks-observability` (otel-*-values.yaml, otel-collector-rules.yaml, results/log-loss.md, cardinality.md, pipeline-faults.md) ✅ measured
