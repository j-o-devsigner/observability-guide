# 18 · Automation and scale: from 5 services to 500

> By hand, observability works for a handful of services. At scale it only works if **one template, kept in one
> place, is applied to every service automatically**. The SRE team builds the templates and the pipeline (the
> "golden path"); each service team only fills in a short file. Data automation comes from **OpenTelemetry**
> (Operator, collectors); configuration automation comes from **Dynatrace as code** (Monaco, Terraform, Settings API);
> response automation comes from **Dynatrace Workflows**.

## What the SRE team provides vs what a service team provides

| SRE team (platform, built once) | Service team (per service, minutes) |
|---|---|
| This standard and its rules | `observability.yaml`: name, team, tier, SLO targets, runbook link |
| Collector templates: agent, cluster, gateway ([16](16-collector-templates.md)) | Namespace label to opt in |
| OTel `Instrumentation` per language ([15](15-opentelemetry-practices.md)) | Business spans and metrics, if needed |
| **Templates (one side)**: service dashboard, SLOs, alerts, routing | Their SLO targets and thresholds, via the file |
| The onboarding pipeline (CI / GitOps + Monaco) | Merge the PR |
| Workflows for notification and safe remediation | Their runbooks |
| Self-monitoring, cost reports, reviews ([20](20-ownership-and-communication.md)) | Attend the monthly SLO review |

## Measuring microservices with templates

**Does one template apply to every microservice?** Mostly yes. Each microservice is a single component that emits the
same OpenTelemetry signals with the same names (semantic conventions), so **one baseline** covers all of them. What
differs is the *kind* of service and a few per-service values, so the template has three layers:

<div data-widget="viz" data-chart="microservice-template"></div>

| Layer | Applies to | Contents | Who sets it |
|---|---|---|---|
| **1. Baseline** (every service) | All | RED from server spans (`http.server.request.duration` / spans), saturation (memory vs limit, CPU vs request, restarts, OOM), dependencies (DB / HTTP client / messaging durations), logs with `trace_id`, `service.version` split, owner and runbook | SRE template, automatic |
| **2. Archetype add-on** | By service type | See next table | SRE template, chosen by `archetype:` in the service file |
| **3. Service parameters** | One service | SLO targets, critical routes, clients, business KPIs, thresholds | Service team, in `observability.yaml` |

| Archetype | Extra signals | Default SLI | Typical alerts |
|---|---|---|---|
| **HTTP / gRPC API** | Per route, per client, per version | Availability + latency per critical route | Burn rate, per-client ratio + min count |
| **Queue consumer / worker** | Consumer lag, age of oldest message, DLQ, processing duration | Age of oldest message < X | Lag growing, DLQ count, processing errors |
| **Batch / CronJob** | Last success time, duration, failed runs | Success within 2 intervals | No success in 2 intervals, failed job |
| **Gateway / BFF** | Upstream errors by backend, rate limiting, auth failures | Availability at the edge (closest to the user) | Burn rate, upstream ratio by backend |
| **Frontend** | Web Vitals, JS errors, user actions | LCP / action success at p75 | RUM health alerts, synthetic journeys |
| **Platform service** (DB, cache, broker) | Callers' client spans, connections vs max, replication lag | Availability as seen by callers, stricter than consumers' SLOs ([09](09-internal-services.md)) | Saturation, replication lag |

### What a template can't do for you

| Not templatable | Why | Where it goes |
|---|---|---|
| Which routes are critical | Business knowledge | `observability.yaml` → `critical_routes` |
| SLO targets | Contract and user expectations | `slo:` block, reviewed monthly |
| Business KPIs (orders, payments) | Needs SDK instrumentation | Service code + a business-metrics add-on |
| **User journeys across services** | One journey (login → cart → pay) crosses many services | **Journey SLOs** measured at the edge (gateway or RUM), owned by a product team |

### Microservices are not islands

| Practice | Why |
|---|---|
| Measure **journey SLOs** at the entry point (gateway/BFF or RUM), not by multiplying service SLOs | Users feel the journey; ten 99.9% services in a chain are not "99.9%" |
| Every service also alerts on **its dependencies' errors and latency** (client-side spans) | The caller sees the failure first |
| Use traces + the service map to find **which hop** is slow | A per-service dashboard can't show the chain |
| Same `team` / `service.namespace` on every service of a product | Overviews per product and per team come for free |

