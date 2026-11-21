# 21 · Incident response, runbooks, postmortems and on-call

> **In 30 seconds:** the loop is **alert → runbook → incident → postmortem → better alert and runbook**. Every page
> links to a **runbook** with first checks and safe mitigations; incidents follow the severity rules ([20](20-ownership-and-communication.md#severity-levels-and-actions));
> every SEV1/SEV2 gets a **blameless postmortem** with tracked actions; and **on-call** is designed so people can do it
> for years: ≤ 2 incidents per shift, clean handovers, clear escalation, practice before the real thing.

## The incident loop

<div data-widget="viz" data-chart="incident-lifecycle"></div>

| Phase | Ends when | Metric ([23](23-measuring-effectiveness.md)) |
|---|---|---|
| Detect | An alert fires (or a customer reports) | Time to detect (MTTD); % detected by monitoring |
| Acknowledge | A human owns it | Time to acknowledge (MTTA) |
| Mitigate | Users are no longer affected (rollback, failover, flag off) | Time to mitigate |
| Resolve | The system is back to normal and stable | Time to restore/resolve (define which "R" you use) |
| Learn | Postmortem done, actions tracked | % actions closed on time; repeat incidents |

## Runbooks

The SRE book reports about a **3× better MTTR** when responders follow a playbook written in advance instead of "winging it". Every alert that pages has one.

| Section | Contents |
|---|---|
| **What this alert means** | The symptom in user terms, the SLO or threshold, why it pages |
| **Impact** | Who is affected, how to see how many (dashboard link with variables filled) |
| **First checks (5 min)** | 3–5 concrete checks in order: recent deployment? one client or all? dependencies? saturation? |
| **Mitigations** | Safe actions, most reversible first: roll back, scale out, disable a feature flag, fail over, shed load. Exact commands or buttons |
| **Escalation** | When and whom: second line, owning team of a dependency, Incident Commander (SEV rules) |
| **Verify** | How to confirm it's fixed (which tile turns green) |
| **Background** | Architecture notes, known issues, links to past postmortems |

| Runbook rule | Why |
|---|---|
| Written for someone tired at 3 a.m. who doesn't know this service | That's who reads it |
| Commands copy-pasteable, with the namespace/service filled in | No mistakes under stress |
| Owned by the service team; reviewed when the alert fires (update it right after) | Runbooks rot otherwise; the SRE workbook asks on-call to update the playbook when its page fires |
| One runbook per alert, linked from the alert itself (`runbook` property) | One click from the page |
| Automate the steps you repeat every time (Workflows, scripts) | Toil reduction ([23](23-measuring-effectiveness.md#toil)) |

Template: [framework/runbook-template.md](../framework/runbook-template.md).

## Postmortems

| Rule | Why |
|---|---|
| **Required** for SEV1 and SEV2, a single incident using > 20% of the error budget, and any repeat incident | Learning, not blame ([10](10-slos-and-error-budgets.md)) |
| **Blameless**: describe systems and decisions, not people's mistakes | People must feel safe to tell the truth |
| Draft within **5 working days**, reviewed with the people involved | Memory fades fast |
| Timeline from data: problem events, deployment events, chat, traces | Facts, not recollection |
| **Contributing factors**, not one "root cause" | Incidents have several causes |
| Every action has an **owner, priority and due date**, tracked in the backlog | Untracked actions never happen |
| Monthly review of open actions; share learnings widely | Close the loop |
| Update the guide: playbook status, runbook, alert, dashboard | The standard improves from real incidents |

Template: [framework/postmortem-template.md](../framework/postmortem-template.md).

## On-call

| Practice | Rule ⚠️ | Source |
|---|---|---|
| **Load** | ≤ 2 incidents per 12-hour shift; median close to 0 | SRE book / workbook |
| **Rotation size** | At least 6–8 people per rotation (or two time zones) so nobody is on call more than ~1 week in 6–8 | SRE book (≥ 8 single-site, 6 per site multi-site) |
| **Escalation** | Primary → secondary (5–10 min) → team lead / Incident Commander | – |
| **Handover** | At every shift change: open incidents, noisy alerts, ongoing changes, things to watch | SRE workbook |
| **After a rough night** | Time off the next morning; follow-up work moves to the next shift | Sustainability |
| **Training** | Shadow a shift, then reverse-shadow, then primary; **Wheel of Misfortune** role-plays on past incidents | SRE book |
| **Tooling** | Pages carry runbook + dashboard links; one page per incident (Davis grouping + Workflow routing) | [11](11-alerting.md) |
| **Review** | Weekly: pages, noisy alerts, toil; give the pager back to the dev team if the service stays below standard | SRE workbook |

```text
Handover note (end of shift)
- Incidents: SEV3 #1234 orders-worker lag, mitigated (scaled to 6), RCA pending → owner payments
- Noisy alerts: "checkout · per-client ratio" fired twice at night for client "tiny" → raise min errors (ticket #567)
- Changes in flight: Postgres minor upgrade Thursday 10:00 (platform-data)
- Watch: disk forecast for orders-db crosses limit in ~9 days
```

## Wheel of Misfortune (practice)

A role-play of a past incident: one person acts as "the system", the on-call trainee investigates and responds, a facilitator keeps time and notes. Afterwards, update the runbook and the dashboards with what was missing. Run it monthly with new on-call members; use real postmortems as scripts.

## Common mistakes

| ❌ | ✅ |
|---|---|
| Alert without a runbook, or a runbook that says "investigate" | Concrete checks and mitigations |
| Root cause = "human error" | Ask why the system allowed it |
| Postmortem actions in a document nobody reads | Tracked tickets with owners and dates |
| Same 3 people always on call | Bigger rotation, follow-the-sun, fewer pages |
| Severity debated during the incident | Decide fast, adjust later ([20](20-ownership-and-communication.md#severity-levels-and-actions)) |

## Sources

- [Google SRE Book: Being on-call](https://sre.google/sre-book/being-on-call/) · [Managing incidents](https://sre.google/sre-book/managing-incidents/) · [Postmortem culture](https://sre.google/sre-book/postmortem-culture/) · [Accelerating SREs to on-call (Wheel of Misfortune)](https://sre.google/sre-book/accelerating-sre-on-call/) · [Introduction (playbooks ~3× MTTR)](https://sre.google/sre-book/introduction/) ✅ 2026-11-20
- [Google SRE Workbook: On-call (handoffs, playbook upkeep)](https://sre.google/workbook/on-call/) · [Incident response](https://sre.google/workbook/incident-response/) · [Postmortem culture](https://sre.google/workbook/postmortem-culture/) · [Operational overload](https://sre.google/workbook/overload/) ✅ 2026-11-20
- [Atlassian: MTTA, MTTR, MTBF](https://www.atlassian.com/incident-management/kpis/common-metrics) ✅ 2026-11-20
- Escalation timings, handover format: rules of thumb ⚠️
