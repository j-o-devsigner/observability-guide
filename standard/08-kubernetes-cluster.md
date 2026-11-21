# 08 · Kubernetes cluster

> **In 30 seconds:** "down" has levels (scheduled → running → ready → serving → users happy). Page on the user level,
> use the others to find the cause. The checklist below says what to measure at each level, which OpenTelemetry
> component produces it (templates in [collector/](../collector/)), and what Dynatrace gives natively.
> Metric names are OTel receiver names as they arrive in Dynatrace; "lab" = seen in the aks-observability lab.

## "Down" has levels

| Level | Question | Signal | Example |
|---|---|---|---|
| 1. Exists | Is it scheduled? | Pod phase | Pod stuck in `Pending` (no capacity) |
| 2. Running | Is the process alive? | Container state, restarts | `CrashLoopBackOff`, `OOMKilled` |
| 3. Ready | Does Kubernetes send it traffic? | Readiness, ready endpoints | Running but readiness probe failing |
| 4. Serving | Does it answer correctly? | RED ([04](04-endpoint-coverage.md)) | 5xx, slow responses |
| 5. Users happy | Is the experience OK? | SLOs, synthetic checks ([10](10-slos-and-error-budgets.md)) | Budget burning |

⚠️ `up == 1` only means "Prometheus could scrape it", not that the service works.

## Coverage checklist

