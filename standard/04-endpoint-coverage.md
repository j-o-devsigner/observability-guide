# 04 · Endpoint coverage (metrics, traces, logs)

> What every endpoint must emit. Based on the OpenTelemetry HTTP semantic conventions,
> so names are the same in every language.

## Required signals

| Signal | Job | Required |
|---|---|---|
| **Metrics** | Detect | `http.server.request.duration` histogram with `http.route`, `http.request.method`, `http.response.status_code`. Saturation: `http.server.active_requests`, pool/queue metrics |
| **Traces** | Locate | One server span per request; child spans for DB, cache, downstream calls. Tail sampling: keep 100% of errors and slow requests + a small share of the rest. Exemplars on the histogram |
| **Logs** | Explain | Structured JSON with `trace_id`, `span_id`. Errors and business events, not every 200 OK |

## Required resource attributes (on every signal)

| Attribute | Example | Why |
|---|---|---|
| `service.name` | `checkout` | Groups everything by service |
| `service.version` | `1.42.0` or image tag / git SHA | **Release correlation**, see [12](12-releases-and-dora.md) |
| `service.namespace` / `team` | `payments` | **Ownership and alert routing**, see [20](20-ownership-and-communication.md) |
| `deployment.environment.name` | `prod` | Keep test traffic out of prod SLOs |
| `k8s.*` (via k8sattributes processor) | `k8s.pod.name`, `k8s.deployment.name` | Link to Resources layer |

⚠️ Use `http.route` (`/orders/{id}`), never the raw URL. Never put `user.id` or `order.id` on metrics.

## Business metrics

Infrastructure can't know business rules: the app emits them (or you derive them from span attributes).

<details>
<summary>Open-source variant (PromQL)</summary>

```promql
# Average order price over 1h below a goal of 50
sum(rate(order_value_sum[1h])) / sum(rate(order_value_count[1h])) < 50
```

</details>

| Practice | Why |
|---|---|
| Histograms for amounts | count + sum (average) + percentiles from one metric |
| Long windows, compare with last week | Business numbers are noisy minute by minute |
| Route to a business owner | Usually not a reason to page on-call |
| Bounded labels only (`client.id`, `category`) | IDs belong in traces/logs |

## Multiple clients on one service

**If you only alert on the total, the big client hides the small ones.** Client C = 2% of traffic, 100% failing → global error rate 2% → nothing fires.

1. Put `client.id` on spans and metrics (middleware from API key/JWT), or derive RED metrics at the gateway:

```yaml
# Component renamed to span_metrics; the old name spanmetrics still works but is deprecated (README, 2026-11)
connectors:
  spanmetrics:
    dimensions:
      - name: http.route
      - name: client.id
```

2. Alert on ratios **per client**, with a minimum-count guard ([11 §3](11-alerting.md)).
3. Policy per client:

| Situation | Approach |
|---|---|
| Different contracts | SLO target per client (Gold 99.95%, Standard 99.5%) |
| Low-traffic client | Longer windows, min-count guard, or synthetic traffic |
| Client stopped calling | Traffic drop vs last week (`offset 1w`) |
| Global view | Keep a total SLO for capacity and the platform team |
