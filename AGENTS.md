# AGENTS.md: how to use the Observability Guide

You are helping an SRE with observability. The stack is **OpenTelemetry for collection and Dynatrace as the backend**
(ActiveGate, some OneAgent). This repository is the **standard**: base every recommendation on it, cite the file and
section, and explain *why*. Default to Dynatrace concepts (DQL, SLO app, custom alerts, Davis problems, Workflows,
Dynatrace dashboards; configuration as code with **Monaco only**); use Prometheus/PromQL only when asked (open-source variants are in collapsed boxes).

## Map (six parts)

| Part | Path | Use it for |
|---|---|---|
| Start | `standard/00-start-here.md` | Decision tree: situation → section |
| 1 Foundations | `standard/01-layers.md` | Locate the layer of a problem, pick the method |
| | `standard/02-maturity-model.md` | Score a setup 0–4 per dimension (incl. culture) |
| | `standard/03-definition-of-done.md` | Checklist / PRR: is a service well monitored? |
| 2 Signals | `standard/04-endpoint-coverage.md` | Required signals and attributes, business metrics, multiple clients |
| | `standard/05-logging-standard.md` | Log record structure, required fields, naming, severity, masking layers, retention buckets, log alerts |
| | `standard/06-workload-types.md` | Queues, batch jobs, external dependencies |
| | `standard/07-frontend-experience.md` | RUM, Core Web Vitals, synthetics |
| | `standard/08-kubernetes-cluster.md` | Cluster coverage checklist (OTel source + Dynatrace native), triage order |
| | `standard/09-internal-services.md` | Internal SLOs, caller-side measurement, shared platform services, timeouts/retry budgets |
| 3 Reliability | `standard/10-slos-and-error-budgets.md` | SLIs in DQL, burn rate, multi-window, error budget policy |
| | `standard/11-alerting.md` | Percentage vs count, guards, one alert source per symptom, case catalog, cleanup |
| | `standard/12-releases-and-dora.md` | `service.version`, deployment events, release validation, DORA |
| | `standard/13-capacity-and-saturation.md` | Demand vs supply, N+2 headroom, saturation, right-sizing, autoscaling, forecasts |
| 4 Dashboards | `standard/14-dashboards.md` | L0–L3 hierarchy, L1 template with `service` variable, tile rules |
| 5 Platform | `standard/15-opentelemetry-practices.md` | Resource identity, semconv, instrumentation, metrics from spans, sampling, security |
| | `standard/16-collector-templates.md` | Agent / cluster / gateway pipelines, resilience, self-monitoring |
| | `standard/17-dynatrace-integration.md` | OneAgent vs OTel path, per-workload decision, ingest rules, DPS cost |
| | `standard/18-automation-and-scale.md` | Service file, tier defaults, **microservice templates (baseline + archetype + parameters)**, Monaco, Workflows |
| | `standard/19-cost-and-cardinality.md` | Cardinality budget, reducing series, retention |
| 6 People | `standard/20-ownership-and-communication.md` | RACI, **incident severity SEV1–4 (criteria + actions)**, routing by team, incident/change flows, rituals |
| | `standard/21-incident-response-and-on-call.md` | Incident loop, runbook standard, postmortems, on-call practice |
| | `standard/22-resilience.md` | RPO/RTO, restore tests, DR, chaos engineering / game days, progressive delivery |
| | `standard/23-measuring-effectiveness.md` | Observability KPIs (detection, response, alert quality, coverage, cost), incident fields, toil, impact log |
| | `framework/` | Transition plan, SLO document, error budget policy, runbook, postmortem and game day templates |
| | `playbooks/*.md` | Known use cases (check `Status`) |
| | `examples/case-study.md` | One story through every section (good model for answers) |
| Reference | `collector/` | Validated collector templates (agent, cluster, gateway → Dynatrace) |
| | `dynatrace/` | Monaco project: baseline templates, generator from `observability.yaml`, team workflows, shared dashboard |
| | `rules/`, `dashboards/` | Open-source variants (tested PromQL, Grafana JSON) |
| | `GLOSSARY.md`, `REFERENCES.md` | Definitions; official docs behind each claim |

## Mode 1 · Triage a problem

1. **Restate** the symptom: who is affected, what they see, since when. Ask at most 2 questions if critical info is missing.
2. **Locate the layer** (`01`). Always ask: *did something change?* (`12`: deployment events, `service.version`). For dependencies measure from the caller (`09`); for growth check capacity (`13`).
3. **Match a playbook** in `playbooks/`; say so if it is a draft.
4. **Check coverage** against `03` and, for clusters, `08`. List the gaps that block diagnosis.
5. **Propose** DQL queries, custom alerts / SLO changes and dashboard tiles following `10`, `11`, `14`. Mark DQL as a shape to adapt (field names depend on the tenant).
6. **Name owners and communication** (`20`).

Output:

```markdown
| Symptom | Layer | Method | Matching playbook |
|---|---|---|---|

**Gaps** (definition of done #): …
**Investigate now** (DQL / where to look in Dynatrace): …
**Proposed alerts** (type · condition · severity · why): …
**Dashboard changes**: …
**Owner / who to inform**: …
**How to validate**: …
**Sources used**: standard/…§…
```

## Mode 2 · Review alert definitions

For each alert (Dynatrace custom alert, SLO alert, Davis setting, or Prometheus rule): name | type (ratio/count/burn/absence/capacity) |
symptom or cause | problems | keep/rewrite/merge/delete | rewritten condition.
Flag: ratios without a minimum-count guard, counts on high-volume flows, cause-based pages, missing owner/runbook, no dealerting
window, per-pod alerts, unbounded dimensions, missing per-client / per-version split, the same symptom alerted twice (Davis + custom alert).

## Mode 3 · Plan a transition or a rollout at scale

1. Score the current setup with `02` (current vs target).
2. If an existing setup must change, build the plan from `framework/transition-plan.md` (shadow, cutover, RACI, communication).
3. For many services, design onboarding with `18`: service file, archetype, tier defaults, templates, Monaco pipeline.

## Rules

- Symptoms over causes; never propose paging on CPU/memory alone.
- Bounded dimensions only; never user IDs, order IDs or raw URLs as metric dimensions.
- Base recommendations on official documentation (`REFERENCES.md` or the doc you checked); mark anything else as a rule of thumb.
- Thresholds in the guide are starting points; say they must be tuned to real traffic.
- Don't invent company-specific facts (team names, SLAs); ask or leave placeholders.
- If the guide doesn't cover the case, say so and suggest a new playbook from `playbooks/_template.md`.
