# 20 · Ownership and communication

> An alert without an owner is noise. A standard nobody hears about doesn't exist.
> This file defines **who is responsible for what** and **how information flows**.

## Who owns what (RACI)

R = Responsible (does it) · A = Accountable (one per row) · C = Consulted · I = Informed

| Activity | Service team | Platform / Observability team | SRE | Business owner | Eng. manager |
|---|---|---|---|---|---|
| Collector, backends, retention, cost | I | **A/R** | C | – | I |
| The standard (this guide) | C | C | **A/R** | – | I |
| Instrumentation of a service | **A/R** | C | C | – | I |
| SLO definition | R | – | C | C | **A** |
| Alerts + runbooks for a service | **A/R** | – | C (review) | – | I |
| Dashboards for a service | **A/R** | C (templates) | C | – | – |
| Business KPIs and their alerts | R | – | C | **A** | I |
| On-call response | **A/R** | C (platform issues) | C | I | I |
| Postmortem | R | C | **A** (facilitates) | I | I |
| Monthly alert / SLO review | R | C | **A** | I | I |

## Make ownership machine-readable

Ownership must be in the telemetry, not only on a wiki:

| Where | Label / attribute | Used for |
|---|---|---|
| K8s workloads | `app.kubernetes.io/part-of`, `team: payments` | k8sattributes → every signal |
| Telemetry | `service.namespace` or `team` | Alert routing, dashboard filters |
| Alert rules | `labels: { team: payments, severity: page }` | Alertmanager routing |
| Service catalog | Backstage `catalog-info.yaml` (owner, on-call, runbooks) | Single source of truth |

```yaml
# Alertmanager: route by team, then by severity
route:
  receiver: platform-default
  group_by: [alertname, service_name, client_id]
  routes:
    - matchers: [team="payments"]
      routes:
        - matchers: [severity="page"]
          receiver: payments-pager
        - matchers: [severity="ticket"]
          receiver: payments-tickets
```

Rule: **no alert merges without `team`, `severity` and `runbook_url`** (check it in CI with a linter / `promtool` + a small script).

## Severity levels and actions

Three scales, each with one job. Don't mix them:

| Scale | Answers | Values | Set by |
|---|---|---|---|
| **Service tier** | How important is the service? | Tier 1 / 2 / 3 ([18](18-automation-and-scale.md)) | Service file, reviewed yearly |
| **Alert severity** | What should the alert do right now? | `page` / `ticket` ([11](11-alerting.md)) | Alert definition |
| **Incident severity** | How bad is the impact, and how big is the response? | SEV1 – SEV4 | Incident Commander / on-call, can change during the incident |

### Incident severity: criteria

<div data-widget="viz" data-chart="severity-matrix"></div>

| Level | Criteria (any one is enough) ⚠️ | Examples |
|---|---|---|
| **SEV1 · Critical** | Tier-1 journey down or unusable for most users · data loss or a security breach exposing customer data · SLA breach in progress for a key client | Checkout returns errors for > 50% of requests; customer data exposed |
| **SEV2 · Major** | Tier-1 journey degraded for many users, or down for one important client · tier-2 service down with user impact · fast error-budget burn on a tier-1 SLO | Fabrikam (SLA client) can't pay; p99 latency 5× for 30 min |
| **SEV3 · Minor** | Partial loss of functionality for a minority of users · tier-2/3 degradation with a workaround · issue that becomes SEV2 if ignored | One region slow; batch job late but within the business deadline |
| **SEV4 · Low** | No current user impact · cosmetic or internal issue · risk to address in working hours | Disk forecast full in 10 days; a non-critical alert misbehaving |

Make the criteria **measurable** in your own version (e.g. % of users or requests affected, which journeys, which clients). Google's rule of thumb for declaring an incident at all: a **second team** is needed, the problem is **visible to customers**, or it is **unsolved after an hour** of focused work.

### Incident severity: actions

| | SEV1 | SEV2 | SEV3 | SEV4 |
|---|---|---|---|---|
| **Notification** | Page on-call + Incident Commander + team lead | Page on-call + IC | Page the owning team (high urgency in hours, ticket out of hours if no user impact) | Ticket |
| **Acknowledge within** ⚠️ | 5 min | 5 min | 30 min | Next working day |
| **Roles** | IC, Ops lead, Comms lead (separate people) | IC + Ops (IC may handle comms) | Owner on-call | Owner |
| **Incident channel / doc** | Yes, immediately | Yes | Optional | No |
| **Internal updates** ⚠️ | Every 30 min | Every 60 min | At resolution | – |
| **External / client comms** | Status page + affected clients within 30 min | Affected clients | Only if asked | – |
| **Leadership** | Informed immediately | Informed | – | – |
| **Change freeze** | Yes, for affected services | Yes, for affected services | No | No |
| **Postmortem** | **Required** (blameless), within 5 working days | **Required** | Optional (required if it repeats) | No |
| **Error budget** | Counts; triggers the policy if > 20% used ([10](10-slos-and-error-budgets.md)) | Counts | Counts | – |

