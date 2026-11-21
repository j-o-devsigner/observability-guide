# 15 · OpenTelemetry best practices

> OpenTelemetry is the **standard way to produce and move telemetry**; the backend (here Dynatrace) is a
> destination you can change. The value comes from consistency: the same names, the same resource identity, the same
> pipeline for every service. These rules are what made the aks-observability lab work.

## 1. Resource identity: who sent this?

Every signal from a service carries the same resource attributes. Set them once (Operator / env vars), never in code.

| Attribute | Example | Set by |
|---|---|---|
| `service.name` | `checkout` | `OTEL_SERVICE_NAME` or Operator (defaults to the workload name) |
| `service.namespace` | `payments` | `OTEL_RESOURCE_ATTRIBUTES` |
| `service.version` | `1.42.0` / image tag | Pipeline → env var or pod label via `k8sattributes` ([12](12-releases-and-dora.md)) |
| `deployment.environment.name` | `prod` | Gateway `resource` processor |
| `k8s.cluster.name`, `k8s.cluster.uid` | `aks-prod-weu`, kube-system UID | Gateway `resource` processor |
| `k8s.namespace.name`, `k8s.pod.name`, `k8s.deployment.name` | – | `k8sattributes` processor |
| `team` (custom) | `payments` | Pod label → `k8sattributes` ([20](20-ownership-and-communication.md)) |

## 2. Semantic conventions: standard names

| Practice | Why |
|---|---|
| Use semconv names (`http.route`, `http.response.status_code`, `db.system.name`, `messaging.system`) | Every tool, dashboard and alert template understands them |
| Know the stability: **HTTP stable** (since v1.23.0), **database stable** (2025), messaging and many others still in development | Stable names won't change under you |
| During migrations use `OTEL_SEMCONV_STABILITY_OPT_IN` (`http`, `database`, or `…/dup` to emit both) | Switch dashboards and alerts before old names disappear |
| Custom metrics: lowercase, dot-separated namespace (`checkout.orders.created`), unit in the `unit` field (UCUM: `s`, `By`, `{request}`), not in the name | Consistent with semconv; Dynatrace and Prometheus both convert cleanly |
| Duration in seconds, as a histogram | Percentiles and averages from one instrument |
| Bounded attribute values on metrics only ([19](19-cost-and-cardinality.md)) | IDs go on spans and logs |

## 3. Instrumentation

| Practice | Why |
|---|---|
| **Zero-code first**: OTel Operator `Instrumentation` resource + namespace annotation | New services are traced on their first deploy (lab) |
| Opt out per pod for non-app containers (databases, brokers) | No agent where it can't help |
| Add the SDK only for business spans and metrics (orders, payments) | Auto-instrumentation can't know business meaning |
| **Keep experimental instrumentations off** | Lab: the .NET ADO.NET instrumentation broke trace context after every DB call |
| One agent per process: don't run OneAgent code module **and** OTel auto-instrumentation on the same service | Duplicate spans; both use the runtime's profiler slot (.NET) |
| Propagation: W3C `tracecontext` + `baggage` | Works across OTel, Dynatrace RUM and OneAgent |
| Logs carry `trace_id` / `span_id` | One click from a log line to its trace |

```yaml
# OTel Operator: one Instrumentation per namespace (or cluster-wide), then annotate the namespace
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata: { name: default, namespace: shop }
spec:
  exporter: { endpoint: http://$(OTEL_NODE_IP):4318 }     # the agent on the same node
  propagators: [tracecontext, baggage]
  sampler: { type: parentbased_always_on }                # sample at the gateway (tail), not in apps
  env:
    - { name: OTEL_SEMCONV_STABILITY_OPT_IN, value: "http,database" }
  dotnet:
    env:
      - { name: OTEL_DOTNET_AUTO_TRACES_ADONET_INSTRUMENTATION_ENABLED, value: "false" }   # lab finding
# kubectl annotate namespace shop instrumentation.opentelemetry.io/inject-dotnet=default
```

## 4. Traces: metrics from spans and sampling

### Metrics from traces

| Option | Where it runs | Good for |
|---|---|---|
| **Span metrics connector** (OTel Collector) | Gateway, before sampling | RED per service/route/client from all spans ([04](04-endpoint-coverage.md)) |
| **TraceQL metrics** | Query time in Tempo | Ad-hoc questions: "error rate of spans with attribute X" |

