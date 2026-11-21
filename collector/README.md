# Collector configs

> OpenTelemetry Collector base templates, validated with the pinned collector image (`make check-collector`).
> Derived from the aks-observability lab, where their behavior was tested. Guide: [16](../standard/16-collector-templates.md).

| File | Tier | What |
|---|---|---|
| [`agent.yaml`](agent.yaml) | DaemonSet | Container logs (`filelog`), kubelet stats, OTLP from local pods; JSON log parsing; persistent disk queue |
| [`cluster.yaml`](cluster.yaml) | Deployment, 1 replica | `k8s_cluster` (state, restarts, OOM reason), `k8sobjects` (events), `httpcheck` (internal synthetics) |
| [`gateway.yaml`](gateway.yaml) | Deployment, 2+ | Identity, redaction, label allow-list, health-check filter, delta, export to **Dynatrace**, self-monitoring to Dynatrace |
| [`gateway-fanout.yaml`](gateway-fanout.yaml) | Deployment | Variant: same stream to Dynatrace **and** an open-source stack (Mimir/Loki/Tempo) |
| [`check.sh`](check.sh) | – | `otelcol validate` on every file (dummy env + dummy service account in `testdata/`) |

## Status

| Check | Result |
|---|---|
| `validate` with `otel/opentelemetry-collector-contrib:0.162.0` (all four files) | ✅ 2026-11-20 |
| Behavior (log loss, churn, masking, self-monitoring alerts) | ✅ measured in the lab with the original Helm values these templates come from |

## Adapt

| Setting | File |
|---|---|
| `DT_ENDPOINT`, `DT_API_TOKEN` (SaaS or in-cluster ActiveGate) | gateway |
| `K8S_CLUSTER_NAME`, `K8S_CLUSTER_UID`, `DEPLOY_ENV` | gateway |
| Gateway service address `otel-gateway.observability.svc` | agent, cluster |
| Label allow-list, redaction rules | gateway |
| `httpcheck` targets | cluster |
| Tail sampling / `cumulative_to_delta`: same trace or series must reach the same gateway replica | gateway |