### Rules

| Rule | Why |
|---|---|
| **When unsure, pick the higher level**; lower it later | Under-reacting costs more than over-reacting |
| **Don't debate severity on the incident call**; settle it in the postmortem | Time goes to mitigation |
| Severity can go **up or down** during the incident; announce every change | The response must match the current impact |
| Severity is about **impact**, not about how hard the fix is | A one-line fix to a full outage is still SEV1 |
| Mitigate first (rollback, failover, feature flag), find the root cause later | Users first |
| Only the Ops lead changes production during SEV1/SEV2 | No conflicting changes |

### In Dynatrace

| Concept | Dynatrace |
|---|---|
| Severity of events and problems | Standardized event severity: **1 Critical · 2 Major · 3 Minor · 4 Warning · 5 Informational**; a problem takes the highest severity of its events |
| Category of the problem | Availability, Error, Slowdown, Resource contention, Custom alert, Monitoring unavailable |
| Map to SEV and route | A **Workflow** on the problem trigger reads severity, category and the service's `tier` / `team`, sets the SEV, and notifies accordingly (SEV1/2 page the IC and the team; SEV3 pages the team; SEV4 opens a ticket). Routing workflows are generated per team ([dynatrace/](../dynatrace/)) |
| Custom alerts | Set the event severity in the alert's event template, consistent with the tier (e.g. tier-1 SLO fast burn → Critical/Major) |

## Communication flows

### 1. Incident flow

```text
Alert fires → routed by team label → on-call acknowledges (≤ 5 min for pages)
  → incident channel opened (#inc-YYYYMMDD-checkout) → roles: Incident Commander, Ops, Comms
  → status updates every 30 min (internal) / per SLA (clients)
  → resolved → postmortem in ≤ 5 working days (blameless)
  → action items with owners → tracked until closed → standard/playbook updated
```

| Role | Does |
|---|---|
| Incident Commander | Coordinates, decides, keeps the timeline |
| Ops lead | Investigates and fixes |
| Comms | Status page, client and stakeholder updates |

### 2. Change flow (deploys)

| Step | Communication |
|---|---|
| Deploy starts / ends | Automatic message + Grafana annotation (who, what version, PR link) |
| Regression detected | Alert with `suspect: deploy` to the deploying team |
| Rollback | Message in the deploy channel + annotation |
| Error budget exhausted | Notice to team + manager: freeze non-critical changes |

### 3. Standard-change flow (changing alerts, dashboards, SLOs)

| Step | How |
|---|---|
| Propose | Pull request to the alert rules / this guide |
| Review | Service owner + SRE review against [11-alerting](11-alerting.md) |
| Shadow | New or changed alerts go to a non-paging receiver for 1–2 weeks |
| Announce | Short note in the team channel: what changed, why, what to expect |
| Changelog | Every change recorded with date and reason |

### 4. Recurring rituals

| Ritual | Cadence | Who | Output |
|---|---|---|---|
| On-call handover | Each rotation | Outgoing + incoming on-call | Open issues, noisy alerts list |
| Alert review | Weekly / bi-weekly | Team + SRE | Delete, tune or fix noisy alerts |
| SLO review | Monthly | Team, manager, business owner | Budget status, targets, priorities |
| Observability health report | Quarterly | SRE → leadership | Maturity score, KPIs, roadmap |

## Sources

- Google SRE Book, ch. 14 *Managing Incidents*, ch. 15 *Postmortem Culture*
- PagerDuty Incident Response docs (roles, IC)
- [PagerDuty: Severity levels](https://response.pagerduty.com/before/severity_levels/) · [Atlassian: Incident severity levels](https://www.atlassian.com/incident-management/kpis/severity-levels) · [Atlassian incident handbook (postmortems for SEV1/2)](https://www.atlassian.com/incident-management/handbook/incident-response) ✅ 2026-11-20
- [Google SRE Book: Managing incidents (when to declare)](https://sre.google/sre-book/managing-incidents/) · [Workbook: Incident response (IC, CL, OL)](https://sre.google/workbook/incident-response/) ✅ 2026-11-20
- [Dynatrace: Standardized event severity](https://docs.dynatrace.com/docs/analyze-explore-automate/alerting-and-notifications/standardized-event-severity) · [Categories of Davis events](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/root-cause-analysis/concepts/events/event-types) ✅ 2026-11-20
- SEV criteria thresholds, acknowledgement times, update cadences: rules of thumb ⚠️
- Backstage software catalog
- Prometheus Alertmanager routing docs

> Official links and verification status: [REFERENCES.md](../REFERENCES.md)
