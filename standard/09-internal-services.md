# 09 · Internal services and shared platform services

> **In 30 seconds:** most services are called by other services, not by users. Measure them **from the caller's
> side** (client spans), give them **internal SLOs stricter than the user-facing SLO** that depends on them, and treat
> shared platform services (databases, caches, Kafka, auth, gateways) as products with an **owner, SLOs and a list of
> consumers**. Timeouts, retry budgets and circuit breakers stop one slow dependency from taking everything down.

## The dependency chain

<div data-widget="viz" data-chart="internal-deps"></div>

| Idea | Why |
|---|---|
| A user-facing request is a **chain**: if checkout calls 4 dependencies in series, each at 99.9%, the best checkout can do is ~99.6% | Dependencies need **better** targets than the service that relies on them |
| The caller sees failures the callee can't (network, DNS, TLS, timeouts, pool exhaustion) | Measure **client-side** too |
| One slow dependency fills the caller's threads and connection pools | Cascading failure: the slow part takes down the healthy parts |

## Measure from both sides

| Side | Signal (OTel) | Answers |
|---|---|---|
| **Server** (the internal service itself) | Server spans / `http.server.request.duration`, `rpc.server.duration` | Is my service healthy? |
| **Client** (every caller) | Client spans: `http.client.request.duration`, `db.client.operation.duration`, `messaging.*`, with `server.address` / `db.system.name` | What do my callers actually get, including network and timeouts? |
| **Service map** | Traces → Dynatrace service flow / Smartscape | Who depends on whom; blast radius |

```text
// DQL shape: what callers of payments-api experience (client spans), by calling service
fetch spans
| filter span.kind == "client" and server.address == "payments-api"
| makeTimeseries { calls = count(), failed = countIf(http.response.status_code >= 500 or isNotNull(error.type)) }, by:{ service.name }
| fieldsAdd failure_ratio = failed[] / calls[]
```

When server-side looks fine but client-side doesn't, the problem is **between** them: network, DNS, connection pools, TLS, a proxy, or timeouts set too short.

## Internal SLOs

| Rule ⚠️ | Example |
|---|---|
| Internal SLO **stricter** than every user-facing SLO that depends on it | checkout 99.9% → payments-api 99.95%, orders DB 99.99% |
| Measured where the **callers** are (client-side), plus server-side | The SLO reflects what consumers get |
| Latency SLO per **critical operation**, not one average | `POST /authorize` < 200 ms for 99% |
| Agreed with the main consumers, written down | [SLO document](../framework/slo-document-template.md) with a "consumers" section |
| No hard SLA chains between internal teams | SLOs + error budget policy, not contracts |

## Shared platform services

Databases, caches, message brokers, identity/auth, API gateways, the collector pipeline itself: one team runs them, many teams depend on them.

| Practice | Why |
|---|---|
| **Owner** (platform team) and on-call | Someone answers when it breaks |
| **Consumers listed** (from traces / service map) | You know who to inform and the blast radius |
| **SLOs** on availability, latency and saturation per platform service | Consumers can design for it |
| **Saturation dashboards**: connections vs max, replication lag, memory, disk, throughput ([13](13-capacity-and-saturation.md)) | Platform services fail by running out |
| **One template per platform service type** (Postgres, Redis, Kafka) | Same as microservices ([18](18-automation-and-scale.md)): archetype `platform-service` |
| Announce maintenance and changes to consumers | Change flow ([20](20-ownership-and-communication.md)) |

| Platform service | Key signals |
|---|---|
| PostgreSQL / SQL | Query latency (client-side `db.client.operation.duration`), connections vs max, replication lag, locks, disk |
| Redis / cache | Hit ratio, latency, evictions, memory vs max, connected clients |
| Kafka / broker | Under-replicated partitions, request latency, consumer lag per group ([06](06-workload-types.md#queues-and-async-processing)), disk |
| Auth / identity | Token issuance latency and errors, as seen by callers |
| API gateway | Upstream errors by backend, rate limiting, latency added by the gateway |

## Protect callers from slow dependencies

| Mechanism | What it does | Signal to watch |
|---|---|---|
| **Timeouts / deadlines** | Stop waiting; propagate one deadline through the whole request | Timeout errors by dependency (`error.type`) |
| **Retry budget** | Limit retries (e.g. up to 3 per request, ≤ 10% extra load per client) with exponential backoff and jitter | Retry rate; retries per original request |
| **Retry only at one layer** | The layer just above the failing one; avoid multiplying retries per layer | Calls at the bottom layer vs user requests |
| **Circuit breaker** | Fail fast while a dependency is broken | Breaker state per dependency |
| **Load shedding / priorities** | Under overload, drop low-priority work first | Rejected requests by priority |
| **Bulkheads** | Separate pools per dependency so one can't exhaust all | Pool usage per dependency |

These come from the Google SRE book's chapters on overload and cascading failures: retries multiply across layers, synchronized retries create thundering herds, and the fix is budgets, jitter and deadlines.

## Common mistakes

| ❌ | ✅ |
|---|---|
| Internal service SLO equal to (or looser than) the user-facing one | Stricter, because of the chain |
| Only server-side metrics | Client-side spans from every caller |
| Retries at every layer, no backoff | One layer, budget, exponential backoff + jitter |
| Shared database "owned by everyone" | One owner, SLOs, consumer list |
| Timeouts longer than the caller's own deadline | Propagate deadlines; inner timeouts shorter than outer |

## Sources

- [Google SRE Book: Addressing cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) · [Handling overload](https://sre.google/sre-book/handling-overload/) (retry budgets, deadlines, jitter, load shedding) ✅ 2026-11-20
- [Google SRE Workbook: Managing load](https://sre.google/workbook/managing-load/) ✅ 2026-11-20
- [OTel semconv: HTTP client](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) · [Database client](https://opentelemetry.io/docs/specs/semconv/db/database-metrics/) 📚
- [Dynatrace: Event analysis and correlation (topology)](https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/root-cause-analysis/concepts/events) ✅
- Internal SLO margins, platform signals per service: rules of thumb ⚠️