```text
# TraceQL metrics (Tempo): error % for checkout, and p99 by route
100 * ({ resource.service.name = "checkout" && status = error } | rate())
    / ({ resource.service.name = "checkout" } | rate())

{ resource.service.name = "checkout" && span.kind = server } | quantile_over_time(duration, .99) by (span.http.route)
```

⚠️ Generate span metrics **before** sampling. Otherwise rates are undercounted. TraceQL metrics can extrapolate for sampling, but check the docs for your Tempo version.

### Sampling

| Type | Decision made | Pros | Cons |
|---|---|---|---|
| **Head sampling** (SDK, e.g. `parentbased_traceidratio`) | At the start of the trace | Cheap, simple | Can drop the one error you needed |
| **Tail sampling** (Collector `tail_sampling` processor) | After the trace completes | Keep all errors and slow traces | All spans of a trace must reach the **same** collector (use a load-balancing exporter by trace ID); memory cost |

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      - name: slow
        type: latency
        latency: { threshold_ms: 500 }
      - name: baseline
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }
```

A trace is kept if **any** policy says sample. Errors and slow requests are always kept, plus 10% of everything else ⚠️.


## 5. Pipeline and collector

| Practice | Section |
|---|---|
| Three tiers: agent (DaemonSet), cluster collector (1 replica), gateway (2+ replicas) | [16](16-collector-templates.md) |
| Mask, filter, enrich, convert **in the gateway**, once | [16](16-collector-templates.md) |
| Durable buffer at the edge (agent disk), backpressure in the middle | [16](16-collector-templates.md) |
| Monitor the collectors themselves | [16](16-collector-templates.md#self-monitoring) |
| Validate configs in CI (`otelcol validate`), pin versions, test after upgrades | `make check-collector` |

## 6. Dynatrace-specific rules

| Rule | Why |
|---|---|
| Metrics as **delta** (`cumulative_to_delta` in one gateway hop) | Cumulative counters are dropped |
| ≤ 50 dimensions per data point | The whole point is dropped above it |
| ≤ 4 MB per request, OTLP **protobuf** | Larger requests rejected; JSON rejected (lab) |
| Token: `metrics.ingest`, `logs.ingest`, `openTelemetryTrace.ingest` (or platform token `openpipeline:*:ingest`) | Least privilege |
| Set `k8s.*` and host resource attributes | Links OTel data to Dynatrace topology |
| Histograms cost 10 data points each | Send them where you use them ([17](17-dynatrace-integration.md)) |

## 7. Security

| Practice | Source |
|---|---|
| Secrets via env vars / secret store, never in the config file | OTel docs |
| Bind receivers to the pod IP, not `0.0.0.0` (default is localhost since v0.110.0) | OTel docs |
| TLS + auth (bearer token, mTLS) on any collector reachable from outside the cluster | OTel docs |
| Only the components you need (custom build with the Collector Builder) | OTel docs |
| Run as non-root, minimal RBAC | OTel docs |
| Redact in the gateway before export ([16](16-collector-templates.md)) | OTel docs + lab |

## 8. Versions and upgrades

| Practice | Why |
|---|---|
| Pin collector, Operator and agent versions | Component and metric names change (lab: `_total` dropped in 0.162; `otlphttp` → `otlp_http`) |
| Upgrade in staging first, rerun the proofs (validate, trace continuity, alert firing) | "Enabled" is not "working" |
| Batch processor → exporter batching | The collector project is deprecating the batch processor in favor of exporter-level batching |

## Sources

- [OTel: Resources](https://opentelemetry.io/docs/concepts/resources/) · [semconv: Service](https://opentelemetry.io/docs/specs/semconv/resource/service/) · [Deployment](https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/) ✅
- [OTel: HTTP semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/) · [declared stable](https://opentelemetry.io/blog/2023/http-conventions-declared-stable/) · [Database spans](https://opentelemetry.io/docs/specs/semconv/db/database-spans/) ✅ 2026-11-20
- [OTel: Metrics semantic conventions (naming, units)](https://opentelemetry.io/docs/specs/semconv/general/metrics/) 📚
- [OTel Operator](https://opentelemetry.io/docs/platforms/kubernetes/operator/) 📚
- [OTel: Collector configuration best practices](https://opentelemetry.io/docs/security/config-best-practices/) · [hosting best practices](https://opentelemetry.io/docs/security/hosting-best-practices/) ✅ 2026-11-20
- [OTel: Deprecating the batch processor](https://opentelemetry.io/blog/2026/collector-batching-migration/) ✅ 2026-11-20
- Dynatrace rules: see [17](17-dynatrace-integration.md) sources ✅; lab findings ✅ measured
