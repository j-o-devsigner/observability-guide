# Transition plan: from an existing observability setup to the standard

> You almost never start from zero. There are already dashboards, alerts, maybe two tools, and people used to them.
> Principles: **assess before changing · pilot one service · run old and new in parallel · delete only after proof · communicate every step.**

## Phases at a glance

| Phase | Duration (typical) | Goal | Exit criteria |
|---|---|---|---|
| 0 · Assess | 1–2 weeks | Know what exists and what hurts | Inventory + maturity score + pilot chosen |
| 1 · Foundations | 2–3 weeks | Conventions everyone will reuse | Labels, routing, templates merged |
| 2 · Pilot | 3–4 weeks | Prove the standard on 1 service | Pilot meets definition of done + before/after numbers |
| 3 · Rollout | waves of 2–4 weeks | Bring other services over | Each wave meets definition of done |
| 4 · Decommission | per wave | Remove old alerts/dashboards/tools | No old rule left without reason |
| 5 · Operate | ongoing | Keep it healthy | Rituals running, KPIs trending right |

Durations are rough guides for a mid-size team (10–30 services). Adjust.

---

## Phase 0 · Assess

| Task | How | Output |
|---|---|---|
| Inventory services | Service catalog, `kubectl get deploy -A`, APM service list | List with owner, criticality (tier 1/2/3) |
| Inventory alerts | Export alert definitions; problems per alert in 30d (Problems app / DQL), % actioned | Alert table ([11 §7](../standard/11-alerting.md#7-cleaning-up-a-noisy-alert-set)) |
| Inventory dashboards | Grafana API: last viewed, owner | Keep / merge / delete list |
| Pain interviews | 30 min with on-call, team leads, a business owner | Top 5 pains in their words |
| Maturity score | [02-maturity-model.md](../standard/02-maturity-model.md) | Current vs target per dimension |
| Choose pilot | Tier 1, a motivated team, real pain, not the most complex | Pilot service + sponsor |

## Phase 1 · Foundations (decide once, reuse everywhere)

| Decision | Standard |
|---|---|
| Naming & semantic conventions | OTel semconv; `http.route`, no raw URLs |
| Required resource attributes | `service.name`, `service.version`, `team`, `deployment.environment.name` ([04](../standard/04-endpoint-coverage.md)) |
| Severity scheme | `page` / `ticket` only |
| Alert routing | Alertmanager tree by `team` → `severity` ([20](../standard/20-ownership-and-communication.md)) |
| Templates | SLO rules (Sloth/Pyrra), service dashboard with `$service/$client/$version`, runbook template |
| Deploy markers | Pipeline or Argo CD → annotations ([12](../standard/12-releases-and-dora.md)) |
| CI checks | `promtool check rules` + lint: `team`, `severity`, `runbook_url` required |

## Phase 2 · Pilot

1. Baseline numbers **before** changing: pages/week, % actioned, MTTD, alerts count.
2. Define SLOs with the team + business owner.
3. Add the new alerts in **shadow mode** (non-paging receiver) next to the old ones.
4. After 1–2 weeks compare: did the new alerts catch every real incident? Fewer false positives?
5. Switch paging to the new alerts; keep the old ones in shadow for one more cycle.
6. Inject failures (bad image tag, dependency down) to validate ([03 #12](../standard/03-definition-of-done.md)).
7. Write the playbook and a short internal post with the before/after.

## Phase 3 · Rollout in waves

| Wave | Services | Why this order |
|---|---|---|
| 1 | Remaining tier 1 | Biggest value, same pattern as the pilot |
| 2 | Tier 2 | Reuse templates, less hand-holding |
| 3 | Tier 3 / batch / internal | Mostly count and absence alerts |

Each wave: service team does the work (R), SRE reviews (C), same shadow → cutover → validate steps.

## Phase 4 · Decommission

| Rule | Why |
|---|---|
| Delete an old alert only after its replacement caught a real or injected failure | Never create a blind spot |
| Archive, don't destroy, dashboards for 30 days | Someone may still need one |
| Tool migration (e.g. two APMs): dual-ship telemetry via the OTel Collector during the overlap | Compare data before switching off |

## Phase 5 · Operate

| KPI | Target |
|---|---|
| Pages per on-call shift | ≤ 2 |
| % pages actioned | > 80–90% |
| Services meeting definition of done | rising to 100% of tier 1 |
| MTTD / time to restore | trending down |
| Change failure rate | trending down |

## Communication plan for the transition

| When | Audience | Message | Channel |
|---|---|---|---|
| Kick-off | All engineering + managers | Why we change, what changes for them, timeline | All-hands / email |
| Each phase start/end | Affected teams | What happens this phase, what they need to do | Team channel |
| Before cutover | On-call of the service | Which alerts change, new runbooks, how to report problems | Handover + channel |
| Monthly | Leadership | Progress, KPIs before/after, risks | Short report |
| After each wave | Everyone | Wins with numbers ("pages −60%") | Internal post |

## RACI for the transition

| Activity | SRE / Observability | Platform | Service teams | Eng. managers |
|---|---|---|---|---|
| Plan and standard | **A/R** | C | C | I |
| Foundations (collector, routing, templates) | A | **R** | I | I |
| Service migration | C | C | **A/R** | I |
| Prioritization and time allocation | C | C | C | **A/R** |
| Decommission | A | R | R | I |

## Sources

- Google SRE Workbook, ch. 2 *Implementing SLOs*, ch. 5 *Alerting on SLOs*
- Strangler fig pattern (Martin Fowler): replace incrementally, run in parallel
- OTel Collector docs: multiple exporters for dual shipping

> Official links and verification status: [REFERENCES.md](../REFERENCES.md)
