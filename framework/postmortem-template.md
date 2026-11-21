# Postmortem template (blameless)

> Required for SEV1/SEV2, an incident using > 20% of the error budget, or a repeat incident.
> Describe systems and decisions, not people's mistakes. Guide: [21](../standard/21-incident-response-and-on-call.md#postmortems).

| Field | Value |
|---|---|
| Title | e.g. "checkout errors for Fabrikam after release 1.42.0" |
| Date · severity · services | 2026-11-20 · SEV2 · checkout |
| Authors · reviewers | |
| Status | draft / reviewed / actions closed |

## Summary

Three sentences: what happened, impact, how it was fixed.

## Impact

| Measure | Value |
|---|---|
| Users / clients affected | |
| Duration of impact | impact start → mitigated |
| Error budget used | % of the 28-day budget (per SLO, per client SLO) |
| SLA / financial impact | |

## Timeline (from data)

| Time (UTC) | Event | Source |
|---|---|---|
| 14:02 | Deployment 1.42.0 | Deployment event |
| 14:05 | Impact starts | SLI / per-client error ratio |
| 14:09 | First alert | Problem / custom alert |
| 14:10 | Acknowledged | On-call tool |
| 14:14 | Mitigated (rollback) | Deployment event |
| 14:19 | Resolved | Problem closed |

**Detection:** detected by alert / customer / employee? Time to detect, acknowledge, mitigate, resolve ([23](../standard/23-measuring-effectiveness.md)).

## Contributing factors

Several, not one "root cause". For each: why did the system allow it?

## What went well · what went badly · where we got lucky

## Action items

| Action | Type (prevent / detect / mitigate / process) | Owner | Priority | Due | Ticket |
|---|---|---|---|---|---|

## Updates to the standard

Runbook, alert, dashboard, playbook status, guide section changed because of this incident.
