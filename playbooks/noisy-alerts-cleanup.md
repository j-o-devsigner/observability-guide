# Playbook: Noisy alerts cleanup

| Field | Value |
|---|---|
| Problem | "On-call gets too many alerts and ignores most of them" |
| Layer(s) | All (process) |
| Method | Inventory → classify → delete / tune / group → measure, see [standard/11 §7](../standard/11-alerting.md#7-cleaning-up-a-noisy-alert-set) |
| Status | draft |
| Last validated | – |

## When to use it

- More than ~2 pages per on-call shift (Google SRE limit).
- People mute channels or acknowledge without reading.
- The same incident produces many notifications.

## Step 1 · Inventory (last 30 days)

```promql
# Times each alert started firing
sort_desc(sum by (alertname) (changes(ALERTS{alertstate="firing"}[30d])))

# Alerts firing right now and for how long they have been active
ALERTS{alertstate="firing"}
```

Export notifications from Alertmanager or the incident tool and build this table:

| Alert | Fires / month | % acted on | Symptom or cause | Duplicate of | Owner | Runbook |
|---|---|---|---|---|---|---|
| | | | | | | |

## Step 2 · Decide per alert

| Finding | Action | Pattern |
|---|---|---|
| Fires often, nobody acts | Delete, or move to a dashboard | – |
| Cause alert (CPU, memory, one pod) | Replace with a symptom / SLO alert | [rules/checkout-slo.rules.yml](../rules/) |
| Ratio firing at night | Add a minimum-count guard | `ClientErrorRatioHigh` in [rules/patterns.rules.yml](../rules/) |
| Count firing at peak | Convert to a ratio | [11 §1](../standard/11-alerting.md) |
| Flapping | More dealerting samples, longer windows, multi-window burn rate | [10](../standard/10-slos-and-error-budgets.md) |
| Many alerts per incident | Davis problem grouping + one Workflow per team (Alertmanager `group_by` / inhibition in the open-source variant) | below |
| No owner or runbook | Assign, or delete | [20](../standard/20-ownership-and-communication.md) |

```yaml
# Alertmanager: one notification per service incident; silence pod alerts while the service page fires
route:
  group_by: [alertname, service_name, client_id]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
inhibit_rules:
  - source_matchers: [severity="page"]
    target_matchers: [severity="ticket"]
    equal: [service_name]
```

## Step 3 · Shadow, then cut over

New and changed alerts go to a non-paging receiver for 1–2 weeks. Compare: did they catch every real incident? How many false positives did the old ones produce? Then switch paging ([transition plan](../framework/transition-plan.md)).

## Step 4 · Measure

| KPI | Target |
|---|---|
| Pages per on-call shift | ≤ 2 |
| % of pages acted on | > 80–90% ⚠️ |
| Notifications per incident | ≈ 1 |
| Alerts with owner + runbook | 100% |

Show the trend as stat tiles with sparklines in the monthly review ([14](../standard/14-dashboards.md)).

## Validation

Re-run the inventory query after 30 days and compare with step 1. The case study went from 38 alerts and ~9 pages per week to 9 alerts and ~1 page per week ([examples/case-study.md](../examples/case-study.md)).

## Owners and communication

| Who | Action |
|---|---|
| SRE | Facilitates the review, owns the standard |
| Service teams | Decide on their alerts (they are accountable) |
| On-call | Brings the noisy-alert list to each handover |

## Dynatrace equivalent

Davis groups related events into one problem automatically; alerting profiles filter which problems notify whom. *(📚 verify.)*

## Sources

- [Google SRE Book, *Being On-Call*](https://sre.google/sre-book/being-on-call/) ✅
- [Prometheus Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/): `group_by`, `inhibit_rules` 📚
- [Prometheus alerting practices](https://prometheus.io/docs/practices/alerting/) ✅
