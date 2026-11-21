# Observability Guide

A living standard for observability with **OpenTelemetry (collection) and Dynatrace (backend)**: what to measure,
how to alert, how to connect incidents to releases, how to template it for many microservices, who owns what, and
how to move an existing setup to something better. Written for people **and** for AI agents ([AGENTS.md](AGENTS.md)).
Every claim links to official docs or is marked as a rule of thumb ([REFERENCES.md](REFERENCES.md)).
Open-source variants (Prometheus, Grafana) appear in collapsed boxes where useful.

**New here?** Start with [standard/00-start-here.md](standard/00-start-here.md), then read the [case study](examples/case-study.md).

## The standard, in six parts

| Part | # | Section | Question it answers |
|---|---|---|---|
| **1 · Foundations** | 00 | [Start here](standard/00-start-here.md) | Where do I go for my situation? |
| | 01 | [Layers and methods](standard/01-layers.md) | Where does this problem live? RED, USE, Golden Signals or DORA? |
| | 02 | [Maturity model](standard/02-maturity-model.md) | How good is our observability (and culture) today? |
| | 03 | [Definition of done](standard/03-definition-of-done.md) | Is this service well monitored? (PRR checklist) |
| **2 · Signals** | 04 | [Endpoint coverage](standard/04-endpoint-coverage.md) | What must every endpoint emit? How to handle many clients? |
| | 05 | [Logging standard](standard/05-logging-standard.md) | Log structure, field names, levels, masking layers, collection, retention, log alerts |
| | 06 | [Queues, batch, external APIs](standard/06-workload-types.md) | Queue model (Little's law, oldest age), batch jobs, third-party APIs |
| | 07 | [Frontend experience](standard/07-frontend-experience.md) | What did real users experience? |
| | 08 | [Kubernetes cluster](standard/08-kubernetes-cluster.md) | What to measure in a cluster, from which OTel component, and what Dynatrace adds |
| | 09 | [Internal and platform services](standard/09-internal-services.md) | Internal SLOs, measuring from the caller, shared DB / cache / broker, timeouts and retries |
| **3 · Reliability** | 10 | [SLOs and error budgets](standard/10-slos-and-error-budgets.md) | What do we promise, and what happens when we miss it? |
| | 11 | [Alerting](standard/11-alerting.md) | Percentage or count? Burn rate? Who alerts on what? Noise cleanup |
| | 12 | [Releases and DORA](standard/12-releases-and-dora.md) | Which version caused it? Deployment events, release validation, DORA |
| | 13 | [Capacity and saturation](standard/13-capacity-and-saturation.md) | Demand vs tested capacity, headroom (N+2), saturation, right-sizing, autoscaling, forecasts |
| **4 · Dashboards** | 14 | [Dashboards](standard/14-dashboards.md) | Hierarchy, one template per level, which tile for which question |
| **5 · Platform** | 15 | [OpenTelemetry practices](standard/15-opentelemetry-practices.md) | Resource identity, semconv, instrumentation, sampling, security |
| | 16 | [Collector templates](standard/16-collector-templates.md) | Agent / cluster / gateway pipelines, resilience, self-monitoring |
| | 17 | [Dynatrace platform](standard/17-dynatrace-integration.md) | OneAgent vs OpenTelemetry, ingest rules, cost drivers |
| | 18 | [Automation and scale](standard/18-automation-and-scale.md) | One template for every microservice; onboarding with Monaco |
| | 19 | [Cost and cardinality](standard/19-cost-and-cardinality.md) | Why is it expensive, and how to control it? |
| **6 · People & process** | 20 | [Ownership and communication](standard/20-ownership-and-communication.md) | Who is responsible? Incident severity SEV1–4 and actions; how information flows |
| | 21 | [Incident response and on-call](standard/21-incident-response-and-on-call.md) | Runbooks, postmortems, on-call practice, Wheel of Misfortune |
| | 22 | [Resilience](standard/22-resilience.md) | RPO/RTO, restore tests, DR drills, chaos engineering, progressive delivery |
| | 23 | [Measuring effectiveness](standard/23-measuring-effectiveness.md) | Is the observability working? KPIs, incident fields, toil, cases, your impact log |
| | – | [Transition plan](framework/transition-plan.md) · [SLO document](framework/slo-document-template.md) · [Error budget policy](framework/error-budget-policy-template.md) · [Runbook](framework/runbook-template.md) · [Postmortem](framework/postmortem-template.md) · [Game day](framework/game-day-template.md) | Templates |
| | – | [Case study](examples/case-study.md) | Everything connected in one story |

## Repository

| Folder | What's inside |
|---|---|
| [`standard/`](standard/) | The rules, sections 00–23 |
| [`framework/`](framework/) | Transition plan, SLO document, error budget policy |
| [`playbooks/`](playbooks/) | One use case per file, same template, with status |
| [`examples/`](examples/) | Case study |
| [`collector/`](collector/) | OTel Collector templates (agent, cluster, gateway → Dynatrace), validated |
| [`dynatrace/`](dynatrace/) | **Dynatrace as code (Monaco)**: baseline templates, shared dashboard, team workflows, generator from `observability.yaml` |
| [`rules/`](rules/) · [`dashboards/`](dashboards/) | Open-source variants: tested PromQL rules, Grafana JSON |
| [`site/`](site/) | Builds `observability-guide.html` from the Markdown |
| [`posts/`](posts/) | Blog posts in my own words |
| [`GLOSSARY.md`](GLOSSARY.md) · [`REFERENCES.md`](REFERENCES.md) | Terms · official docs with verification status |

## Playbooks

| Playbook | Layer | Status |
|---|---|---|
| [Errors went up after a release](playbooks/release-regression.md) | Delivery → Service | draft |
| [Multi-client endpoint](playbooks/multi-client-endpoint.md) | Service | draft |
| [DORA from pipelines](playbooks/dora-from-pipelines.md) | Delivery | draft |
| [Noisy alerts cleanup](playbooks/noisy-alerts-cleanup.md) | Process | draft |

## Roadmap

| Topic | Why | Status |
|---|---|---|
| One section per view on the web page (prev/next, links per section) | Easier to read and share | next |
| Test prompts for the work agent (10 problems + expected answers) | Check the agent follows the guide | next |
| CI/CD pipeline observability | Delivery is a layer | idea |
| Profiling (OTel profiles signal, alpha) | Code-level cause without OneAgent | watch |

## Commands

```bash
make dynatrace         # generate Monaco configs from dynatrace/services-src and check them offline
make site              # rebuild observability-guide.html from the Markdown
make check-collector   # otelcol validate on collector/*.yaml
make test              # open-source variant: promtool lint + unit tests for rules/
make check-dashboards  # open-source variant: import dashboards/ into a throwaway Grafana
```

## How to use it with an agent

> "Read AGENTS.md in the observability guide. Problem: client B says checkout is slow since yesterday, but our dashboard looks fine."

## Get a copy

- **Repository (public):** <https://github.com/j-o-devsigner/observability-guide>. Clone it, or use **Code → Download ZIP** with no login.
- **Web guide:** open the artifact link and use **Download source (.zip)** in the sidebar. You get every file (Markdown, Monaco project, collector configs, templates); no account or Git needed.
- **Rebuild the page offline:** `make site` (Python 3 only) regenerates `observability-guide.html`, a single file you can open in any browser.

## Changelog

| Version | Date | Change |
|---|---|---|
| v0.14 | 2026-11-20 | 21 incident response and on-call (incident loop, runbooks, postmortems, on-call practice, Wheel of Misfortune); 22 resilience (RPO/RTO, restore tests, DR drills, chaos engineering and game days, progressive delivery with flags and canaries); 23 measuring effectiveness (scorecard, incident fields, toil, cases with lab numbers, personal impact log); data pipeline SLOs in 06; runbook, postmortem and game day templates; charts and incident-loop diagram |
| v0.13 | 2026-11-20 | Incident severity in 20: tier vs alert severity vs SEV, SEV1–4 criteria, actions per level (notification, ack time, roles, update cadence, client comms, freeze, postmortem), rules, Dynatrace mapping (standardized event severity 1–5, Workflow routing); severity matrix |
| v0.12 | 2026-11-20 | 05 became the **logging standard** (OTel log data model, required fields, naming rules, severity levels, what never to log, five masking layers incl. Dynatrace OpenPipeline, collection, Grail buckets and retention, correlation, log alerts, checklist); trace content (metrics from spans, sampling) moved to 15 |
| v0.11 | 2026-11-20 | 09 internal and platform services (caller-side measurement, internal SLOs, platform ownership, timeouts/retry budgets); 13 capacity and saturation (demand vs load-tested supply, N+2 headroom, saturation table, right-sizing, HPA/KEDA, Dynatrace forecasts, capacity review); queues expanded in 06 (Little's law, oldest age as SLI, partition skew, retries, autoscaling on lag); charts for capacity forecast and queue flow; dependency-chain diagram; Monaco archetype `platform-service` and backlog-at-max alert; sections renumbered 00–20 |
| v0.10 | 2026-11-20 | Dynatrace as code with Monaco: `dynatrace/` project (templates for SLOs, custom alerts, team workflows; one shared L1 dashboard; generator from observability.yaml per archetype; offline check); section 16 Monaco-only |
| v0.9 | 2026-11-20 | Restructured into six parts (sections 00–18); Dynatrace-first rewrite of SLOs, alerting, releases/DORA, dashboards, Dynatrace platform and the case study (open-source variants collapsed); merged dashboards (visualization + structure) and Kubernetes (platform + measurement); microservice templates (baseline + archetype + parameters) in 16; "In 30 seconds" summaries; diagrams updated to a Dynatrace-only setup |
| v0.8 | 2026-11-20 | Automation and scale; challenge template removed |
| v0.7 | 2026-11-20 | Dynatrace as default backend; frontend; OpenTelemetry practices; collector templates; cluster measurement; roadmap |
| v0.6 | 2026-11-20 | Dashboard structure; Dynatrace integration; validated fan-out collector config; architecture diagrams |
| v0.5 | 2026-11-20 | Visualization standard; live example charts; dual-axis removed; playbooks drafted |
| v0.4 | 2026-11-20 | Web page generated from Markdown; tested rules; dashboard as code; start-here; case study; logs & traces, workload types, Kubernetes, cost; glossary |
| v0.3 | 2026-11-20 | SLOs and error budgets; SLO document and error budget policy templates |
| v0.2.1 | 2026-11-20 | Checked against official docs; REFERENCES.md |
| v0.2 | 2026-11-20 | Repo structure; Delivery layer; ownership; maturity model; transition plan; AGENTS.md |
| v0.1 | 2026-11-19 | First version (web) |
