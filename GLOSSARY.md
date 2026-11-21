# Glossary

| Term | Meaning | See |
|---|---|---|
| **Absence alert** | Fires when something stops happening (count is 0, or the series is missing) | [11](standard/11-alerting.md) |
| **Alert precision / recall** | Precision: pages that needed action ÷ all pages. Recall: incidents preceded by an alert ÷ incidents | [23](standard/23-measuring-effectiveness.md) |
| **Annotation (deploy marker)** | A vertical line on a graph marking an event, like a deploy | [12](standard/12-releases-and-dora.md) |
| **Backlog / Little's law** | Messages waiting in a queue; in steady state backlog = arrival rate × wait time, so wait ≈ backlog / processing rate | [06](standard/06-workload-types.md#queues-and-async-processing) |
| **Burn rate** | How fast the error budget is used. 1 = exactly on budget; 14.4 = a 30-day budget gone in ~2 days | [11](standard/11-alerting.md), [10](standard/10-slos-and-error-budgets.md) |
| **Canary** | Sending a small share of traffic to a new version and comparing it with the old one | [12](standard/12-releases-and-dora.md) |
| **Cardinality** | Number of unique time series, driven by label value combinations | [19](standard/19-cost-and-cardinality.md) |
| **Change failure rate** | Share of deployments that cause a failure needing remediation (DORA) | [12](standard/12-releases-and-dora.md) |
| **Chaos engineering / game day** | Injecting real failures on purpose, with a steady-state hypothesis and a small blast radius, to prove resilience and alerts | [22](standard/22-resilience.md) |
| **Client-side measurement** | Measuring a dependency from the caller's spans (includes network, timeouts, pools) | [09](standard/09-internal-services.md) |
| **Consumer lag** | Messages waiting to be processed by a consumer group | [06](standard/06-workload-types.md) |
| **Counter** | A metric that only goes up (requests total). Use `rate()` / `increase()` on it | – |
| **Deployment frequency** | How often a team deploys to production (DORA) | [12](standard/12-releases-and-dora.md) |
| **DORA metrics** | Delivery performance: deployment frequency, change lead time, change failure rate, failed deployment recovery time, deployment rework rate | [12](standard/12-releases-and-dora.md) |
| **Error budget policy** | Agreed actions when the budget is spent (freeze, reliability work) | [10](standard/10-slos-and-error-budgets.md) |
| **Error budget** | 1 − SLO: the failure you're allowed. 99.9% → 0.1% | [10](standard/10-slos-and-error-budgets.md) |
| **Event name** | Stable name of a log event type (`checkout.payment_failed`) for search and alerts | [05](standard/05-logging-standard.md) |
| **Exemplar** | A trace ID attached to a metric sample, to jump from a graph to a trace | [15](standard/15-opentelemetry-practices.md) |
| **Failed deployment recovery time** | Time to recover from a deployment that needs immediate intervention (DORA; replaced MTTR in 2023) | [12](standard/12-releases-and-dora.md) |
| **Feature flag** | Switch to turn code paths on or off at runtime; OpenFeature is a vendor-neutral API for them | [22](standard/22-resilience.md) |
| **Golden data** | Test records with known expected results, used to check a data pipeline's correctness | [06](standard/06-workload-types.md#data-pipelines-freshness-coverage-correctness) |
| **Golden Signals** | Latency, traffic, errors, saturation (Google SRE) | [01](standard/01-layers.md) |
| **Grail bucket** | Dynatrace storage unit with its own retention, used to keep log classes apart | [05](standard/05-logging-standard.md) |
| **Head / tail sampling** | Keeping a share of traces, decided at the start (head) or after the trace ends (tail) | [15](standard/15-opentelemetry-practices.md) |
| **Headroom / N+2** | Spare capacity so peak traffic is served with two instances (or a zone + an instance) gone | [13](standard/13-capacity-and-saturation.md) |
| **Histogram** | Metric that counts observations into buckets; gives percentiles and averages | [04](standard/04-endpoint-coverage.md) |
| **Incident Commander (IC)** | The person coordinating an incident, not fixing it | [20](standard/20-ownership-and-communication.md) |
| **Incident severity (SEV1–SEV4)** | How big the impact is and how big the response must be: Critical, Major, Minor, Low | [20](standard/20-ownership-and-communication.md#severity-levels-and-actions) |
| **Inhibition** | Alertmanager muting dependent alerts while a bigger one fires | [11](standard/11-alerting.md) |
| **Internal SLO** | SLO for a service called by other services; stricter than the user-facing SLOs that depend on it | [09](standard/09-internal-services.md) |
| **KEDA** | Kubernetes event-driven autoscaler: scales consumers on queue lag/length | [13](standard/13-capacity-and-saturation.md) |
| **Lead time for changes** | Time from commit to running in production (DORA) | [12](standard/12-releases-and-dora.md) |
| **Load test** | Controlled traffic to find the throughput a component handles within its SLO (its real capacity) | [13](standard/13-capacity-and-saturation.md) |
| **Masking / redaction** | Removing or hiding secrets and personal data from telemetry, in layers (code, logger, gateway, OpenPipeline) | [05](standard/05-logging-standard.md) |
| **Minimum-count guard** | Extra condition (`and errors > N`) so a ratio doesn't fire on tiny traffic | [11](standard/11-alerting.md) |
| **MTTA / MTTD / MTTR** | Mean time to acknowledge / detect / repair-recover-resolve (always say which R) | [23](standard/23-measuring-effectiveness.md) |
| **Multi-window alert** | Burn-rate alert that checks a long and a short window together | [11](standard/11-alerting.md) |
| **Page vs ticket** | Page = wake someone up now; ticket = fix during working hours | [11](standard/11-alerting.md) |
| **Postmortem (blameless)** | Written review of an incident focused on systems, not people | [20](standard/20-ownership-and-communication.md) |
| **PRR (Production Readiness Review)** | Checklist review before a service goes live or gets on-call | [03](standard/03-definition-of-done.md) |
| **Pseudonymization** | Replacing an identifier with a salted hash so it can be correlated without revealing who it is | [05](standard/05-logging-standard.md) |
| **RACI** | Responsible, Accountable, Consulted, Informed: who does what | [20](standard/20-ownership-and-communication.md) |
| **Recording rule** | Pre-computed query saved as a new series, for speed and reuse | [rules/](rules/) |
| **RED** | Rate, Errors, Duration: for request-driven services | [01](standard/01-layers.md) |
| **Resource attribute** | OTel attribute describing the source (service, version, pod), shared by all its signals | [04](standard/04-endpoint-coverage.md) |
| **Retry budget** | Cap on retries (per request and as % of load) with backoff + jitter, to avoid retry storms | [09](standard/09-internal-services.md) |
| **Right-sizing** | Matching requests/limits to real usage: less cost, fewer OOMs and throttling | [13](standard/13-capacity-and-saturation.md) |
| **RPO / RTO** | Recovery point objective (max data loss, in time) / recovery time objective (max time to restore) | [22](standard/22-resilience.md) |
| **Runbook** | Step-by-step response guide linked from an alert | [20](standard/20-ownership-and-communication.md) |
| **Saturation** | How full a resource is (queue depth, pool usage, throttling) | [01](standard/01-layers.md) |
| **Service tier** | How important a service is (1–3); decides SLOs, alert defaults and part of incident severity | [18](standard/18-automation-and-scale.md) |
| **Severity number** | OTel log level as a number: TRACE 1–4, DEBUG 5–8, INFO 9–12, WARN 13–16, ERROR 17–20, FATAL 21–24 | [05](standard/05-logging-standard.md) |
| **Shadow mode** | New alerts route to a non-paging receiver while being compared with the old ones | [transition plan](framework/transition-plan.md) |
| **SLA** | Contract with a client, usually looser than the SLO, often with penalties | [10](standard/10-slos-and-error-budgets.md) |
| **SLI** | Service level indicator: good events / valid events | [10](standard/10-slos-and-error-budgets.md) |
| **SLO** | Service level objective: target for an SLI over a window | [10](standard/10-slos-and-error-budgets.md) |
| **Span metrics** | RED metrics generated from traces | [15](standard/15-opentelemetry-practices.md) |
| **Symptom vs cause** | What users feel (errors) vs why it happens (CPU). Page on symptoms | [01](standard/01-layers.md) |
| **Toil** | Manual, repetitive, automatable operational work | – |
| **USE** | Utilization, Saturation, Errors: for resources | [01](standard/01-layers.md) |
| **Westrum culture** | Pathological / bureaucratic / generative organization types; DORA uses it to measure culture | [02](standard/02-maturity-model.md) |
| **Wheel of Misfortune** | Role-play of a past incident to train on-call engineers and test runbooks | [21](standard/21-incident-response-and-on-call.md) |
