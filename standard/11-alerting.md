# 11 · Alerting

> **In 30 seconds:** page on **symptoms users feel**, never on causes like CPU. A **percentage** says how bad, a
> **count** says how many: good alerts check both. Prefer **SLO burn rate** over fixed thresholds. In Dynatrace,
> Davis covers infrastructure anomalies; you add **custom alerts on DQL** and **SLO burn-rate alerts** for service
> symptoms, and **Workflows** route them to the owning team.

## Choose the alert type

| Ask yourself… | Alert on… | Example |
|---|---|---|
| Is **every single occurrence** bad (money, security, data loss)? | **Count** (`> 0` or `> N`) | failed payment, message in DLQ, failed backup |
| Is it a **high-volume flow** where some failures are normal? | **Percentage (ratio)** | 5xx %, dependency timeout % |
| Is there an **SLO**? | **Burn rate** | 2% of the monthly budget burned in 1h ([10](10-slos-and-error-budgets.md)) |
| Is traffic **low or variable** (nights, small clients)? | **Ratio AND minimum count** | error % > 5% **and** ≥ 20 errors |
| Is the **absence** of something the problem? | **Count == 0** | no orders in 15 min, a client stopped calling |
| Is it a **resource limit**? | **% of capacity + time to exhaustion** | disk full in < 4h |

<div data-widget="alert-type-picker"></div>

## Who alerts on what (Dynatrace + OpenTelemetry)

