# 22 · Resilience: backups, disaster recovery, chaos engineering, progressive delivery

> **In 30 seconds:** a backup you have never restored is a hope, not a backup. Give every important service an
> **RPO** (how much data you may lose) and **RTO** (how long recovery may take), **test restores and failover** against
> them, run **game days** to prove alerts, runbooks and failover work, and limit the blast radius of every change with
> **canaries, feature flags and automatic rollback**.

## RPO and RTO

| Term | Meaning | Example |
|---|---|---|
| **RPO** (recovery point objective) | Maximum acceptable data loss, measured in time | 5 min: replicas or log shipping every few minutes |
| **RTO** (recovery time objective) | Maximum acceptable time to restore business operations | 1 h: restore + switch traffic within an hour |

| Tier ⚠️ | RPO | RTO | Typical setup |
|---|---|---|---|
| 1 | ≤ 5 min | ≤ 1 h | Replication across zones/regions, automated failover, tested runbook |
| 2 | ≤ 1 h | ≤ 4 h | Frequent backups, scripted restore |
| 3 | ≤ 24 h | ≤ 1 day | Daily backups, documented restore |

Azure Well-Architected guidance: measure **actual restore times against RPO and RTO**, test **whole critical flows** (a component can restore in time while the flow misses its RTO because dependencies restore after it), test **failback** too, and run **at least one production DR drill per year**.

## What to measure

| Signal | Why | Source |
|---|---|---|
| Last successful backup per data store (age) | RPO at risk when it's older than the RPO | Backup job metrics / logs → custom alert ("no success in 2 intervals", [06](06-workload-types.md#batch-and-cron-jobs)) |
| Backup size trend | A sudden drop often means a broken backup | Backup job metrics |
| Replication lag | Real RPO for replicated stores | DB / broker metrics ([09](09-internal-services.md)) |
| **Restore test result and duration** | The only proof the backup works; real RTO | Restore test runs (scheduled job + SDLC/custom event) |
| Failover drill duration | Real RTO for the full flow | Game day record |

## Chaos engineering and game days

Principles of Chaos Engineering: define **steady state** as a measurable output that shows normal behavior, hypothesize it holds while you inject a real-world failure, run it (eventually in production), and **minimize the blast radius**.

| Step | Example |
|---|---|
| 1. Steady state | checkout SLI ≥ 99.9%, p95 < 300 ms, orders queue age < 60 s |
| 2. Hypothesis | "If one orders-db replica dies, checkout stays within SLO and an alert fires in < 5 min" |
| 3. Blast radius | Staging first; then production, one zone, business hours, a kill switch ready |
| 4. Inject | Kill pods, add latency, drop a dependency, fill a disk, cut the collector (Chaos Mesh, Azure Chaos Studio, scripts) |
| 5. Observe | SLO, alerts, problems, traces, runbook usefulness |
| 6. Abort rules | Stop immediately if the SLO burns fast or customers complain |
| 7. Learn | Fix gaps, update runbooks and alerts, schedule the next one |

| Game day calendar (quarterly ⚠️) | Proves |
|---|---|
| Kill a tier-1 pod / node / zone | Redundancy, autoscaling, alerting |
| Dependency latency or outage | Timeouts, retries, circuit breakers ([09](09-internal-services.md)) |
| Restore a database from backup into a new instance | RPO/RTO, restore runbook |
| Cut the telemetry pipeline | Collector self-monitoring alerts ([16](16-collector-templates.md#self-monitoring)) |
| Bad release | Release regression alert, rollback ([12](12-releases-and-dora.md)) |

The aks-observability lab already ran these patterns: pod kill, DB latency, RabbitMQ outage, OOM, pipeline cut-offs, log-loss during a backend outage. Its results are in [17](17-dynatrace-integration.md#what-the-lab-measured-aks-observability-2026-10). Template: [framework/game-day-template.md](../framework/game-day-template.md).

## Progressive delivery: limit the blast radius of changes

| Technique | How | Signal that decides |
|---|---|---|
| **Canary** | Send a small share of traffic to the new version, compare with the old | Error ratio / latency **by `service.version`** ([12](12-releases-and-dora.md)) |
| **Automatic analysis and rollback** | Argo Rollouts / Flagger analysis, or Dynatrace Site Reliability Guardian after the deployment event | SLO and golden-signal objectives |
| **Feature flags** | Ship code dark, turn on gradually, turn off instantly | Error ratio per flag variant; flag change events on dashboards |
| **Blue/green** | Two environments, switch traffic at once, switch back fast | Same as canary, at the switch |
| **Error budget gate** | No risky releases when the budget is spent ([10](10-slos-and-error-budgets.md)) | SLO budget |

Feature flags: prefer a vendor-neutral API (OpenFeature, a CNCF project) so code doesn't lock into one flag vendor; emit flag evaluations or changes as events so "errors started when flag X turned on" is visible next to deployments.

## Common mistakes

| ❌ | ✅ |
|---|---|
| Backups monitored, restores never tested | Scheduled restore tests with measured duration |
| RTO for a database, not for the business flow | Test the whole flow, including DNS and clients |
| Chaos in production on day one | Staging first, small blast radius, abort rules |
| Canary judged by eye | Automated analysis by version against SLO objectives |
| Feature flags that live forever | Remove flags after rollout; track flag age |

## Sources

- [Azure Well-Architected: Disaster recovery](https://learn.microsoft.com/en-us/azure/well-architected/reliability/disaster-recovery) · [Reliability testing](https://learn.microsoft.com/en-us/azure/well-architected/reliability/reliability-test) · [Reliability targets (RTO/RPO)](https://learn.microsoft.com/en-us/azure/well-architected/reliability/metrics) ✅ 2026-11-20
- [Principles of Chaos Engineering](https://principlesofchaos.org/) ✅ 2026-11-20
- [Google SRE Book: Testing for reliability](https://sre.google/sre-book/testing-reliability/) · [Workbook: Canarying releases](https://sre.google/workbook/canarying-releases/) ✅ 2026-11-20
- [OpenFeature](https://openfeature.dev/) ✅ 2026-11-20 · [Argo Rollouts analysis](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/) ✅ · [Dynatrace: Release validation (Site Reliability Guardian)](https://docs.dynatrace.com/docs/deliver/quality-gates) ✅
- RPO/RTO per tier, game day cadence: rules of thumb ⚠️
