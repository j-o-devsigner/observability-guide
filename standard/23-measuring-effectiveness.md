# 23 · Measuring effectiveness: is the observability working, and what did I change?

> **In 30 seconds:** measure **outcomes**, not outputs. Not "dashboards built" but: are problems **found by monitoring
> before customers** (detection), **fixed faster** (response), are pages **worth waking up for** (alert quality), is
> every service **covered** (coverage), and does it cost what it should (cost)? Record a few fields on every incident,
> compute the same KPIs every month, and keep an **impact log** of what you changed and what moved.

## The scorecard

<div data-widget="viz" data-chart="effectiveness-tiles"></div>

| Family | KPI | Definition | Target ⚠️ | Data from |
|---|---|---|---|---|
| **Detection** | % incidents detected by monitoring | Incidents whose first signal was an alert ÷ all incidents | > 80% | Incident record (`detected_by`) |
| | MTTD (time to detect) | First alert − impact start | Down, minutes | Incident record, problem start |
| **Response** | MTTA (time to acknowledge) | Acknowledged − alerted | < 5 min (pages) | On-call tool |
| | Time to mitigate | Users no longer affected − impact start | Down | Incident record |
| | MTTR (define one "R") | Resolved − impact start (state which R: repair, recovery, resolve) | Down | Incident record / problem end |
| **Alert quality** | Precision | Pages that needed action ÷ all pages | > 80–90% | On-call review |
| | Recall | Incidents preceded by an alert ÷ incidents | > 80% | Incident record |
| | Pages per on-call shift | Incidents per 12 h shift | ≤ 2 | On-call tool |
| | Notifications per incident | Notifications ÷ incidents | ≈ 1 | On-call tool / Workflows |
| **Coverage** | Services meeting the definition of done | Tier-1/2 services passing [03](03-definition-of-done.md) ÷ all | 100% tier 1 | Monaco/CI checks ([18](18-automation-and-scale.md)) |
| | Services with an SLO | Tier-1 services with SLO + policy ÷ all tier-1 | 100% | SLO app |
| | Time to onboard a new service | First deploy → fully observed | < 1 day | Pipeline events |
| **Reliability** | SLO compliance | Services within SLO over 28 days ÷ all with SLO | Up | SLO app |
| | Repeat incidents | Incidents with the same contributing factor within 90 days | Down | Postmortems |
| | Postmortem actions closed on time | Closed by due date ÷ due | > 80% | Backlog |
| **Delivery** | DORA (frequency, lead time, CFR, recovery, rework) | [12](12-releases-and-dora.md) | Trend | SDLC events |
| **Operations** | Toil % | Time on toil ÷ total ops time | < 50% | Survey / ticket tags ([below](#toil)) |
| | After-hours pages | Pages outside working hours per week | Down | On-call tool |
| **Cost** | Observability cost per service / per team | Ingest + retention cost by `team` | Stable or down per unit of traffic | Billing metrics ([17](17-dynatrace-integration.md#cost-what-drives-the-bill-dps)) |
| **Adoption** | Dashboards and alerts outside Git | Hand-made objects | 0 | Monaco diff |
| | Maturity score | [02](02-maturity-model.md) per dimension | Up each quarter | Quarterly self-assessment |

## Record these fields on every incident

Every KPI above comes from a handful of fields. Make them mandatory in the incident template.

| Field | Example |
|---|---|
| Impact start | 14:05 (from data, not from the first message) |
| Detected at · **detected by** | 14:09 · alert / customer / employee / synthetic |
| Acknowledged at | 14:10 |
| Mitigated at · resolved at | 14:14 · 14:19 |
| Severity (SEV1–4) · service · tier | SEV2 · checkout · 1 |
| Alert(s) that fired · runbook used (y/n) · runbook helpful (y/n) | release regression · y · y |
| Change related? (deployment / config / none) | deployment 1.42.0 |
| Postmortem link · actions | link · 2 actions |

## How the trend should look

<div data-widget="viz" data-chart="detection-trend"></div>

## Toil

Toil (SRE book): work that is **manual, repetitive, automatable, tactical, without enduring value, and grows with the service**. Google keeps it **under 50%** of SRE time; its surveys average about a third.

| Step | How |
|---|---|
| Measure | Tag tickets as toil; quarterly survey "% of your time on toil"; count manual runbook steps executed |
| Rank | By hours per month × people affected |
| Remove | Top 3 per quarter: automate (Workflows, scripts), fix the cause, or delete the work |
| Track | Toil % per quarter in the scorecard |

## Cases: what "effective" looks like in numbers

| Case | Before | Change | After | Evidence type |
|---|---|---|---|---|
| **Pipeline resilience** | 83% of logs lost in a 10-min backend outage | Persistent agent queue, retries without limit, backpressure | **0% lost**, also with an agent restart | ✅ Measured in the aks-observability lab |
| **Label churn** | 470 new series per container restart, 50 labels | Label allow-list in the gateway | **18 new series**, 28 labels | ✅ Measured in the lab |
| **Pipeline failure detection** | Dynatrace built-in "monitoring unavailable": ~24 min | Collector self-monitoring alerts | **4–11 min** | ✅ Measured in the lab |
| **Alert noise** | ~9 pages/week, 12% acted on | Symptom/SLO alerts, guards, shadow mode, deleted 29 alerts | ~1 page/week, 90% acted on | Example ([case study](../examples/case-study.md)) |
| **Detection** | 60% of incidents reported by customers, MTTD 40 min | Per-client and per-version alerts, synthetic journeys | 15% customer-reported, MTTD 4 min | Example ⚠️ |
| **Coverage at scale** | 10% of services with an SLO, 2 weeks to onboard | `observability.yaml` + Monaco pipeline | 95% with SLO, onboard in < 1 day | Example ⚠️ |
| **Release safety** | Change failure rate 18%, recovery 45 min | Version split, deployment events, release validation, rollback runbook | CFR 8%, recovery 14 min | Example ⚠️ |
| **Cost** | All metrics and histograms sent to Dynatrace | Gateway filter: drop unused histograms, label allow-list | −35% metric data points billed | Example ⚠️ |

Use the same definitions before and after; otherwise the comparison means nothing.

## Measuring yourself (impact as an SRE)

| Practice | How |
|---|---|
| **Impact log** | One line per change: date · problem · what you did · **measurable result** · link (PR, postmortem, dashboard) |
| **Baseline first** | Record the KPI *before* you change anything (pages/week, MTTD, cost, coverage) |
| **Outcomes over outputs** | "Pages −80%" beats "built 12 dashboards"; "MTTD 40 → 4 min" beats "added alerts" |
| **Quarterly review** | Scorecard + maturity rescore ([02](02-maturity-model.md)); pick next quarter's top 3 |
| **Ask the users of your work** | On-call survey (sleep, trust in alerts, runbook quality); service teams' onboarding feedback |
| **Tell it as a story** | Situation → task → action → result with numbers: for reviews, interviews and posts |

```text
Impact log
2026-10-22 · Logs lost during backend outages (83%) · persistent queue + backpressure in collectors · 0% lost in chaos test · results/log-loss.md
2026-10-20 · Collector failures invisible for ~24 min · self-monitoring alerts on otelcol_* · detected in 4–11 min · results/pipeline-faults.md
```

## Common mistakes

| ❌ | ✅ |
|---|---|
| Counting outputs (dashboards, alerts, configs) | Outcomes: detection, response, quality, coverage, cost |
| MTTR without saying which "R" | Define the start and end points once |
| Using KPIs as targets for individuals or to rank teams | Trends per team; DORA warns against metrics as targets (Goodhart's law) |
| Measuring only after the change | Baseline first |
| A scorecard nobody looks at | Monthly review, quarterly decisions |

## Sources

- [Atlassian: MTTA, MTTR, MTBF](https://www.atlassian.com/incident-management/kpis/common-metrics) · [Choosing incident KPIs](https://www.atlassian.com/incident-management/kpis) ✅ 2026-11-20
- [Google SRE Book: Eliminating toil](https://sre.google/sre-book/eliminating-toil/) · [Being on-call](https://sre.google/sre-book/being-on-call/) ✅
- [Google SRE Workbook: Operational overload (pager budget)](https://sre.google/workbook/overload/) ✅ 2026-11-20
- [DORA four keys](https://dora.dev/guides/dora-metrics-four-keys/) ✅
- Lab cases: `~/projects/aks-observability/results/` (log-loss, cardinality, pipeline-faults) ✅ measured
- Targets and the example cases: rules of thumb / illustrative ⚠️
