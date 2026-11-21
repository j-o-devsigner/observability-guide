# Dashboards as code

> **Open-source variant.** The L1 service template from [standard/14](../standard/14-dashboards.md) as importable Grafana JSON. With Dynatrace, build the same tiles in Dynatrace Dashboards and keep the export as the template ([18](../standard/18-automation-and-scale.md)).

| File | What |
|---|---|
| [`service-red.json`](service-red.json) | Service dashboard: SLO status → RED → per client → per version → saturation, with deploy annotations |
| [`generate.py`](generate.py) | Generates the JSON. Edit this, not the JSON |
| [`check.sh`](check.sh) | Imports every dashboard into a throwaway Grafana and fails if one is rejected |

## Layout of `service-red`

| Row | Panels | Question |
|---|---|---|
| SLO status | Availability 28d, budget left, burn rate 1h, req/s | Are we OK? |
| RED overview | Requests and error % as two stacked panels on the same time axis (no second y-axis); latency heatmap; p50/p95/p99 | What changed? |
| Per client | Table: req/s, errors (1h), error % (colored), p95, sorted by error % | Who is affected? |
| Per version | Error % by version; traffic share by version (stacked %) | Did a release cause it? |
| Saturation | CPU throttling, memory vs limit, active requests | Why? |

Variables: `datasource`, `namespace`, `service`, `slo`. Annotations: Grafana annotations tagged `deploy` (from the pipeline or Argo CD) and rollouts derived from kube-state-metrics.

## Use it

```bash
python3 -I dashboards/generate.py     # regenerate after editing
make check-dashboards                 # import test (Docker, grafana/grafana:11.6.0)
```

Import in Grafana: **Dashboards → New → Import → upload `service-red.json`**, or provision it from a ConfigMap with the Grafana sidecar.

## Status

| Check | Result |
|---|---|
| Imports into Grafana 11.6.0 (18 panels stored) | ✅ 2026-11-20 |

Requirements: metrics named per OTel semconv (`http_server_request_duration_seconds_*`), with `service_name`, `service_version` and `client_id` labels ([12](../standard/12-releases-and-dora.md#1-version-on-every-signal)), plus kube-state-metrics and cAdvisor.
