# Game day template (chaos experiment or restore test)

> Prove that alerts, runbooks, failover and restores work, before an incident proves they don't.
> Guide: [22](../standard/22-resilience.md).

| Field | Value |
|---|---|
| Name · date · environment | e.g. "orders-db replica loss" · 2026-12-03 · staging → prod (one zone) |
| Owner · participants · observer | |
| Abort rule | Stop if checkout SLO burns > 6× or a customer reports impact |
| Kill switch | How to stop the injection immediately |

## Steady state (measurable)

checkout SLI ≥ 99.9% · p95 < 300 ms · orders queue age < 60 s

## Hypothesis

"If <failure>, then <steady state holds> and <alert X fires in < N min>, and the runbook leads to recovery within RTO."

## Injection

What exactly is broken, how, for how long (tool / command).

## Results

| Expectation | Result | Pass? |
|---|---|---|
| Steady state held | | |
| Alert fired within N min | | |
| Runbook was enough | | |
| Recovery within RTO (restore tests: data within RPO) | measured duration | |

## Gaps and actions

| Gap | Action | Owner | Due |
|---|---|---|---|

## Next game day

Date and scenario.
