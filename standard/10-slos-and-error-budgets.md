# 10 · SLOs and error budgets

> **In 30 seconds:** an SLO is a target for "good events / all events" over 28–30 days. The gap to 100% is the
> **error budget**. Alert when the budget **burns too fast**, and agree in advance (the **error budget policy**) what
> happens when it's gone. In Dynatrace, the SLI is a **DQL query** in the Service-Level Objectives app.

## Terms

| Term | Meaning | Example |
|---|---|---|
| **SLI** | Good events / valid events, as a % (100% = all good) | % of `/checkout` requests that return non-5xx in < 500 ms |
| **SLO** | Target for the SLI over a window | 99.9% over 28 days |
| **Error budget** | 100% − SLO: the failure you may spend | 0.1% → 1,000 bad requests of 1,000,000 in 4 weeks |
| **Burn rate** | How fast the budget is used (1 = exactly on budget) | 14.4 = a 30-day budget gone in ~2 days |
| **Error budget policy** | Agreed actions when the budget is spent | Freeze releases except P0 and security fixes |
| **SLA** | Contract with a client, usually looser than the SLO | 99.5% with service credits |

## Choosing SLIs

| Service type | SLI | Measured from |
|---|---|---|
| Request/response API | Availability (non-5xx), latency (< threshold) | Server spans / request metrics, as close to the user as possible |
| User journey | RUM or synthetic success rate | Dynatrace RUM / synthetic ([07](07-frontend-experience.md)) |
| Queue consumer | Age of oldest message, processing success | [06](06-workload-types.md) |
| Batch / pipeline | Freshness, success of each run | [06](06-workload-types.md) |
| Per client (multi-tenant) | Same SLI split by `client.id`, target per contract | [04](04-endpoint-coverage.md#multiple-clients-on-one-service) |

Rules of thumb ⚠️: 1–2 SLIs per user journey; window 28 or 30 days; start the target from **current performance**, tighten later.

## The SLI in Dynatrace (DQL)

```text
// Availability SLI for checkout from OTel server spans (shape; check field names in your tenant)
fetch spans
| filter service.name == "checkout" and span.kind == "server"
| makeTimeseries { total = count(), bad = countIf(http.response.status_code >= 500) }
| fieldsAdd sli = 100 * (1 - bad[] / total[])
```

| Step | How |
|---|---|
| 1. Create the SLO | Service-Level Objectives app → custom SLI in DQL (as above) or a built-in template; target 99.9, window 28 days |
| 2. Burn rate | Dynatrace docs: burn rate = error rate / error budget over the look-back window; computed per service |
| 3. Alert | Anomaly detection (custom alert) on the burn rate, **-1h** look-back, static threshold starting around **10–14** (Dynatrace docs) |
| 4. As code | Monaco `slo-v2` config + template ([18](18-automation-and-scale.md)) |

**Multi-window** (Google SRE Workbook): page when **both** a long and a short window burn fast, so the alert also resolves fast. In Dynatrace, build it as two conditions (two custom alerts combined in one workflow, or one query that requires both) ⚠️.

| Severity | Burn rate | Long window | Short window | Budget used |
|---|---|---|---|---|
| Page | 14.4 | 1h | 5m | 2% |
| Page | 6 | 6h | 30m | 5% |
| Ticket | 1 | 3d | 6h | 10% |

After a fix, the slower pair keeps alerting until its short window is clean (up to ~30 min for the 6h/30m pair).

<details>
<summary>Open-source variant (Prometheus)</summary>

```promql
# Availability SLI, 28d
1 - (
  sum(increase(http_server_request_duration_seconds_count{service_name="checkout", http_response_status_code=~"5.."}[28d]))
  /
  sum(increase(http_server_request_duration_seconds_count{service_name="checkout"}[28d]))
)
```

Tested burn-rate rules with promtool unit tests: [rules/](../rules/). Generators: Sloth, Pyrra.

</details>

## The two documents every SLO needs

| Document | Template | Signed by |
|---|---|---|
| **SLO document**: what is measured, target, why | [framework/slo-document-template.md](../framework/slo-document-template.md) | Service owner, SRE, business owner |
| **Error budget policy**: what happens when it's spent | [framework/error-budget-policy-template.md](../framework/error-budget-policy-template.md) | Same + engineering manager |

## How the policy connects to everything else

| Budget state | Alerting | Releases | Planning |
|---|---|---|---|
| Healthy (> 50% left) ⚠️ | Normal burn-rate alerts | Ship normally | Feature work |
| Burning fast | Page (14.4× / 6×) | Pause risky changes | – |
| Exhausted (4-week window) | – | **Freeze** except P0 and security fixes (release gate: Site Reliability Guardian objective on the SLO, [12](12-releases-and-dora.md)) | Reliability work first |
| One incident > 20% of budget | – | – | Postmortem with at least one P0 action item |

<div data-widget="viz" data-chart="budget-burndown"></div>

The freeze and 20% rows come from the Workbook's example policy; "> 50%" is a rule of thumb.

## Review cadence

| When | Who | Question |
|---|---|---|
| Monthly | Team, SRE, business owner | Budget status; is the target still right? |
| After a big incident | Postmortem attendees | Did the budget reflect user pain? |
| Quarterly | Leadership | Trend across services; where to invest |

## Common mistakes

| ❌ | ✅ |
|---|---|
| SLO = 100% | Leave room to change things; 100% means no releases |
| Target picked from a wish | Start from the last 4 weeks, tighten later |
| SLO without a policy | Nothing changes when it's missed |
| Alert on the SLI value itself | Alert on the **burn rate** |

## Sources

- [Dynatrace: Service-Level Objectives](https://docs.dynatrace.com/docs/deliver/service-level-objectives) · [SLO examples](https://docs.dynatrace.com/docs/deliver/service-level-objectives/service-level-objective-examples): DQL SLI, burn rate formula, anomaly detection threshold ~10–14 on -1h ✅ 2026-11-20
- [Dynatrace: DQL aggregation commands (makeTimeseries, countIf)](https://docs.dynatrace.com/docs/platform/grail/dynatrace-query-language/commands/aggregation-commands) ✅ 2026-11-20
- [SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/) · [Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/) · [Error budget policy](https://sre.google/workbook/error-budget-policy/) ✅ 2026-11-20
- Multi-window construction in Dynatrace, "> 50%" boundary: rules of thumb ⚠️
