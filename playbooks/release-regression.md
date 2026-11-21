# Playbook: Errors went up after a release

| Field | Value |
|---|---|
| Problem | "Error rate jumped. Was it the deploy? Which version?" |
| Layer(s) | Delivery → Service |
| Method | RED split by `service.version` + deploy markers |
| Status | draft (not yet validated in lab) |
| Last validated | – |

## When to use it

- Error rate or latency changed and a deploy happened in the last ~1h.
- During a rolling update or canary (two versions serve traffic at once).
- Someone asks "should we roll back?".

## Signals needed

| Signal | Name / attribute | Exists? |
|---|---|---|
| Metric | `http_server_request_duration_seconds_*` with `service_version` label | |
| Metric | `kube_deployment_status_observed_generation` (kube-state-metrics) | |
| Event | Grafana annotation `deploy` with `version:<tag>` | |
| Trace | `service.version` resource attribute | |
| Log | `service.version` field | |

## Queries

```text
// Dynatrace (DQL shape): error ratio per version during the rollout
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), errors = countIf(http.response.status_code >= 500) }, by:{ service.version }
| fieldsAdd error_ratio = errors[] / total[]
```

Open-source variant (PromQL):


```promql
# Error ratio per version (compare old vs new during rollout)
sum by (service_version) (rate(http_server_request_duration_seconds_count{service_name="$service", http_response_status_code=~"5.."}[5m]))
/
sum by (service_version) (rate(http_server_request_duration_seconds_count{service_name="$service"}[5m]))

# Traffic share per version (is the rollout progressing?)
sum by (service_version) (rate(http_server_request_duration_seconds_count{service_name="$service"}[5m]))

# Latency p99 per version
histogram_quantile(0.99, sum by (service_version, le) (rate(http_server_request_duration_seconds_bucket{service_name="$service"}[5m])))
```

## Alerts

- Regression of one version vs the other: [standard/12 §3](../standard/12-releases-and-dora.md#3-alerts-that-know-about-releases)
- SLO burn + recent deploy → `suspect: deploy`: [standard/12 §3](../standard/12-releases-and-dora.md#3-alerts-that-know-about-releases)

## Dashboard

| Row | Panel |
|---|---|
| RED overview | Deployment events overlaid on every time series |
| Delivery | Error % by `service_version` (one line per version), traffic share by version (stacked), p99 by version |
| Table | version · first seen · req/s · error % · p99 |

## Validation (lab)

1. Deploy version A (healthy). Generate load (k6 / OTel Demo load generator).
2. Deploy version B with an injected bug (e.g. env var `FAIL_RATE=0.2`) using a rolling update with `maxSurge: 1`.
3. Expect: annotation at deploy time; two lines on "error % by version"; B ≫ A; alert with `suspect: deploy` routed to the owning team.
4. Roll back: `kubectl rollout undo deploy/<name>`; the alert resolves; record time to detect and time to restore.

## Owners and communication

| Who | Action |
|---|---|
| Deploying team (on-call) | Decide rollback; post in deploy channel |
| SRE | Help if the cause isn't the release |
| Comms (if client-facing) | Status update per incident flow ([standard/20](../standard/20-ownership-and-communication.md)) |

## In Dynatrace

Version from `service.version` (OTel) or the pod label; deployment SDLC events from the pipeline; Davis relates the problem to the deployment; Site Reliability Guardian validates the release and can gate a rollback ([12](../standard/12-releases-and-dora.md)).

## Sources

- OTel semconv `service.version`; Kubernetes recommended labels
- Grafana annotations; Argo Rollouts analysis
- DORA: change failure rate
