# 01 · Layers and methods

> Every observability question lives in a **layer**. Find the layer first, then pick the method.
> **Alert on the top layers** (symptoms). **Diagnose with the lower layers** (causes).
> **Delivery** runs alongside all of them: changes are the most common cause of incidents.

## The five layers

| Layer | Question it answers | Method | Example signals | Alert? |
|---|---|---|---|---|
| **Business** | Is the business doing well? | Custom KPIs | orders/min, revenue, avg price vs goal, conversion | Yes, to the business owner (ticket/chat) |
| **User experience** | Can users actually use it? | Synthetic checks + RUM | external uptime, journey success, Apdex, Core Web Vitals | Yes (page if a key journey fails) |
| **Service / endpoint** | Is my endpoint healthy? | **RED** / **Golden Signals** | req/s, error %, p95/p99 latency, saturation | Yes, SLO burn rate (page) |
| **Resources** | Is something underneath saturated? | **USE** | CPU throttling, memory vs limit, pool/queue depth, disk | Rarely (only on predicted exhaustion) |
| **Delivery** (cross-cutting) | Did a change cause this? How fast and safe do we ship? | **DORA** + release markers | deploys, `service.version`, lead time, change failure rate, time to restore | Yes, regression after a deploy (see [12](12-releases-and-dora.md)) |

<div data-widget="viz" data-chart="layers"></div>

## Methods

| Method | Signals | Apply to | Source |
|---|---|---|---|
| **RED** | Rate, Errors, Duration | Request-driven things: endpoints, services, gRPC methods | Tom Wilkie, *The RED Method* |
| **USE** | Utilization, Saturation, Errors | Resources: nodes, pods, connection/thread pools, queues, disks | Brendan Gregg, *The USE Method* |
| **Golden Signals** | Latency, Traffic, Errors, Saturation | Per-service view (RED + Saturation) | Google SRE Book, ch. 6 |
| **DORA** | Deployment frequency, Lead time for changes, Change failure rate, Failed deployment recovery time | The delivery process | DORA / *Accelerate* (Forsgren, Humble, Kim) |

## How to use this file to locate a problem

| The symptom sounds like… | Start at layer | Then check |
|---|---|---|
| "Sales dropped", "price below goal" | Business | User experience → Service |
| "Users can't log in / checkout" | User experience | Service (which route?) → Resources |
| "Errors / latency went up" | Service | **Delivery** (was there a deploy?) → Resources |
| "Pods restarting", "node pressure" | Resources | Service (are users affected? if not, it's not urgent) |
| "It broke after the release" | Delivery | Service by `service.version` |
| "Client X complains, dashboard looks fine" | Service, **per client** | See [04 · multi-client](04-endpoint-coverage.md#multiple-clients-on-one-service) |

> Official links and verification status: [REFERENCES.md](../REFERENCES.md)