| Level | What to measure | OTel source → metric / signal | Dynatrace native (OneAgent / ActiveGate) | Alert? |
|---|---|---|---|---|
| **Cluster** | Nodes ready / pressure | `k8s_cluster` → `k8s.node.condition_ready`, `…_memory_pressure`, `…_disk_pressure` (`node_conditions_to_report`) | Kubernetes app, node conditions | Yes (ticket; page if capacity at risk) |
| | Pods that can't schedule | `k8s_cluster` → `k8s.pod.phase` = Pending + `k8sobjects` events `FailedScheduling` | Workload / pod status, events | Yes, > 10 min |
| | Requests vs allocatable (room to scale) | `k8s_cluster` → `k8s.node.allocatable_cpu/memory`; `kubeletstats` → requests utilization | Cluster utilization views | Dashboard + capacity review |
| **Control plane** | API server errors and latency | `prometheus` receiver on the API server metrics (self-managed clusters; AKS/EKS expose less) | Kubernetes API monitoring via ActiveGate | Ticket |
| | DNS failures / latency | `prometheus` receiver on CoreDNS | Partial | Ticket |
| **Node** | CPU, memory, disk, network | `kubeletstats` → `k8s.node.cpu.usage`, `k8s.node.memory.working_set`, `k8s.node.filesystem.available`, `k8s.node.network.io` (lab) | OneAgent host metrics | Predict disk full (page if < 4h) |
| **Workload** | Available vs desired replicas | `k8s_cluster` → `k8s.deployment.available`, `k8s.deployment.desired` (lab) | Workload health | Yes: 0 available = down |
| | Rollout stuck | Deployment generation / events | Events | Ticket |
| | HPA at max | `k8s_cluster` → `k8s.hpa.current_replicas`, `k8s.hpa.max_replicas` | Workload metrics | Ticket |
| | Jobs failed | `k8s_cluster` → `k8s.job.failed_pods` | Events | Ticket ([06](06-workload-types.md)) |
| **Pod / container** | Restarts | `k8s_cluster` → `k8s.container.restarts` (lab) | Container restarts anomaly | Yes, burst |
| | OOMKilled | `k8s_cluster` resource attr `k8s.container.status.last_terminated_reason` (lab) | **OOM problem in ~1 min** (lab) | Yes |
| | Memory vs limit, CPU vs request | `kubeletstats` → `k8s.container.memory_limit_utilization`, `k8s.container.cpu_request_utilization` (lab) | Container metrics | Dashboard; alert on OOM, not on %. |
| | CPU throttling | Not in `kubeletstats`: scrape cAdvisor with the `prometheus` receiver (`container_cpu_cfs_throttled_periods_total`) | Container throttling | Dashboard |
| | Image pull / crash loop | `k8sobjects` events (`BackOff`, `Failed`) (lab) | Events + problems | Yes |
| **Storage** | Volume space | `kubeletstats` → `k8s.volume.available`, `k8s.volume.capacity` | PV metrics | Predict full |
| **Network** | Pod network I/O, errors | `kubeletstats` → `k8s.pod.network.io`, `k8s.pod.network.errors` | Network metrics | Dashboard |
| | Flows, drops between workloads | CNI metrics (Cilium/Hubble) via `prometheus` receiver | OneAgent network | Ticket on drops |
| **Events** | Kubernetes events as logs | `k8sobjects` → logs (lab) | Kubernetes events | Via event rules |
| **Applications** | RED per service, route, client, version | App OTLP (auto-instrumentation) → `http.server.request.duration` (lab) | OneAgent services (routes need key requests: `NON_KEY_REQUESTS`, lab) | SLO burn ([10](10-slos-and-error-budgets.md)) |
| | Dependencies (DB, queue, HTTP clients) | `db.client.operation.duration`, `messaging.*`, `http.client.request.duration` (lab: names the slow DB) | Traces / service flow | Via SLO + traces |
| | Logs with trace context | `filelog` + JSON parsing + `trace_id` (lab) | OneAgent log module | Error-rate rules |
| **Synthetics** | Internal endpoint up | `httpcheck` → `httpcheck.status` (lab) | Synthetic HTTP monitors | Yes |
| **Pipeline** | Collectors healthy, no data loss | Internal telemetry `otelcol_*` → Dynatrace ([16](16-collector-templates.md#self-monitoring)) | ActiveGate / OneAgent self-monitoring | Yes, tested |

## What OneAgent does that OTel needs a setting for

| OneAgent does automatically | OTel equivalent |
|---|---|
| Detects the language and injects | Annotate the namespace with the language ([15](15-opentelemetry-practices.md)) |
| Kubernetes problems (OOM, crash loops) out of the box | Write the alerts on `k8s_cluster` data ([16](16-collector-templates.md), Dynatrace anomaly detectors) |
| Service names and topology | `service.name` via Operator; `k8s.*` attributes for topology links |
| Stable series across restarts (0 new series, lab) | Label allow-list in the gateway (18 new series, lab) |
| Log buffering during outages | Persistent queue on the agent (lab: both 0 lost) |

## What OTel does better (lab)

| OTel | Why it matters |
|---|---|
| Per-route RED by default (`http.route`) | No key-request configuration |
| DB client latency metric names the dependency | Root cause without traces |
| Masking before data leaves the cluster | Compliance |
| Collector failure alerts in 4–11 min vs ~24 min | Faster detection of blind spots |

## Minimum viable cluster monitoring (start here)

| # | Signal | Template |
|---|---|---|
| 1 | Node ready + pressure, pods pending | cluster.yaml |
| 2 | Deployment available = 0 | cluster.yaml |
| 3 | Restarts + OOMKilled reason | cluster.yaml |
| 4 | Memory vs limit, CPU vs request | agent.yaml |
| 5 | Kubernetes events as logs | cluster.yaml |
| 6 | Container logs with trace context | agent.yaml |
| 7 | App RED via auto-instrumentation | Operator `Instrumentation` |
| 8 | Collector self-monitoring + alerts | gateway.yaml |
| 9 | One SLO per tier-1 service | [10](10-slos-and-error-budgets.md) |

## Triage order: "the service is down"

1. **Users / SLO**: error ratio and latency. Is it really broken, and for whom?
2. **Ready endpoints**: `0` means Kubernetes sends traffic nowhere → step 3. Not 0 → step 5.
3. **Pods**: crash loop, OOM, image pull, not ready. `kubectl describe pod` → Events.
4. **Scheduling / capacity**: Pending pods, node pressure, requests vs allocatable.
5. **Dependencies**: traces, network flows, DNS errors.
6. **Changes**: recent rollout? ([12](12-releases-and-dora.md)). Most incidents start with a change.

<details>
<summary>Open-source variant (PromQL with kube-state-metrics, node-exporter, cAdvisor)</summary>

## Cluster

| What | Query | Bad when |
|---|---|---|
| API server errors | `sum(rate(apiserver_request_total{code=~"5.."}[5m])) / sum(rate(apiserver_request_total[5m]))` | `> 0.01` |
| API server p99 | `histogram_quantile(0.99, sum by (le) (rate(apiserver_request_duration_seconds_bucket{verb!~"WATCH\|CONNECT"}[5m])))` | `> 1` s |
| Nodes not Ready | `count(kube_node_info) - sum(kube_node_status_condition{condition="Ready",status="true"})` | `> 0` |
| Node pressure | `kube_node_status_condition{condition=~"MemoryPressure\|DiskPressure\|PIDPressure",status="true"} == 1` | any |
| Pending pods | `sum(kube_pod_status_phase{phase="Pending"})` | `> 0` for 10 min |
| CPU requested vs allocatable | `sum(kube_pod_container_resource_requests{resource="cpu"}) / sum(kube_node_status_allocatable{resource="cpu"})` | `> 0.8` (no room to scale) |
| DNS failures | `sum(rate(coredns_dns_responses_total{rcode="SERVFAIL"}[5m]))` | `> 0` |
| DNS p99 | `histogram_quantile(0.99, sum by (le) (rate(coredns_dns_request_duration_seconds_bucket[5m])))` | `> 0.1` s |

## Node

| What | Query | Bad when |
|---|---|---|
| CPU used | `1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))` | `> 0.9` sustained |
| Memory available | `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes` | `< 0.1` |
| Disk available | `min by (instance) (node_filesystem_avail_bytes{fstype=~"ext4\|xfs"} / node_filesystem_size_bytes{fstype=~"ext4\|xfs"})` | `< 0.15` |
| Disk full soon | `predict_linear(node_filesystem_avail_bytes{fstype=~"ext4\|xfs"}[6h], 4*3600) < 0` | any (page) |

## Workload

| What | Query | Bad when |
|---|---|---|
| Deployment completely down | `(kube_deployment_spec_replicas > 0) and (kube_deployment_status_replicas_available == 0)` | any |
| Degraded | `kube_deployment_status_replicas_available / kube_deployment_spec_replicas < 1` | for 15 min |
| Rollout stuck | `kube_deployment_status_observed_generation != kube_deployment_metadata_generation` | for 15 min |
| HPA maxed out | `kube_horizontalpodautoscaler_status_current_replicas >= kube_horizontalpodautoscaler_spec_max_replicas` | for 15 min |
| DaemonSet missing pods | `kube_daemonset_status_number_unavailable > 0` | any |

## Pod / container

| What | Query | Bad when |
|---|---|---|
| Crash loop | `kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"} == 1` | any |
| Image pull failing | `kube_pod_container_status_waiting_reason{reason=~"ImagePullBackOff\|ErrImagePull"} == 1` | any |
| OOMKilled | `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1` | any |
| Memory vs limit | `sum by (namespace, pod) (container_memory_working_set_bytes{container!=""}) / sum by (namespace, pod) (kube_pod_container_resource_limits{resource="memory"})` | `> 0.9` |
| CPU throttling | `sum by (namespace, pod) (rate(container_cpu_cfs_throttled_periods_total[5m])) / sum by (namespace, pod) (rate(container_cpu_cfs_periods_total[5m]))` | `> 0.25` |
| No ready endpoints | `sum by (endpointslice) (kube_endpointslice_endpoints{ready="true"}) == 0` | service down even if pods exist |

Most of these are **ticket or dashboard**, not page. Page when users are affected (level 5), and put these in the alert's dashboard link.


</details>

## Sources

- [OTel: Important components for Kubernetes](https://opentelemetry.io/docs/platforms/kubernetes/collector/components/) 📚
- [Dynatrace: Monitor Kubernetes clusters with the OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/use-cases/kubernetes/k8s-monitoring) ✅ 2026-11-20
- [Dynatrace: Kubernetes Platform Monitoring](https://docs.dynatrace.com/docs/license/capabilities/container-monitoring/kubernetes-platform-monitoring) ✅ 2026-11-20
- Receiver metric names: `k8sclusterreceiver` and `kubeletstatsreceiver` documentation in opentelemetry-collector-contrib 📚 (names marked "lab" were seen in the lab's Dynatrace tenant and Prometheus)
- Lab: `~/projects/aks-observability/results/` ✅ measured
