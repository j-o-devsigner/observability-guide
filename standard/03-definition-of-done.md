# 03 · Definition of done: is this endpoint/service monitored?

> Use this table as the **Production Readiness Review (PRR)** checklist before a service goes live or joins on-call
> ([SRE Workbook, Engagement Model](https://sre.google/workbook/engagement-model/)).
>
> A service is well monitored when you can **break it on purpose** and the system tells you
> **what broke, for whom, which change caused it, and who owns it**, before a client does.

<div data-widget="checklist"></div>

| # | Check | Layer | Standard |
|---|---|---|---|
| 1 | RED metrics by `http.route` (histogram, not summary) | Service | [04](04-endpoint-coverage.md) |
| 2 | Resource attributes: `service.name`, `service.version`, `team`, env | All | [04](04-endpoint-coverage.md) |
| 3 | SLO document approved (availability + latency) and an error budget policy agreed | Service | [10](10-slos-and-error-budgets.md) |
| 4 | Burn-rate alerts, per client if multi-tenant, with min-count guard | Service | [11](11-alerting.md) |
| 5 | Every alert has `team`, `severity`, `runbook_url`, `dashboard_url` | Process | [20](20-ownership-and-communication.md) |
| 6 | Traces end to end, dependencies as child spans | Traces | [04](04-endpoint-coverage.md) |
| 7 | Structured logs with `trace_id`: metric → trace → log in ≤ 3 clicks | Logs | [04](04-endpoint-coverage.md) |
| 8 | Saturation of the resources behind it covered (USE) | Resources | [01](01-layers.md), [08](08-kubernetes-cluster.md) |
| 9 | Deploy markers on the dashboard + errors splittable by version | Delivery | [12](12-releases-and-dora.md) |
| 10 | Synthetic check from outside the cluster | UX | [01](01-layers.md) |
| 11 | At least one business KPI with an owner | Business | [04](04-endpoint-coverage.md) |
| 12 | **Tested**: failure injected (bad version, killed dependency, latency), the alert fired, the dashboard showed it, the trace found the cause | Validation | – |

> Official links and verification status: [REFERENCES.md](../REFERENCES.md)
