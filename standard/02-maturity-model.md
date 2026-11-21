# 02 · Maturity model: what good observability looks like

> Score each dimension 0–4 for the current setup, decide the target, and the gap becomes the plan
> ([framework/transition-plan.md](../framework/transition-plan.md)). Don't aim for 4 everywhere: aim for what the business needs.

## Levels

| Level | Name | In one sentence |
|---|---|---|
| 0 | **Blind** | We learn about problems from users |
| 1 | **Reactive** | We have metrics and many alerts, mostly on causes (CPU, pods) |
| 2 | **Service-aware** | RED per service, SLOs, symptom alerts with owners and runbooks |
| 3 | **Correlated** | Metrics ↔ traces ↔ logs linked; releases, clients and owners on every signal |
| 4 | **Proactive** | SLOs drive decisions; deploys are gated by telemetry; business KPIs watched |

## Scorecard by dimension

| Dimension | 1 · Reactive | 2 · Service-aware | 3 · Correlated | 4 · Proactive |
|---|---|---|---|---|
| **Instrumentation** | Infra metrics, some app logs | RED via OTel / semconv on key services | Traces end to end, exemplars, structured logs with `trace_id` | Business events instrumented; auto-instrumentation by default |
| **Context** | Host / pod labels | `service.name`, env | + `service.version`, `team`, `client.id` | Service catalog drives labels |
| **Alerting** | Thresholds on causes, many duplicates | SLO burn rate, 2 severities, runbooks | Per-client / per-version, grouped, deploy-aware | Few pages, > 90% actionable, reviewed |
| **Dashboards** | One per person, no standard | Template per service (RED + SLO) | Drill-down to traces/logs, deploy annotations | Business + technical in one view |
| **Ownership** | "Whoever knows" | Team label on alerts | Routing by team, catalog | Owners review SLOs monthly with business |
| **Delivery** | Deploys invisible | Deploy annotations | Version dimension, regression alerts | Canary analysis, budget-based freezes, DORA tracked |
| **Process** | No postmortems | Postmortems for big incidents | Action items tracked, alert reviews | Learnings feed the standard; game days |
| **Cost / governance** | Unknown | Retention set per signal | Cardinality budgets, sampling | Cost per team visible |
| **Culture** (Westrum) | Pathological: messengers blamed, information hoarded | Bureaucratic: information follows the rules and channels | Generative leaning: blameless postmortems, failures lead to inquiry | Generative: high cooperation, information flows to who needs it |

### Measuring culture

DORA measures culture with Westrum's survey: people rate statements such as *"information is actively sought"*, *"failures are treated as opportunities to improve"*, *"new ideas are welcomed"* on a 1–7 scale, and the scores are averaged. DORA's research found that a high-trust culture where information flows freely predicts software delivery and organizational performance. Run it anonymously, once per quarter ⚠️.

## How to score fast (per dimension)

| Question | If no → level ≤ |
|---|---|
| Can you tell users are failing before they tell you? | 0 |
| Does every page have an owner and a runbook? | 1 |
| Is there an SLO for the top 3 user journeys? | 1 |
| Can you go metric → trace → log for one request in ≤ 3 clicks? | 2 |
| Can you split errors by version and by client? | 2 |
| Does a bad deploy get detected (or rolled back) automatically? | 3 |

## Showing the result

A dumbbell per dimension shows where the team moved, and how far it still is from the target:

<div data-widget="viz" data-chart="maturity-dumbbell"></div>

## Output format

```markdown
| Dimension | Current | Target | Gap (one line) |
|---|---|---|---|
| Alerting | 1 | 3 | 240 cause alerts, no SLOs, no grouping |
```

## Sources

- Google SRE Book & Workbook (SLOs, alerting, postmortems)
- CNCF TAG Observability, *Observability Whitepaper*
- DORA research: monitoring & observability capability (dora.dev)
- *Observability Engineering* (Majors, Fong-Jones, Miranda)
- [DORA: Generative organizational culture](https://dora.dev/capabilities/generative-organizational-culture/) ✅ 2026-11-20

*(The level names and the scorecard are this guide's own synthesis, not an official model.)*

> Official links and verification status: [REFERENCES.md](../REFERENCES.md)