| Symptom family | Source | Why |
|---|---|---|
| Kubernetes / infrastructure anomalies (OOM, restarts, node problems) | **Davis** (built-in) | Raised an OOM problem in 1 min with no setup (lab) |
| Service SLOs (availability, latency) | **SLO app** + burn-rate custom alert | Your targets, not a baseline |
| Per client, per version, business counts and absence | **Custom alerts** (anomaly detectors) on DQL | Bounded segments you control |
| Collector pipeline health | Custom alerts on collector self-monitoring metrics ([16](16-collector-templates.md#self-monitoring)) | A dead pipeline can't alert on itself |
| Frontend | RUM health alerts / synthetic monitors ([07](07-frontend-experience.md)) | What users experience |

Alert severity (`page` / `ticket`) says what the alert does now; **incident severity** (SEV1–SEV4) says how big the response is: criteria and actions in [20](20-ownership-and-communication.md#severity-levels-and-actions).

Rule: **each symptom has exactly one alert source**. Davis groups related events into one problem; Workflows route by team.

## 1. Percentage (ratio)

Normalizes against traffic, so one threshold works at 10 req/s and at 10,000 req/s. Use it for high-volume flows and for comparing segments of different sizes.

```text
// DQL shape: 5xx ratio per route for checkout (server spans)
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), errors = countIf(http.response.status_code >= 500) }, by:{ http.route }
| fieldsAdd error_ratio = errors[] / total[]
```

**Weak spot: low traffic.** 1 error out of 2 requests = 50% → a page at 3 a.m. for one request.

## 2. Count

Each event matters on its own (payments, DLQ, security), the event is rare by design, or you alert on absence.

```text
// DQL shape: messages that reached the dead-letter queue in the last window (from your DLQ metric or logs)
timeseries dlq = sum(<dlq messages metric>), by:{ queue }
```

**Weak spot: high traffic.** `errors > 100` storms at peak and stays silent when 100% of a small flow fails.

## 3. Ratio AND minimum count (the default service alert)

```text
// DQL shape: per client, error ratio > 5% AND more than 20 errors in the window
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), errors = countIf(http.response.status_code >= 500) }, by:{ client.id }, interval:10m
| fieldsAdd error_ratio = errors[] / total[]
// Custom alert: condition on error_ratio, plus a second condition (or filter) on errors > 20
```

<div data-widget="low-traffic-checker"></div>

| Guard | When |
|---|---|
| Minimum **errors** | Default: enough people were affected |
| Minimum **traffic** | When the ratio must be statistically meaningful |
| **Longer window** for small segments | Low-traffic clients: 1h instead of 10m |
| **Synthetic traffic** | When real traffic is too thin to ever be meaningful |

<details>
<summary>Open-source variant (Prometheus)</summary>

```promql
(
  sum by (client_id) (rate(http_server_request_duration_seconds_count{http_response_status_code=~"5.."}[10m]))
  / sum by (client_id) (rate(http_server_request_duration_seconds_count[10m])) > 0.05
)
and on (client_id)
( sum by (client_id) (increase(http_server_request_duration_seconds_count{http_response_status_code=~"5.."}[10m])) > 20 )
```

Tested versions of every pattern, with promtool unit tests: [rules/](../rules/).

</details>

## 4. Burn rate

Compare the error ratio with the error budget instead of a fixed %. Details, multi-window table and the Dynatrace SLO setup: [10](10-slos-and-error-budgets.md).

<div data-widget="burn-calculator"></div>

## 5. Case catalog

<div data-widget="table-filter" data-column="2"></div>

| Case | Type | Where (Dynatrace) | Severity |
|---|---|---|---|
| API 5xx errors | Burn rate + min count | SLO app + custom alert | Page |
| API latency | Share of requests under threshold (not the average) | Latency SLO | Page / Ticket |
| One client broken, others fine | Ratio **per client** + min count | Custom alert, `by:{client.id}` | Page |
| A client went silent | Traffic drop vs last week | Custom alert (DQL with `shift`) or Davis baseline | Ticket / Page if SLA |
| Payments failed | Count | Custom alert on a business metric / event | Page |
| DLQ received messages | Count | Custom alert | Ticket |
| Batch / CronJob failed | Count or "no success in 2 intervals" | Custom alert ([06](06-workload-types.md)) | Ticket |
| OOMKilled, crash loops, node pressure | Infrastructure anomaly | **Davis** | Ticket / Page by impact |
| Disk / volume filling | Capacity + prediction | Davis / custom alert | Page if < 4h |
| Certificate expiring | Time left | Synthetic / custom alert | Ticket |
| Collector pipeline failing | Pipeline health | Custom alert on `otelcol_*` | Page |
| Avg order price below goal | Business ratio, long window | Custom alert on business events | Business owner |
| No orders at all | Absence | Custom alert (business hours) | Page |
| CPU high | **Don't alert** (cause) | Dashboard | – |

## 6. Rules for every alert

| # | Rule |
|---|---|
| 1 | **Symptoms, not causes.** Page on errors, latency, absence; CPU and memory go on dashboards |
| 2 | **Every page is actionable and urgent**; otherwise it's a ticket or nothing |
| 3 | **Two severities**: page (now) and ticket (working hours) |
| 4 | **Owner, runbook, dashboard link** and the affected segment (`client.id`, `http.route`) in the message |
| 5 | **Windows / dealerting samples** so blips don't fire (5–15 min for most symptoms) |
| 6 | **Ratios get a minimum-count guard** |
| 7 | **Bounded dimensions only** (`client.id`, `http.route`, region), never user IDs or raw URLs |
| 8 | **One notification per incident**: Davis problem grouping + one Workflow per team |
| 9 | **Test it**: inject the failure, see the problem open and close |
| 10 | **Review regularly**: never fires or always fires → fix or delete |

## 7. Cleaning up a noisy alert set

| Step | How (Dynatrace) |
|---|---|
| 1. Measure 30 days | Problems app / DQL on problem events: count per alert definition, time to close, how many led to action |
| 2. Classify each alert | Fires/month · % acted on · duplicate of · symptom or cause · owner |
| 3. Decide | Table below |
| 4. Shadow, then cut over | New alerts notify a non-paging channel for 1–2 weeks first ([transition plan](../framework/transition-plan.md)) |
| 5. Track | Pages per shift ≤ 2, > 80–90% acted on, ~1 notification per incident |

| Finding | Action |
|---|---|
| Fires often, nobody acts | Delete, or move to a dashboard |
| Cause alert (CPU, memory, one pod) | Replace with a symptom / SLO alert |
| Fires with every other alert | Rely on Davis grouping; one Workflow per team |
| Ratio firing at night | Minimum-count guard or longer window |
| Count firing at peak | Convert to a ratio |
| Flapping | More dealerting samples, longer windows, multi-window burn rate |
| Never fired in 6+ months | Test it; if it can't fire, fix it; if not needed, delete |
| No owner / runbook | Assign, or delete |

Playbook: [noisy alerts cleanup](../playbooks/noisy-alerts-cleanup.md).

## Common mistakes

| ❌ | ✅ |
|---|---|
| `errors > 10` on a busy API | Ratio or burn rate |
| Ratio with no guard | Ratio **and** minimum count |
| Alert on average latency | % of requests under the threshold |
| Only a global alert on a multi-client service | Per-client alerts |
| Page for CPU > 80% | Dashboard |
| The same symptom alerted by Davis **and** a custom alert | One source per symptom |
| Alert without a runbook | Write it, or delete the alert |

## Prompt for an agent (alert review)

```text
Review these alert definitions (Dynatrace custom alerts / SLO alerts, or Prometheus rules) against 10-alerting.
For each: name | type (ratio/count/burn/absence/capacity) | symptom or cause | problems | keep/rewrite/merge/delete | rewritten condition.
Flag: ratios without a minimum-count guard, counts on high-volume flows, cause-based pages, missing owner/runbook,
no dealerting window, per-pod alerts, unbounded dimensions, missing per-client or per-version split,
symptoms alerted twice (Davis + custom alert).
```

## Sources

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) · [Being On-Call](https://sre.google/sre-book/being-on-call/) ✅
- [Prometheus: Alerting practices](https://prometheus.io/docs/practices/alerting/) (symptoms, Ewaschuk's essay) ✅
- [Dynatrace: Anomaly detection (custom alerts on DQL)](https://docs.dynatrace.com/docs/dynatrace-intelligence/anomaly-detection/anomaly-detection-configuration) · [Best practices to avoid over-alerting](https://docs.dynatrace.com/docs/dynatrace-intelligence/use-cases/avoid-overalerting) · [Event analysis and correlation](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/root-cause-analysis/concepts/events) ✅ 2026-11-20
- [Dynatrace: Workflow event triggers](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/build/trigger/event-trigger) ✅ 2026-11-20
- [Dynatrace: DQL aggregation commands](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/commands/aggregation-commands) ✅ 2026-11-20
- Thresholds (5%, 20 errors), case catalog, cleanup steps: rules of thumb ⚠️
