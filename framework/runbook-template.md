# Runbook template

> One runbook per paging alert, linked from the alert (`runbook` property). Written for someone tired at 3 a.m. who
> doesn't know this service. Guide: [21](../standard/21-incident-response-and-on-call.md#runbooks).

| Field | Value |
|---|---|
| Alert | e.g. `checkout · SLO fast burn` |
| Service · tier · owner | checkout · 1 · payments |
| Last reviewed | YYYY-MM-DD (update it every time the alert fires) |

## What this alert means

One or two sentences in user terms: who is affected and what they see. The SLO or threshold behind it.

## Impact: how bad is it?

- L1 dashboard (link with `service` filled in): error ratio, per client, per version.
- Rough severity guide: all clients → SEV1/2; one client → check SLA ([20](../standard/20-ownership-and-communication.md#severity-levels-and-actions)).

## First checks (5 minutes)

1. **Recent change?** Deployment events in the last 60 min (L1 "per version" row).
2. **One client or all?** Per-client table.
3. **Dependencies?** Client-side errors to DB / payments-api / auth (traces, service flow).
4. **Saturation?** Pods at memory limit, HPA at max, connection pool full.
5. **Platform?** Open Davis problems on the cluster or the database.

## Mitigations (most reversible first)

| If | Do | Command / button |
|---|---|---|
| New version is worse | Roll back | `kubectl rollout undo deploy/checkout -n shop` |
| HPA at max, latency rising | Scale out | `kubectl scale deploy/checkout -n shop --replicas=<n>` |
| New feature suspected | Turn the flag off | Flag `new-pricing` → off |
| Dependency down | Fail over / shed load | link to the dependency's runbook |

## Escalation

| When | Whom |
|---|---|
| Not mitigated in 15 min, or SEV1/2 | Incident Commander (page) |
| Dependency at fault | Owning team's on-call (from the service catalog) |

## Verify

Which tile must turn green, and for how long, before you call it resolved.

## Background

Architecture notes, known issues, links to past postmortems for this alert.
