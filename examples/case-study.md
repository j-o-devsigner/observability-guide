# Case study: one endpoint, three clients, one bad release

> A **fictional** but realistic story that walks through the whole guide on the real stack:
> **OpenTelemetry → Dynatrace**. Names and numbers are invented; each step links to the section it applies.

## The setup

| Item | Value |
|---|---|
| Service | `checkout` (Go), endpoint `POST /api/checkout`, archetype: HTTP API |
| Team | `payments`, 5 engineers, one on-call per week |
| Clients | **Northwind** (70% of traffic), **Contoso** (25%), **Fabrikam** (5%, contract with 99.95% SLA) |
| Traffic | ~100 req/s at peak, ~5 req/s at night, ~60 req/s on average (~145M requests per 28 days) |
| Stack | OTel auto-instrumentation, agent / cluster / gateway collectors, Dynatrace backend, ActiveGate for Kubernetes |
| Before | 38 alerts (mostly CPU, memory, pod restarts), ~9 pages per week, nobody trusts them |

<div data-widget="viz" data-chart="traffic-share"></div>

## Step 1 · Assess ([02](../standard/02-maturity-model.md), [transition plan](../framework/transition-plan.md) phase 0)

| Dimension | Score | Evidence |
|---|---|---|
| Instrumentation | 2 | OTel auto-instrumentation, RED from spans |
| Context | 1 | No `service.version`, no `client.id` |
| Alerting | 1 | 38 cause alerts, 12% of pages acted on |
| Delivery | 0 | Deployments invisible in Dynatrace |
| Ownership | 1 | Every problem goes to one shared channel |

Target: level 3 for Context, Alerting and Delivery within one quarter.

## Step 2 · Locate the layers ([01](../standard/01-layers.md))

| Layer | What matters here |
|---|---|
| Business | Checkouts per minute; Fabrikam's contract |
| Service | RED for `POST /api/checkout`, **per client** |
| Delivery | Which version is serving |
| Resources | DB connection pool, memory vs limit (diagnosis only) |

## Step 3 · Add context ([04](../standard/04-endpoint-coverage.md), [12](../standard/12-releases-and-dora.md), [16](../standard/16-collector-templates.md))

- Middleware sets `client.id` from the API key on spans (3 values: bounded).
- The pipeline sets the pod label `app.kubernetes.io/version`; the collectors' `k8sattributes` turns it into `service.version`.
- The gateway's label allow-list keeps `client.id` and `service.version`, so they reach Dynatrace on every signal.
- After `kubectl rollout status`, the pipeline sends a **deployment SDLC event** to Dynatrace.

## Step 4 · SLOs and the policy ([10](../standard/10-slos-and-error-budgets.md))

| SLO (Dynatrace SLO app, DQL SLI) | Target | Budget (28d) |
|---|---|---|
| Availability, all clients | 99.9% | ~145,000 bad requests |
| Availability, Fabrikam | 99.95% | ~3,600 bad requests (Fabrikam ≈ 7.25M requests) |
| Latency < 500 ms | 99% | – |

The SLO document and error budget policy are signed by the team lead, SRE and Fabrikam's account manager. All of it is generated from `observability.yaml` by the onboarding pipeline ([18](../standard/18-automation-and-scale.md)).

## Step 5 · Replace the alerts ([11](../standard/11-alerting.md))

| Old (removed after a shadow period) | New |
|---|---|
| CPU > 80%, memory > 85%, pod restarted (×12 variants) | Dashboard only; Davis keeps OOM / crash-loop problems |
| `errors > 100` | SLO burn-rate custom alert (fast and slow burn) |
| – | Per-client error ratio > 5% **and** > 20 errors (custom alert, `by:{client.id}`) |
| – | Release regression: error ratio by `service.version` |
| – | No checkouts in 15 min (business hours) |
| One shared channel | A Workflow routes problems with `team = payments` to the payments on-call |

New alerts ran in **shadow mode** (non-paging channel) for two weeks: they caught both real incidents; the old set added 17 false pages.

## Step 6 · The incident

| Time | Event | Where it shows |
|---|---|---|
| 14:02 | Pipeline deploys `checkout 1.42.0` (rolling update) and sends a deployment event | Deployment marker on the L1 dashboard |
| 14:05 | Fabrikam's requests hit a new code path that fails for their currency | Per-client table: Fabrikam error % turns red |
| 14:07 | Total error ratio only 0.4% (Fabrikam is 5% of traffic): below the fast-burn threshold | The old `errors > 100` would also have stayed silent |
| 14:09 | **Release regression** alert: 1.42.0 at 4.1% vs 1.41.3 at 0.2% | Davis opens a problem, related to the deployment |
| 14:11 | **Fabrikam error-ratio** alert: 8%, ~240 errors in 10 min | Grouped into the **same problem** |
| 14:12 | The Workflow pages the payments on-call; the link opens L1 with `service = checkout` | Per-version and per-client rows show the split |
| 14:14 | Rollback (`kubectl rollout undo`); rollback event sent | Second marker on the dashboard |
| 14:19 | Error ratio back to baseline; alerts close; problem resolved | – |
| 14:30 | Budget check: overall ~4,000 errors ≈ 3% of the 28-day budget; Fabrikam ~400 ≈ 11% of its budget | SLO app |

<div data-widget="viz" data-chart="incident-timeline"></div>

**Time to detect: 4 min after the first errors. Time to restore: 14 min.** Comms posted an update to Fabrikam at 14:20 ([20](../standard/20-ownership-and-communication.md)).

<div data-widget="viz" data-chart="state-timeline"></div>

## Step 7 · After the incident ([20](../standard/20-ownership-and-communication.md), [10](../standard/10-slos-and-error-budgets.md))

| Output | Content |
|---|---|
| Postmortem | Blameless; cause: currency edge case not covered by tests; release validation didn't include Fabrikam traffic |
| Action items | Contract test for all client currencies (P1); Site Reliability Guardian objective **per client** after each deployment (P1) |
| Policy check | Fabrikam budget used 11%: under the 20% rule, so no mandatory P0; the team made the fixes P1 anyway |
| DORA | 1 failed deployment; recovery time 14 min (from the deployment and rollback events) |
| Guide update | `playbooks/release-regression.md` status → *validated in production*; note in 11 about per-client release validation |

## Step 8 · Results after one quarter

<div data-widget="viz" data-chart="case-results"></div>

| KPI | Before | After |
|---|---|---|
| Alerts | 38 | 9 |
| Pages per week | ~9 | ~1 |
| % pages acted on | 12% | 90% |
| Time to detect (median) | 40 min (client reported) | 4 min |
| Maturity: Context / Alerting / Delivery | 1 / 1 / 0 | 3 / 3 / 2 |

## What this case shows

| Lesson | Section |
|---|---|
| The global total hid a broken client | [04](../standard/04-endpoint-coverage.md#multiple-clients-on-one-service) |
| `service.version` turned "something is wrong" into "1.42.0 is wrong" | [12](../standard/12-releases-and-dora.md) |
| The minimum-count guard kept nights quiet; the per-client ratio caught the small client | [11](../standard/11-alerting.md) |
| Davis grouped two alerts into one problem; a Workflow sent one page to the right team | [11](../standard/11-alerting.md), [17](../standard/17-dynatrace-integration.md) |
| The policy turned a budget number into a decision | [10](../standard/10-slos-and-error-budgets.md) |
| Shadow mode made it safe to delete 29 alerts | [transition plan](../framework/transition-plan.md) |
| One service file generated SLOs, alerts and routing | [18](../standard/18-automation-and-scale.md) |
