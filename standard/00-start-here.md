# 00 · Start here

> **In 30 seconds:** this guide is a standard for observability with **OpenTelemetry (collection) and Dynatrace
> (backend)**. It has six parts. Pick your situation below, read that section, and use the rest as reference.
> Open-source variants (Prometheus, Grafana) appear in collapsed boxes where useful.

## The six parts

| Part | Sections | Answers |
|---|---|---|
| **1. Foundations** | [01 Layers](01-layers.md) · [02 Maturity](02-maturity-model.md) · [03 Definition of done](03-definition-of-done.md) | Where does a problem live? How good are we? When is a service "monitored"? |
| **2. Signals** | [04 Endpoints](04-endpoint-coverage.md) · [05 Logging](05-logging-standard.md) · [06 Queues, batch, external](06-workload-types.md) · [07 Frontend](07-frontend-experience.md) · [08 Kubernetes](08-kubernetes-cluster.md) · [09 Internal & platform services](09-internal-services.md) | What must each kind of component emit? |
| **3. Reliability** | [10 SLOs](10-slos-and-error-budgets.md) · [11 Alerting](11-alerting.md) · [12 Releases & DORA](12-releases-and-dora.md) · [13 Capacity](13-capacity-and-saturation.md) | What do we promise, when do we page, which change broke it, will it fit next quarter? |
| **4. Dashboards** | [14 Dashboards](14-dashboards.md) | How do we show it? |
| **5. Platform** | [15 OTel practices](15-opentelemetry-practices.md) · [16 Collectors](16-collector-templates.md) · [17 Dynatrace](17-dynatrace-integration.md) · [18 Automation](18-automation-and-scale.md) · [19 Cost](19-cost-and-cardinality.md) | How is the pipeline built, run, scaled and paid for? |
| **6. People & process** | [20 Ownership & severity](20-ownership-and-communication.md) · [21 Incidents & on-call](21-incident-response-and-on-call.md) · [22 Resilience](22-resilience.md) · [23 Measuring effectiveness](23-measuring-effectiveness.md) · [transition plan](../framework/transition-plan.md) · playbooks · [case study](../examples/case-study.md) | Who does what, how we respond and learn, how we prove it works |

## I have a problem right now

```text
What do you see?
├─ Users or clients complain ─────────────► 01 locate the layer → 04 per client → playbooks/multi-client-endpoint
├─ Errors or latency went up ─────────────► Did something change? → 12 releases → playbooks/release-regression
├─ It's slow and the service looks fine ──► 09 measure from the caller → dependencies, pools, timeouts
├─ A queue is late ───────────────────────► 06 queue model (arrival vs processing, oldest age) → 13 capacity
├─ An alert fired and I don't trust it ───► 11 (percentage vs count, guards, one source per symptom)
├─ Pods / nodes look bad ─────────────────► 08 Kubernetes → then check users (10 SLO): are they affected?
├─ We'll run out soon (traffic growing) ──► 13 capacity: load test, headroom, forecast
├─ Telemetry is missing ──────────────────► 16 collector self-monitoring
├─ An incident is happening ──────────────► 20 severity → 21 runbook, roles, comms
└─ Business number looks wrong ───────────► 04 business metrics → 01 business layer
```

## I want to build or improve something

| Goal | Read | Then use |
|---|---|---|
| Monitor a new service | [18](18-automation-and-scale.md) (service file + archetype), [03](03-definition-of-done.md) | `observability.yaml` |
| Measure microservices with one template | [18 · microservices](18-automation-and-scale.md#measuring-microservices-with-templates) | Baseline + archetype + parameters |
| Define SLOs and a policy | [10](10-slos-and-error-budgets.md) | [SLO document](../framework/slo-document-template.md), [error budget policy](../framework/error-budget-policy-template.md) |
| Reduce alert noise | [11 §7](11-alerting.md#7-cleaning-up-a-noisy-alert-set) | [playbook](../playbooks/noisy-alerts-cleanup.md) |
| Plan capacity, right-size, autoscale | [13](13-capacity-and-saturation.md) | Monthly capacity review |
| Write a runbook / a postmortem | [21](21-incident-response-and-on-call.md) | [runbook](../framework/runbook-template.md), [postmortem](../framework/postmortem-template.md) templates |
| Test backups, failover and alerts on purpose | [22](22-resilience.md) | [game day template](../framework/game-day-template.md) |
| Prove the observability works; measure my impact | [23](23-measuring-effectiveness.md) | Scorecard + impact log |
| Measure internal and shared platform services | [09](09-internal-services.md) | Archetype `platform-service` in [dynatrace/](../dynatrace/) |
| Connect incidents to releases, track DORA | [12](12-releases-and-dora.md) | [playbook](../playbooks/dora-from-pipelines.md) |
| Build dashboards | [14](14-dashboards.md) | One L1 template with a `service` variable |
| Deploy collectors | [16](16-collector-templates.md) | [collector/](../collector/) |
| Decide OneAgent vs OpenTelemetry, control cost | [17](17-dynatrace-integration.md), [19](19-cost-and-cardinality.md) | – |
| Change an existing setup | [02](02-maturity-model.md) | [transition plan](../framework/transition-plan.md) |

## The ten ideas behind the whole guide

| # | Idea | Section |
|---|---|---|
| 1 | Find the **layer** first: Business, UX, Service, Resources, Delivery | 01 |
| 2 | Every signal carries **service, version, team, environment** (and client when it matters) | 04, 15 |
| 3 | **Page on symptoms**, diagnose with causes; a **percentage** says how bad, a **count** says how many | 11 |
| 4 | **SLO + burn rate** beats fixed thresholds, and needs an **error budget policy** | 10 |
| 5 | **Most incidents start with a change**: version on every signal, deployment events | 12 |
| 6 | **Measure dependencies from the caller**; internal SLOs are stricter than the ones that depend on them | 09 |
| 7 | **Capacity is demand vs load-tested supply**; alert on the forecast, not on CPU | 13 |
| 8 | **One template, many services**: baseline + archetype + parameters, as code with Monaco | 18 |
| 9 | **OpenTelemetry collects, Dynatrace analyzes**; the gateway is your control point | 16, 17 |
| 10 | **No alert without an owner** and a runbook; every claim links to official docs or is marked as a rule of thumb | 20, [REFERENCES](../REFERENCES.md) |

Words you don't know: [GLOSSARY](../GLOSSARY.md).
