# SLO document template

> One per service (or per critical user journey). Keep it to one page. Based on the structure of the
> [SRE Workbook's example SLO document](https://sre.google/workbook/slo-document/).

| Field | Value |
|---|---|
| Service | |
| Owner (team) | |
| Status | draft / approved |
| Approved by | service owner · SRE · business owner |
| Approved on | YYYY-MM-DD |
| Next review | YYYY-MM-DD (monthly or quarterly) |
| Error budget policy | link to [error-budget-policy](error-budget-policy-template.md) copy |

## 1. Service overview

What the service does, who uses it (internal teams, clients A/B/C), and which user journeys depend on it.

## 2. SLIs and SLOs

| Journey | SLI type | SLI definition (good / valid) | Measured at | SLO | Window |
|---|---|---|---|---|---|
| Checkout | Availability | non-5xx responses / all requests to `/api/checkout` | gateway | 99.9% | 28d |
| Checkout | Latency | requests < 500 ms / all requests | gateway | 99% | 28d |

Per-client targets (if multi-tenant):

| Client | Contract | SLO |
|---|---|---|
| | | |

## 3. Rationale

Why these SLIs and targets: current performance over the last 4 weeks, what users notice, what the SLA promises.

## 4. Error budget

| SLO | Budget (28d) | Approx. in requests or minutes |
|---|---|---|
| 99.9% | 0.1% | e.g. 1,000 bad requests per 1,000,000 |

## 5. Alerting

Burn-rate alerts per [standard/03](../standard/11-alerting.md) (links to the rule files and dashboard).

## 6. Clarifications and caveats

What does **not** count: load tests, known bad clients, planned maintenance, 4xx caused by callers, etc.

## 7. Change log

| Date | Change | Why |
|---|---|---|