```yaml
# observability.yaml with archetype and service parameters
service: orders-worker
team: payments
tier: 2
archetype: queue-consumer        # baseline + queue add-on
language: dotnet
slo:
  oldest_message_age_s: 60       # 99% of the time
critical_routes: []              # not an HTTP service
runbook: https://wiki.example/runbooks/orders-worker
```

## Onboarding a service

<div data-widget="viz" data-chart="onboarding-flow"></div>

### 1. The service file (the only thing a team writes)

```yaml
# observability.yaml, in the service's repo
service: checkout
team: payments
tier: 1                      # decides the defaults below
language: dotnet             # which OTel Instrumentation to inject
slo:
  availability: 99.9         # % non-5xx, 28 days
  latency_ms: 500
  latency_target: 99         # % of requests under latency_ms
per_client: true             # adds client.id views and alerts
runbook: https://wiki.example/runbooks/checkout
```

### 2. Tier defaults (so teams don't have to decide everything)

| | Tier 1 (customer-facing, revenue) | Tier 2 (internal, important) | Tier 3 (batch, tools) |
|---|---|---|---|
| Instrumentation | OTel auto + business spans | OTel auto | OTel auto or metrics only |
| SLO | Availability + latency | Availability | None (count / absence alerts) |
| Burn-rate alert | Page | Ticket | – |
| Per-client / per-version views | Yes | Optional | No |
| Dashboard | Service template (L1) + team overview | Service template | Team overview row only |
| Synthetic check | External journey | Internal `httpcheck` | – |
| Trace sampling at the gateway | Keep errors + slow + 25% ⚠️ | errors + slow + 10% ⚠️ | errors only ⚠️ |

### 3. What the pipeline does on merge

| Step | Tool | Result |
|---|---|---|
| Validate the file (owner, runbook, tier, SLO in range) | CI check | The [definition of done](03-definition-of-done.md) enforced, not hoped for |
| Label the workload (`team`, `app.kubernetes.io/version`) and annotate the namespace | Helm / Argo CD | OTel auto-instrumentation injects; collectors add `team` and `service.version` |
| Render SLOs, alerts and routing from the templates with the file's values | `dynatrace/generate.py` → Monaco configs | One config per service, never hand-edited |
| Deploy (dry run in the PR, real on merge) | `monaco deploy --dry-run` / `monaco deploy` | Dynatrace SLO (`slo-v2`), custom alerts, alerting rules |
| Register the service on the team overview | Monaco / dashboard variable values | Visible in L0 the same day |

Target ⚠️: a new service is fully observed **the same day** it deploys, with no ticket to the SRE team.

## Dashboards as templates, on one side

Keep **one** set of dashboard templates in one repository. Services never copy dashboards.

| Option | How | Use for |
|---|---|---|
| **A. One dashboard + a `service` variable** | A DQL variable lists services; every tile filters with `filter service.name == $service` | The L1 service dashboard ([14](14-dashboards.md)). One thing to maintain, works for service 501 automatically |
| **B. Generated per service** | Monaco renders the same JSON template with parameters (service, team, SLO) | Team overviews (L0), or when a tier needs different tiles |

Recommendation: **A for L1**, **B only for team overviews**. Either way the template lives in one place, changes go through a PR, and every service gets the change at once.

```text
// Dashboard variable "service" (DQL type) – distinct services that send request metrics
timeseries requests = sum(<request-count metric>), by:{service.name}
| fields service.name
// Every tile then filters: filter service.name == $service
```

## Dynatrace as code with Monaco

The whole Dynatrace side of the baseline lives in one Monaco project: [dynatrace/](../dynatrace/). SRE owns the
templates; services only contribute their `observability.yaml`; a small generator renders the Monaco configs.

| Piece | What it is | Owner |
|---|---|---|
| `templates/*.json` | SLO, custom-alert and workflow templates with `{{ .service }}`, `{{ .target }}`, … | SRE |
| `shared/` | The ONE L1 dashboard (`document`, `$service` variable), deployed once | SRE |
| `services-src/*.yaml` | Each service's `observability.yaml` (in reality: pulled from the service repos) | Service teams |
| `generate.py` | Archetype → which templates; tier → default thresholds; writes one config per service and one workflow per team | SRE |
| `projects/` | Generated Monaco configs, never edited by hand | Generated |
| `manifest.yaml` | Environments (prod, staging) and credentials from CI secrets | SRE |

