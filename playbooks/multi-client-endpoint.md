# Playbook: Multi-client endpoint

| Field | Value |
|---|---|
| Problem | "One client complains but the global dashboard looks fine" |
| Layer(s) | Service (per client) |
| Method | RED by `client.id` + minimum-count guard, see [standard/04](../standard/04-endpoint-coverage.md#multiple-clients-on-one-service) |
| Status | draft (alert tested with promtool; not yet validated in a lab) |
| Last validated | 2026-11-20, `rules/tests/patterns.test.yml` |

## When to use it

- A client reports errors or slowness, and the total error rate and latency look normal.
- A service has clients of very different sizes (one is 70% of traffic, another 5%).
- Contracts (SLAs) differ per client.

## Signals needed

| Signal | Name / attribute | Exists? |
|---|---|---|
| Metric | `http_server_request_duration_seconds_*` with a `client_id` label (bounded: tens of values) | |
| Trace | `client.id` span attribute | |
| Log | `client_id` field | |
| Source of the ID | Middleware from API key / JWT, or span metrics connector dimension at the gateway | |

## Queries

```text
// Dynatrace (DQL shape): error ratio and volume per client from server spans
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), errors = countIf(http.response.status_code >= 500) }, by:{ client.id }
| fieldsAdd error_ratio = errors[] / total[]
```

Open-source variant (PromQL):


```promql
# Error ratio per client (compare with the total)
sum by (client_id) (rate(http_server_request_duration_seconds_count{service_name="checkout", http_response_status_code=~"5.."}[5m]))
/
sum by (client_id) (rate(http_server_request_duration_seconds_count{service_name="checkout"}[5m]))

# Share of traffic per client (is the broken one small?)
sum by (client_id) (rate(http_server_request_duration_seconds_count{service_name="checkout"}[5m]))
/ ignoring (client_id) group_left
sum(rate(http_server_request_duration_seconds_count{service_name="checkout"}[5m]))

# p95 per client
histogram_quantile(0.95, sum by (client_id, le) (rate(http_server_request_duration_seconds_bucket{service_name="checkout"}[5m])))

# Did a client go silent? (traffic now vs same time last week)
sum by (client_id) (rate(http_server_request_duration_seconds_count{service_name="checkout"}[30m]))
< 0.2 * sum by (client_id) (rate(http_server_request_duration_seconds_count{service_name="checkout"}[30m] offset 1w))
```

## Alerts

| Alert | Rule | Status |
|---|---|---|
| Client error ratio high | `ClientErrorRatioHigh` in [rules/patterns.rules.yml](../rules/) (ratio > 5% **and** > 20 errors in 10m, `for: 5m`) | ✅ tested |
| Client went silent | Query above, `for: 15m`, ticket (page if the client has an SLA) | ⚠️ not tested |
| Per-client SLO | Copy the burn-rate rules with `by (service_name, client_id)` and the client's target | ⚠️ not tested |

## Dashboard

| Row | Panel |
|---|---|
| Per client | Table: req/s · errors (1h) · error % (colored) · p95, sorted by error % ([dashboards/service-red.json](../dashboards/)) |
| Per client | Meter list of error budget left per client ([14](../standard/14-dashboards.md)) |
| Overview | Traffic share per client as a segmented bar, not a pie |

## Validation

1. Generate traffic for three clients with very different volumes (k6 scenarios with different API keys).
2. Inject errors for the smallest client only (feature flag or fault injection by header).
3. Expect: total error rate stays below the global alert; `ClientErrorRatioHigh{client_id="small"}` fires; the table shows it on top.
4. Lower the small client's traffic to 1 request per minute with 1 error: the guard keeps the alert silent.

## Owners and communication

| Who | Action |
|---|---|
| Service team on-call | Investigates, mitigates |
| Account manager / client contact | Informed when an SLA client is affected (comms flow in [20](../standard/20-ownership-and-communication.md)) |

## In Dynatrace

With OpenTelemetry, `client.id` arrives as a span/metric attribute: split by it in DQL, build a custom alert per client (ratio + minimum count) and per-client SLOs for SLA clients. With OneAgent only: request attributes + calculated metrics split by that attribute.

## Sources

- [Span metrics connector: dimensions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md) ✅
- [Prometheus: Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) ✅
