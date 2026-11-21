# 12 · Releases and DORA (Delivery layer)

> **In 30 seconds:** most incidents start with a change. Put the **version on every signal** (`service.version`),
> send a **deployment event** to Dynatrace when a rollout finishes, alert when the new version is worse than the old
> one, and let the same events produce **DORA metrics**.

| Technique | Answers |
|---|---|
| **Version dimension** (`service.version` = image tag) | Is the new version worse than the old one? |
| **Deployment events** (SDLC events) | Did errors start right after a deploy? |
| **Release validation** (Site Reliability Guardian) | Should this release be promoted or rolled back? |
| **DORA from SDLC events** | Are we shipping faster and safer over time? |

## 1. Version on every signal

```yaml
# Deployment rendered by the pipeline with IMAGE_TAG
metadata:
  labels:
    app.kubernetes.io/version: "1.42.0"
containers:
  - image: registry.example/checkout:1.42.0
    env:
      - name: OTEL_RESOURCE_ATTRIBUTES
        value: "service.version=1.42.0"
```

Without touching the app, the collector's `k8sattributes` copies the pod label into `service.version` ([collector/agent.yaml](../collector/)). If OneAgent also runs, Dynatrace reads the same label as the release version when the DynaKube flag `feature.dynatrace.com/label-version-detection=true` is set.

```text
// DQL shape: error ratio per version during a rollout
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), errors = countIf(http.response.status_code >= 500) }, by:{ service.version }
| fieldsAdd error_ratio = errors[] / total[]
```

<div data-widget="viz" data-chart="version-split"></div>

During a rolling update both versions take traffic at once: if 1.42.0 shows 4% errors and 1.41.3 shows 0.2%, you have the culprit. A version label is fine for cardinality: old versions go stale after the rollout.

## 2. Deployment events

| Source | How |
|---|---|
| Pipeline step after `kubectl rollout status` | Send an SDLC **deployment** event (`event.type: deployment`, `event.status: finished`) with service, version, commit, author |
| Argo CD | `on-deployed` notification (synced and healthy, once per revision) → webhook that sends the same event |
| Classic API | Events API v2 with `eventType: CUSTOM_DEPLOYMENT` |

Mark the deploy when it **finished**, not when the pipeline started. Dynatrace shows deployments on a timeline next to versions and problems (Release Monitoring), and Davis can relate a problem to the change.

## 3. Alerts that know about releases

| Alert | Condition (shape) | Routing |
|---|---|---|
| **Release regression** | While two versions serve traffic: worst version's error ratio > 2× the best and > 1% ⚠️ | Deploying team, rollback runbook first |
| **SLO burn right after a deploy** | Burn rate > 14.4 **and** a deployment event for the service in the last 30 min | Deploying team, label `suspect: deploy` |
| **Release validation failed** | Site Reliability Guardian objective (SLO, error rate, latency) fails after the deployment event | Pipeline blocks promotion or triggers rollback |
| **Error budget exhausted** | SLO budget < 0 | Release gate: only fixes ship ([10](10-slos-and-error-budgets.md)) |

Release validation flow (Dynatrace docs): pipeline sends *deployment finished* → a Workflow runs the Guardian → the result comes back as a validation event the pipeline uses to promote or roll back.

<details>
<summary>Open-source variant (Prometheus + Grafana)</summary>

- Version as a metric label: Prometheus `promote_resource_attributes: [service.version]`.
- Deploy markers: Grafana annotations API from the pipeline, or an annotation query on `kube_deployment_status_observed_generation`.
- Tested PromQL for release regression and burn-after-deploy: `ReleaseRegression`, `CheckoutBurnAfterDeploy` in [rules/](../rules/).
- Canary analysis: Argo Rollouts `AnalysisTemplate` with a Prometheus provider.

</details>

## 4. DORA metrics

| Metric | From which events |
|---|---|
| **Deployment frequency** | Deployment events per service per week |
| **Change lead time** | Commit time → deployment event time |
| **Change failure rate** | Deployments followed by rollback, hotfix, failed validation, or a problem linked to the deploy |
| **Failed deployment recovery time** | Failed deployment → service restored (problem closed / rollback done) |
| **Deployment rework rate** (added 2024) | Unplanned deployments caused by a production incident |

In 2023 DORA renamed "mean time to restore" to **failed deployment recovery time**: it counts only failures caused by a change. Dynatrace's pipeline observability derives DORA-style KPIs from the same SDLC events you already send; query them with DQL and show them as stat tiles.

<div data-widget="viz" data-chart="dora-tiles"></div>

Playbook: [DORA from pipelines](../playbooks/dora-from-pipelines.md).

## Common mistakes

| ❌ | ✅ |
|---|---|
| Version only in the image name | `service.version` on every signal |
| Deploy marked when the pipeline starts | Mark when the rollout finished |
| Comparing "before vs after" by eye | Error ratio **by version** during the rollout |
| DORA as a target for individuals | Trends per team; DORA warns against using metrics as targets |

## Sources

- [OTel semconv: service.version](https://opentelemetry.io/docs/specs/semconv/resource/service/) ✅
- [Dynatrace: Pipeline observability / SDLC events](https://docs.dynatrace.com/docs/deliver/pipeline-observability-sdlc-events) · [Ingest SDLC events](https://docs.dynatrace.com/docs/deliver/pipeline-observability-sdlc-events/sdlc-events) · [Analyze](https://docs.dynatrace.com/docs/deliver/pipeline-observability-sdlc-events/pipeline-observability-analyze) ✅ 2026-11-20
- [Dynatrace: Version detection](https://docs.dynatrace.com/docs/deliver/release-monitoring/version-detection-strategies-latest) · [Events API v2](https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/post-event) · [Release validation with Site Reliability Guardian](https://docs.dynatrace.com/docs/deliver/quality-gates) ✅ 2026-11-20
- [Argo CD notification triggers](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/) ✅
- [DORA four keys](https://dora.dev/guides/dora-metrics-four-keys/) · [metrics history](https://dora.dev/insights/dora-metrics-history/) ✅
- Regression thresholds (2×, 1%), 30-min deploy window: rules of thumb ⚠️
