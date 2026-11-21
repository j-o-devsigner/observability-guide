# References

> Official documentation and primary sources behind the standard. Rule: every recommendation should point here
> (or to an official doc) and say if it's a **rule of thumb** instead.
> Status: ✅ checked against the official page on the date shown · 📚 primary source, cited from the book/essay · ⚠️ rule of thumb (this guide)

## Alerting and SLOs

| Source | Supports | Status |
|---|---|---|
| [Google SRE Workbook, *Alerting on SLOs*](https://sre.google/workbook/alerting-on-slos/) | Burn rate; multi-window (short window = 1/12 of long); recommended **14.4× 1h/5m page, 6× 6h/30m page, 1× 3d/6h ticket** | ✅ 2026-11-20 |
| [Google SRE Book, *Monitoring Distributed Systems*](https://sre.google/sre-book/monitoring-distributed-systems/) | Four Golden Signals, symptoms vs causes | 📚 |
| [Google SRE Book, *Being On-Call*](https://sre.google/sre-book/being-on-call/) | Max **2 incidents per 12h shift** (~6h of work per incident); median pages per shift likely zero | ✅ 2026-11-20 |
| [Google SRE Workbook, *On-Call*](https://sre.google/workbook/on-call/) | One incident = one problem, however many alerts | ✅ 2026-11-20 |
| [Google SRE Workbook, *Implementing SLOs*](https://sre.google/workbook/implementing-slos/) | SLIs, targets, budget math (99.9% of 1M = 1,000 errors) | ✅ 2026-11-20 |
| [Google SRE Workbook, *Example Error Budget Policy*](https://sre.google/workbook/error-budget-policy/) | Freeze except P0/security after 4-week budget spent; exemptions; incident > 20% of budget → postmortem with P0 item | ✅ 2026-11-20 |
| [Google SRE Workbook, *Example SLO Document*](https://sre.google/workbook/slo-document/) | SLO document structure | 📚 |
| [Prometheus, *Alerting* practices](https://prometheus.io/docs/practices/alerting/) | Alert on symptoms, keep it simple; recommends Ewaschuk's essay | ✅ 2026-11-20 |
| Rob Ewaschuk, *My Philosophy on Alerting* ([copy](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic)) | Pages must be urgent, important, actionable, real; symptoms over causes | ✅ 2026-11-20 |
| [Prometheus Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/) | Routing tree, grouping, inhibition | 📚 |
| Thresholds 5% / 20 errors / 0.1 req/s, case catalog, cleanup steps | – | ⚠️ |
| Extra burn-rate row 3× 1d/2h | Common in tools like [Sloth](https://sloth.dev/) / [Pyrra](https://github.com/pyrra-dev/pyrra), **not** in the Workbook table | ⚠️ |

## Methods

| Source | Supports | Status |
|---|---|---|
| [Brendan Gregg, *The USE Method*](https://www.brendangregg.com/usemethod.html) | Utilization, Saturation, Errors for resources | 📚 |
| [Grafana, *The RED Method*](https://grafana.com/blog/2018/08/02/the-red-method-how-to-instrument-your-services/) (Tom Wilkie) | Rate, Errors, Duration for services | 📚 |

## OpenTelemetry and Prometheus

| Source | Supports | Status |
|---|---|---|
| [OTel semconv: Service](https://opentelemetry.io/docs/specs/semconv/resource/service/) | `service.version` (stable, recommended; format free, e.g. `2.0.0`, `a01dbef8a`) | ✅ 2026-11-20 |
| [OTel semconv: Deployment](https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/) | `deployment.environment.name` (stable; replaces deprecated `deployment.environment`) | ✅ 2026-11-20 |
| [OTel Resources concept](https://opentelemetry.io/docs/concepts/resources/) | Setting attributes via `OTEL_RESOURCE_ATTRIBUTES` | ✅ 2026-11-20 |
| [OTel semconv: HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) | `http.server.request.duration`, `http.route` | 📚 |
| [OTel semconv: CI/CD](https://opentelemetry.io/docs/specs/semconv/cicd/) | `cicd.pipeline.*` attributes, `cicd.pipeline.run.duration` (release candidate) | ✅ 2026-11-20 |
| [Collector `k8sattributes` processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor) | `extract.labels` with `tag_name`, `key`, `from: pod` | ✅ 2026-11-20 |
| [Collector span metrics connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md) | Extra `dimensions` (span or resource attributes). Renamed `span_metrics`; `spanmetrics` still works but is deprecated. Alpha | ✅ 2026-11-20 |
| [Prometheus configuration (`otlp` block)](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) | `promote_resource_attributes` (default empty) | ✅ 2026-11-20 |
| [Prometheus, *Using Prometheus as your OTel backend*](https://prometheus.io/docs/guides/opentelemetry/) | Recommended promoted attributes incl. `service.version`; `target_info` join; experimental `info()` | ✅ 2026-11-20 |
| [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/) | `app.kubernetes.io/version`, `part-of` | 📚 |

## Logs, traces, workloads, cost

| Source | Supports | Status |
|---|---|---|
| [Grafana: Loki alerting](https://grafana.com/docs/grafana/latest/datasources/loki/alerting/) | Log alerts need metric functions (`count_over_time`, `rate`); absence pattern | ✅ 2026-11-20 |
| [Tempo: TraceQL metrics](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-queries/) · [functions](https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-queries/functions/) | `rate()`, `quantile_over_time`, arithmetic between queries | ✅ 2026-11-20 |
| [Tail sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor) | `status_code`, `latency`, `probabilistic` policies; all spans of a trace on the same collector | ✅ 2026-11-20 |
| [OTel semconv: messaging metrics](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-metrics/) | `messaging.client.consumed.messages`, `messaging.process.duration` (development) | ✅ 2026-11-20 |
| [Prometheus: When to use the Pushgateway](https://prometheus.io/docs/practices/pushing/) | Only for service-level batch jobs; textfile collector for machine-level | ✅ 2026-11-20 |
| [Prometheus HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/) | `/api/v1/status/tsdb` cardinality stats | ✅ 2026-11-20 |
| [Prometheus: Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/) | `promtool test rules`, `input_series`, `alert_rule_test` | ✅ 2026-11-20 (ran in `make test`) |
| Cardinality budget numbers, retention periods, sampling percentage | – | ⚠️ |

## Visualization

| Source | Supports | Status |
|---|---|---|
| [Grafana: Visualizations](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/) · [Stat](https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/stat/) · [State timeline](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/state-timeline/) · [Status history](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/status-history/) · [Heatmap](https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/heatmap/) | Which panel for which data | ✅ 2026-11-20 |
| [Grafana: Dashboard best practices](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/best-practices/) | Units, normalization, variables, accessible colors, hierarchy | ✅ 2026-11-20 |
| Chart palette (blue / orange / aqua + status) | Colorblind separation and contrast validated for light and dark surfaces | ✅ 2026-11-20 (validator run) |
| One y-axis per chart, thin marks, legend + direct labels | Data-visualization design method | ⚠️ |

## Dynatrace integration (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [OTLP API endpoints](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api) | SaaS and ActiveGate OTLP URLs, ports 443/9999, token scopes, host enrichment caveat | ✅ |
| [Telemetry ingest endpoints on Kubernetes](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/extend-observability-k8s/telemetry-ingest) | Route OTLP through the in-cluster ActiveGate | ✅ |
| [Dynatrace OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector) · [configuration](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/configuration) | Distribution; delta temporality required; `cumulative_to_delta` needs the same instance per series | ✅ |
| [Monitor Prometheus metrics](https://docs.dynatrace.com/docs/observe/infrastructure-observability/container-platform-monitoring/kubernetes-monitoring/monitor-prometheus-metrics) | Scrape annotations; ActiveGate limits; OTel Collector recommended for scale | ✅ |
| [OneAgent with OpenTelemetry data](https://docs.dynatrace.com/docs/ingest-from/dynatrace-oneagent/oneagent-and-opentelemetry/oneagent-otel) | Span Sensor; duplicates if combined with OTLP export | ✅ |
| [Kubernetes Platform Monitoring (DPS)](https://docs.dynatrace.com/docs/license/capabilities/container-monitoring/kubernetes-platform-monitoring) | Pod-hours ($0.002 list); pure OTel consumes no pod-hours | ✅ |
| [Host monitoring modes](https://docs.dynatrace.com/docs/license/capabilities/host-monitoring) · [Foundation & Discovery](https://docs.dynatrace.com/docs/license/capabilities/app-infra-observability/foundation-and-discovery) | Full-Stack vs Infrastructure vs Foundation & Discovery | ✅ |
| [OpenTelemetry licensing](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/opentelemetry-licensing) · [Metrics consumption](https://docs.dynatrace.com/docs/license/capabilities/telemetry/dps-metrics) · [Traces ingest](https://docs.dynatrace.com/docs/license/capabilities/traces/dps-traces-ingest) | Data points per 100k; histogram = 10; trace GiB; Full-Stack included volume | ✅ |
| [Grafana Dynatrace data source](https://grafana.com/docs/plugins/grafana-dynatrace-datasource/latest/) | Enterprise plugin; metrics, problems, Grail | ✅ |
| aks-observability lab results (2026-10) | OOM 1 min, no problem for DB latency / queue down, NON_KEY_REQUESTS, log loss 0, churn, 4 MB / 50 dims, OTLP protobuf only | ✅ measured |
| Per-workload recommendations, alert ownership split, rollout steps | – | ⚠️ |

## Dashboard structure

| Source | Supports | Status |
|---|---|---|
| [Grafana: dashboard management maturity levels](https://grafana.com/docs/grafana/latest/best-practices/dashboard-management-maturity-levels/) | Low/medium/high; hierarchical dashboards with drill-downs | ✅ 2026-11-20 |
| [Grafana: Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/) | Dashboards as code, nested folders | ✅ 2026-11-20 |
| L0–L3 levels, audience table, folder layout | – | ⚠️ |

## Frontend, OpenTelemetry practices, collectors (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [web.dev: Web Vitals](https://web.dev/articles/vitals) · [thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds) · [INP](https://web.dev/articles/inp) | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 at p75 | ✅ |
| [Dynatrace: OpenTelemetry and Dynatrace](https://docs.dynatrace.com/docs/ingest-from/opentelemetry) · [RUM](https://docs.dynatrace.com/docs/observe/digital-experience/rum) | No stable OTel RUM spec; RUM JS + OTel backend via W3C trace context | ✅ |
| [OTel JS: Browser](https://opentelemetry.io/docs/languages/js/getting-started/browser/) · [Grafana Faro](https://grafana.com/oss/faro/) | Browser SDK experimental; Faro as open-source RUM | ✅ |
| [OTel: HTTP semconv stable](https://opentelemetry.io/blog/2023/http-conventions-declared-stable/) · [DB spans](https://opentelemetry.io/docs/specs/semconv/db/database-spans/) | Stability, `OTEL_SEMCONV_STABILITY_OPT_IN` | ✅ |
| [OTel: Collector deployment](https://opentelemetry.io/docs/collector/deploy/) · [agent-to-gateway](https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/) · [gateway](https://opentelemetry.io/docs/collector/deploy/gateway/) | Tiers, tail sampling on gateways, single writer, k8s_cluster duplicates | ✅ |
| [OTel: Internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) · [Scaling](https://opentelemetry.io/docs/collector/scaling/) · [Resiliency](https://opentelemetry.io/docs/collector/resiliency/) | Queue metrics, scale at 60–70% | ✅ |
| [OTel: Config best practices](https://opentelemetry.io/docs/security/config-best-practices/) · [hosting](https://opentelemetry.io/docs/security/hosting-best-practices/) | Secrets, bind address, TLS/auth, minimal components, non-root | ✅ |
| [OTel: Batch processor deprecation](https://opentelemetry.io/blog/2026/collector-batching-migration/) | Exporter-level batching | ✅ |
| [Dynatrace: Collector self-monitoring](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/self-monitoring) | Level detailed, OTLP periodic reader, delta | ✅ |
| [Dynatrace: K8s monitoring with the OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector/use-cases/kubernetes/k8s-monitoring) | k8s_cluster + kubeletstats + events; hostmetrics overlap | ✅ |
| [Dynatrace: Anomaly detection (DQL custom alerts)](https://docs.dynatrace.com/docs/dynatrace-intelligence/anomaly-detection/anomaly-detection-configuration) · [SLOs](https://docs.dynatrace.com/docs/deliver/service-level-objectives) · [DQL metric commands](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/commands/metric-commands) | Static-threshold alerts on DQL; SLI in DQL; burn-rate alert ~10–14 on -1h | ✅ |
| Collector templates `collector/*.yaml` | `otelcol validate` with contrib 0.162.0 | ✅ validated |

## Automation (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [Monaco: getting started](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/monaco-getting-started) · [projects](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/configuration/projects) · [YAML structure](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/configuration/yaml-configuration-saas) | Config = YAML + JSON template + parameters; manifest per environment; `slo-v2`; dry run | ✅ |
| [Dynatrace: dashboard variables](https://docs.dynatrace.com/docs/analyze-explore-automate/dashboards-and-notebooks/dashboards-new/components/dashboard-component-variable) | DQL variables, `$var` in tile queries | ✅ |
| [Dynatrace: workflow event triggers](https://docs.dynatrace.com/docs/analyze-explore-automate/workflows/build/trigger/event-trigger) | Problem trigger, wait for root cause | ✅ |
| [Monaco: type fields](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/configuration/yaml-configuration-saas-type-fields) · [CLI commands](https://docs.dynatrace.com/docs/deliver/configuration-as-code/monaco/reference/commands-saas) | `settings`, `automation` (workflow), `document` (dashboard), `slo-v2`; deploy / download / delete | ✅ |
| Tier defaults, onboarding target, platform KPIs, template JSON bodies | – | ⚠️ |

## Capacity, queues and internal services (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [SRE Book: Production services best practices](https://sre.google/sre-book/service-best-practices/) · [Introduction](https://sre.google/sre-book/introduction/) · [Software engineering in SRE](https://sre.google/sre-book/software-engineering-in-sre/) | Demand forecasting, load testing, N+2, intent-based capacity planning | ✅ |
| [SRE Book: Handling overload](https://sre.google/sre-book/handling-overload/) · [Addressing cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) · [Workbook: Managing load](https://sre.google/workbook/managing-load/) | Retry budgets (≤ 3 attempts, ≤ 10% extra), backoff + jitter, deadlines, load shedding | ✅ |
| [Little's law](https://en.wikipedia.org/wiki/Little%27s_law) (J.D.C. Little, 1961) | L = λW | ✅ |
| [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) | Utilization vs requests, behavior, tolerance | ✅ |
| [KEDA: Kafka scaler](https://keda.sh/docs/2.21/scalers/apache-kafka/) | Scale on lag; `lagThreshold` semantics by version | ✅ |
| [Dynatrace: Forecast resource utilization (Workflows)](https://docs.dynatrace.com/docs/dynatrace-intelligence/use-cases/dynatrace-intelligence-for-workflows) · [Predictive analysis](https://docs.dynatrace.com/docs/dynatrace-intelligence/reference/ai-models/forecast-analysis) | Scheduled forecasts with DQL input | ✅ |
| Headroom per tier, right-sizing %, internal SLO margins | – | ⚠️ |

## Logging (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [OTel: Logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) | Record fields, SeverityNumber ranges, ERROR ≥ 17, EventName | ✅ |
| [OTel semconv: Exceptions in logs](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/) · [Naming](https://opentelemetry.io/docs/specs/semconv/general/naming/) | `exception.*` attributes; naming rules, custom prefixes | ✅ |
| [Dynatrace: Mask sensitive data in logs](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-use-cases/methods-of-masking-sensitive-data) · [OpenPipeline log processing](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-processing/lma-openpipeline) | Masking at capture + at ingest | ✅ |
| [Dynatrace: Log buckets and retention](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-bucket-assignment) | Custom buckets 1 day–10 years, default 35 days | ✅ |
| [Dynatrace: Connect logs to traces](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-enrichment) · [Ingest OTLP logs](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api/ingest-logs) | `trace_id` / `span_id` mapping | ✅ |
| Retention per log class, pseudonymization | – | ⚠️ |

## Incidents, resilience, effectiveness (checked 2026-11-20)

| Source | Supports | Status |
|---|---|---|
| [SRE Book: Being on-call](https://sre.google/sre-book/being-on-call/) · [Postmortem culture](https://sre.google/sre-book/postmortem-culture/) · [Accelerating SREs to on-call](https://sre.google/sre-book/accelerating-sre-on-call/) · [Introduction (playbooks ~3× MTTR)](https://sre.google/sre-book/introduction/) · [Eliminating toil](https://sre.google/sre-book/eliminating-toil/) | On-call load and rotation size, blameless postmortems, Wheel of Misfortune, playbooks, toil < 50% | ✅ |
| [SRE Workbook: On-call](https://sre.google/workbook/on-call/) · [Operational overload](https://sre.google/workbook/overload/) · [Data processing pipelines](https://sre.google/workbook/data-processing/) | Handoffs, playbook upkeep, pager budget; freshness, coverage, correctness SLIs, golden data | ✅ |
| [Azure Well-Architected: Disaster recovery](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery) · [Reliability testing](https://learn.microsoft.com/en-us/azure/well-architected/reliability/reliability-test) | RPO/RTO as pass/fail, whole-flow tests, failback, yearly production drill | ✅ |
| [Principles of Chaos Engineering](https://principlesofchaos.org/) | Steady state, hypothesis, production experiments, blast radius | ✅ |
| [OpenFeature](https://openfeature.dev/) | Vendor-neutral feature flag API (CNCF) | ✅ |
| [Atlassian: MTTA, MTTR, MTBF](https://www.atlassian.com/incident-management/kpis/common-metrics) | Metric definitions, the four meanings of MTTR | ✅ |
| KPI targets, RPO/RTO per tier, escalation timings, example cases | – | ⚠️ |

## Releases and delivery

| Source | Supports | Status |
|---|---|---|
| [DORA: the four keys](https://dora.dev/guides/dora-metrics-four-keys/) · [metrics history](https://dora.dev/insights/dora-metrics-history/) | Deployment frequency, change lead time, change failure rate, **failed deployment recovery time** (renamed from MTTR in 2023), **deployment rework rate** (added 2024) | ✅ 2026-11-20 |
| [Grafana Annotations HTTP API](https://grafana.com/docs/grafana/latest/developers/http_api/annotations/) | `POST /api/annotations` with `tags`, `text` (required), epoch ms | ✅ 2026-11-20 |
| [Argo CD notifications: triggers](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/) · [catalog](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/) | `on-deployed` = synced and healthy, once per revision | ✅ 2026-11-20 |
| [Argo Rollouts analysis](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/) · [Prometheus provider](https://argo-rollouts.readthedocs.io/en/stable/analysis/prometheus/) | `AnalysisTemplate`, `successCondition`, `failureLimit` | ✅ 2026-11-20 |
| [Martin Fowler, *Strangler Fig Application*](https://martinfowler.com/bliki/StranglerFigApplication.html) | Incremental migration, old and new in parallel | 📚 |

## Incidents and ownership

| Source | Supports | Status |
|---|---|---|
| [Google SRE Book, *Managing Incidents*](https://sre.google/sre-book/managing-incidents/) | Incident roles (IC, ops, comms) | 📚 |
| [Google SRE Book, *Postmortem Culture*](https://sre.google/sre-book/postmortem-culture/) | Blameless postmortems | 📚 |
| [PagerDuty Incident Response](https://response.pagerduty.com/) | Roles, process | 📚 |
| [Google SRE Workbook, *Engagement Model*](https://sre.google/workbook/engagement-model/) | Production Readiness Review before GA | ✅ 2026-11-20 |
| [DORA: Generative organizational culture](https://dora.dev/capabilities/generative-organizational-culture/) | Westrum survey; high-trust culture predicts delivery and organizational performance | ✅ 2026-11-20 |
| [DORA: Monitoring and observability](https://dora.dev/capabilities/monitoring-and-observability/) | Avoid a single person/team owning monitoring; track changes to monitoring config | ✅ 2026-11-20 |
| [Backstage software catalog](https://backstage.io/docs/features/software-catalog/) | Machine-readable ownership | 📚 |
| RACI split, ritual cadences, maturity levels, transition phase lengths | – | ⚠️ |

## Dynatrace

| Source | Supports | Status |
|---|---|---|
| [Version detection methods](https://docs.dynatrace.com/docs/deliver/release-monitoring/version-detection-strategies-latest) · [Build label propagation](https://docs.dynatrace.com/docs/ingest-from/setup-on-k8s/guides/metadata-automation/build-label-propagation) | `app.kubernetes.io/version` → `DT_RELEASE_VERSION` (pod labels only), enabled with DynaKube feature flag `feature.dynatrace.com/label-version-detection=true` | ✅ 2026-11-20 |
| [Events API v2: POST an event](https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/post-event) | `eventType: CUSTOM_DEPLOYMENT` | ✅ 2026-11-20 |
| [Site Reliability Guardian](https://docs.dynatrace.com/docs/deliver/site-reliability-guardian) · [release validation](https://docs.dynatrace.com/docs/deliver/quality-gates) | Release validation with objectives (DQL), "Four golden signals" template, triggered by SDLC events | ✅ 2026-11-20 |
| [Event analysis and correlation](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/root-cause-analysis/concepts/events) | Davis merges events with the same root cause into one problem, using topology (not time alone) | ✅ 2026-11-20 |