```yaml
# projects/services/checkout/config.yaml (generated)
configs:
  - id: checkout-slo-availability           # the service name in every ID: Monaco identifies objects by ID
    type: slo-v2
    config:
      name: checkout · availability
      template: ../../../templates/slo-availability.json
      parameters: { service: checkout, team: payments, target: 99.9, runbook: https://wiki.example/runbooks/checkout }
  - id: checkout-alert-burn-rate
    type:
      settings:
        schema: builtin:davis.anomaly-detectors
        scope: environment
    config:
      name: checkout · SLO fast burn
      template: ../../../templates/alert-burn-rate.json
      parameters: { service: checkout, team: payments, target: 99.9, threshold: 14.4, runbook: https://wiki.example/runbooks/checkout }
```

| Monaco rule | Why |
|---|---|
| One config per service, service name in the `id` | Reusing an ID makes each deploy overwrite the previous service |
| Get template JSON from `monaco download` of a pilot service built in the UI | The schema comes from your tenant, not from memory |
| `--dry-run` on every PR, `deploy` on merge, `delete` for retired services | Reviewable, repeatable, no orphans |
| Workflow expressions escaped as `{{ "{{" }} … {{ "}}" }}` | Both Monaco and Workflows use `{{ }}` |
| Dashboards: `private: false` | Monaco-created documents are private by default |
| No edits in the UI on generated objects | The next deploy overwrites them |

## Automating the response

| Automation | Dynatrace feature | Guardrail |
|---|---|---|
| Route a problem to the owning team | Workflow with a **problem trigger** ("wait for root cause"), team from the `team` attribute | One route per team, tested |
| Open a ticket / post to the team channel | Workflow actions (Slack, email, ticketing) | Deduplicate by problem ID |
| Roll back a bad release | Workflow → pipeline webhook when the problem is linked to a deployment event ([12](12-releases-and-dora.md)) | Production: human approval; staging: automatic |
| Restart / scale | Workflow → Kubernetes action | Only idempotent, reversible actions; log every run |
| Close the loop | Problem closed → update the incident record | Postmortem still written by people ([20](20-ownership-and-communication.md)) |

Rule ⚠️: automate **notification and diagnosis** first, **remediation** second, and only for actions you would do the same way every time.

## Governance: keep it from drifting

| Practice | Why |
|---|---|
| Everything from Git; UI changes are overwritten on the next deploy | One source of truth |
| PR review against the standard (13–15 for dashboards, 03 for alerts) | Quality at the door |
| CI checks every service: owner, tier, SLO, runbook, dashboard registered | The definition of done becomes automatic |
| Template changes roll out to all services at once | No "old version" dashboards |
| Delete what a service no longer has (removed services, renamed alerts) | No orphan alerts paging nobody |

## Measure the platform

| KPI | Target ⚠️ |
|---|---|
| Services onboarded via the pipeline | 100% of tier 1–2 |
| Services with an SLO | 100% of tier 1 |
| Time from first deploy to fully observed | < 1 day |
| Hand-made dashboards / alerts outside Git | 0 |
| Pages without an owner or runbook | 0 |

## Sources

- [Dynatrace: Configuration as Code (Monaco)](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/monaco-getting-started) · [projects and manifest](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/configuration/projects) · [YAML structure](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/configuration/yaml-configuration-saas) · [get started (slo-v2, dry run)](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/get-started/get-started-with-dynatrace-configuration-for-monaco) · [Go templating](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/guides/configuration-as-code-advanced-use-case) ✅ 2026-11-20
- [Dynatrace Terraform provider](https://registry.terraform.io/providers/dynatrace-oss/dynatrace/latest/docs) 📚
- [Dynatrace: Dashboard variables](https://docs.dynatrace.com/docs/analyze-explore-automate/dashboards-and-notebooks/dashboards-new/components/dashboard-component-variable): DQL variables, `$var` in queries ✅ 2026-11-20
- [Dynatrace: Workflow event triggers](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/build/trigger/event-trigger) · [Alerting and notifications](https://docs.dynatrace.com/docs/analyze-explore-automate/alerting-and-notifications): problem trigger, wait for root cause ✅ 2026-11-20
- [OpenTelemetry Operator](https://opentelemetry.io/docs/platforms/kubernetes/operator/) 📚
- Tier defaults, onboarding target, platform KPIs: rules of thumb ⚠️
