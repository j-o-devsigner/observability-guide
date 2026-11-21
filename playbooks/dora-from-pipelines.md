# Playbook: DORA metrics from pipelines

| Field | Value |
|---|---|
| Problem | "We don't know how often or how safely we ship" |
| Layer(s) | Delivery |
| Method | DORA metrics from pipeline and incident events, see [standard/04](../standard/12-releases-and-dora.md#4-dora-metrics) |
| Status | draft (not yet validated in a lab) |
| Last validated | – |

## When to use it

- Leadership asks "are we getting faster or safer?"
- You want to prove that observability work (deploy markers, regression alerts) reduced change failures.
- You're starting the portfolio phases on CI/CD and want before/after numbers.

## The five metrics and their events

| Metric | Event needed | Where it comes from |
|---|---|---|
| Deployment frequency | "deploy succeeded" per service | Pipeline step after `kubectl rollout status` or Argo CD `on-deployed` |
| Change lead time | Commit time of each change in the deploy | Git (`git log` between previous and current deployed SHA) |
| Change failure rate | Deploy marked failed: rollback, hotfix, or incident with `suspect: deploy` | Rollback step, incident tool, alert labels |
| Failed deployment recovery time | Failed deploy → service restored | Incident open/resolve, or rollback finished |
| Deployment rework rate | Unplanned deploys caused by an incident | Deploys tagged `hotfix` / linked to an incident |

## Option A · Prometheus (simple, approximate ⚠️)

The pipeline pushes one gauge per service at the end of each deploy. Use the Pushgateway only because a deploy is a **service-level batch job** (the one valid use the Prometheus docs allow).

```bash
# Last step of the deploy job
cat <<EOF | curl -s --data-binary @- "$PUSHGATEWAY/metrics/job/deploy/service/checkout"
deploy_last_timestamp_seconds $(date +%s)
deploy_last_lead_time_seconds $LEAD_TIME_SECONDS
EOF

# Rollback / hotfix step: push only the failure timestamp (POST replaces only metrics with the same name)
echo "deploy_last_failed_timestamp_seconds $(date +%s)" \
  | curl -s --data-binary @- "$PUSHGATEWAY/metrics/job/deploy/service/checkout"
```

```promql
# Deployment frequency: deploys in the last 7 days (each push changes the timestamp)
changes(deploy_last_timestamp_seconds{service="checkout"}[7d])

# Failed deploys in the last 30 days (each rollback pushes a new timestamp)
changes(deploy_last_failed_timestamp_seconds{service="checkout"}[30d])

# Change failure rate (30 days)
changes(deploy_last_failed_timestamp_seconds{service="checkout"}[30d])
/
changes(deploy_last_timestamp_seconds{service="checkout"}[30d])
```

`changes()` counts value changes, so each push with a new timestamp counts as one event. A gauge that only flips between 0 and 1 would count hours in the failed state, not failures.

Limits: medians of lead time and recovery time are awkward in Prometheus because a gauge repeats its last value at every scrape. Use option B for those.

## Option B · Event store (accurate)

| Tool | How |
|---|---|
| Apache DevLake | Collects from GitHub/GitLab/Jenkins/Jira/PagerDuty and ships DORA dashboards for Grafana |
| Grafana annotations as events | The pipeline posts annotations tagged `deploy`, `rollback`, `hotfix`; query them via the annotations API for counts |
| OTel CI/CD semantic conventions | Pipeline runs as spans/metrics (`cicd.pipeline.run.duration`); still release candidate |

## Dashboard

Stat tiles with a sparkline per metric, compared with the previous period ([14](../standard/14-dashboards.md#1--stat-tiles-the-first-row)). Change failure rate and recovery time are "down is good".

## Validation

1. Deploy 5 times in a lab (kind + OTel Demo service); make one deploy fail and roll back.
2. Expect: frequency = 5, failures = 1, change failure rate = 20%, recovery time = rollback duration.
3. Compare with the pipeline history by hand.

## Owners and communication

| Who | Action |
|---|---|
| Team | Reviews DORA monthly with the SLO review |
| Engineering manager | Uses trends, never individual comparisons ⚠️ (DORA warns against using metrics as targets for teams) |

## Dynatrace equivalent

Deployment events (`CUSTOM_DEPLOYMENT` or SDLC events) and release validation with Site Reliability Guardian; DORA dashboards from SDLC events. *(📚 verify.)*

## Sources

- [DORA four keys](https://dora.dev/guides/dora-metrics-four-keys/) · [metrics history](https://dora.dev/insights/dora-metrics-history/) ✅
- [Prometheus: When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/) ✅
- [OTel semconv: CI/CD](https://opentelemetry.io/docs/specs/semconv/cicd/) ✅
- [Apache DevLake](https://devlake.apache.org/) 📚
