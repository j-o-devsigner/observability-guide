# 05 · Logging standard

> **In 30 seconds:** logs **explain** what metrics detect and traces locate. Every log line is **structured** (one
> JSON object per line), follows the **OpenTelemetry log data model** (timestamp, severity, body, attributes, resource,
> trace context), uses **standard field names**, carries **`trace_id` / `span_id`**, and never contains secrets or
> unmasked personal data. Mask in **layers** (don't log it → logger → collector gateway → Dynatrace OpenPipeline),
> collect **once** per stream, and give each class of logs the **retention** it needs.

## The log record (OpenTelemetry data model)

| Field | Meaning | Who sets it |
|---|---|---|
| `Timestamp` | When the event happened (UTC, ns precision) | Logger |
| `ObservedTimestamp` | When the collector saw it | Collector |
| `SeverityText` / `SeverityNumber` | Level as text and as a number (1–24) | Logger / agent parsing |
| `Body` | The human-readable message | Logger |
| `Attributes` | Structured fields of **this event** (route, status, client, error) | Logger / code |
| `Resource` | **Who** sent it: `service.name`, `service.version`, `k8s.*`, env | OTel SDK / collector (`k8sattributes`, gateway), **not** the app code |
| `TraceId` / `SpanId` | Link to the trace and span | Logger with OTel context / agent parsing |
| `EventName` | Stable name of the event type (e.g. `order.payment_failed`) | Code (for events you will search or alert on) |

## One line, before and after

```text
❌ 2026-11-20 14:05:12 ERROR Payment failed for john@example.com card 4111111111111111 order 98123 after 3 retries
```

```json
{
  "timestamp": "2026-11-20T14:05:12.418Z",
  "level": "ERROR",
  "message": "Payment authorization failed",
  "event.name": "checkout.payment_failed",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "http.route": "/api/checkout",
  "client.id": "fabrikam",
  "payment.provider": "acme-pay",
  "checkout.order_id": "98123",
  "checkout.retry_count": 3,
  "error.type": "PROVIDER_TIMEOUT",
  "exception.type": "System.TimeoutException",
  "exception.message": "Provider did not answer within 2000 ms"
}
```

The second line is searchable (`event.name`, `error.type`), joinable (`trace_id`), groupable (`client.id`), and contains no email or card number. Service, version, pod and cluster are **not** in it: the collectors add them as resource attributes.

## Required and recommended fields

| Field | Level | Rule |
|---|---|---|
| `timestamp` | Required | ISO 8601, **UTC**, millisecond precision or better |
| `level` (→ severity) | Required | One of the levels below |
| `message` (→ body) | Required | Short, constant wording; variable data goes in attributes |
| `trace_id`, `span_id` | Required when in a request | Hex, from the OTel context (W3C) |
| `event.name` | Recommended for business, security and error events | `<domain>.<event>` lowercase, e.g. `checkout.payment_failed` |
| `error.type` | Required on errors | Stable, low-cardinality class (`PROVIDER_TIMEOUT`, `ValidationError`) |
| `exception.type`, `exception.message`, `exception.stacktrace` | On exceptions | OTel semconv; the stack trace belongs to ERROR/FATAL, not WARN |
| `http.route`, `http.response.status_code`, `client.id` | When relevant | Same names as metrics and spans ([04](04-endpoint-coverage.md)) |
| `service.*`, `k8s.*`, `deployment.environment.name` | Never in app code | Added once as resource attributes by the SDK / collectors ([16](16-collector-templates.md)) |

## Naming (nomenclature)

| Rule | Example | Source |
|---|---|---|
| Use **OTel semantic convention names** when one exists | `http.route`, `error.type`, `exception.message`, `db.system.name`, `messaging.destination.name` | OTel semconv |
| Lowercase, dot-separated namespaces, `snake_case` inside a part | `checkout.retry_count` | OTel naming rules |
| Custom fields: prefix with the **application or domain name**, never an existing semconv namespace and never `otel.` | `checkout.order_id`, not `http.order_id` | OTel naming rules |
| Same concept, same name, in logs, spans and metrics | `client.id` everywhere | This standard |
| Constant `message`, variable data in attributes | `"Payment authorization failed"` + `error.type` | Searchability |
| No units or types in names; put units in the value or the name's meaning | `duration_ms` only if the logger can't carry units; prefer `duration` in seconds | OTel naming (metrics) ⚠️ |

## Severity levels

| Level | SeverityNumber | Use for | Production |
|---|---|---|---|
| TRACE | 1–4 | Step-by-step internals | Off |
| DEBUG | 5–8 | Diagnostic detail for developers | Off, or sampled / time-boxed |
| INFO | 9–12 | Lifecycle and business events (`order.created`, startup, config loaded) | On |
| WARN | 13–16 | Something unexpected, **handled** (retry succeeded, fallback used) | On |
| ERROR | 17–20 | The operation **failed**: a request, a message, a job | On |
| FATAL | 21–24 | The process cannot continue | On |

OTel: ERROR (17) and above mean an erroneous situation; unhandled exceptions that don't stop the app are ERROR, ones that shut it down are FATAL. A log level is **not an alert**: alerts come from SLOs and counts ([11](11-alerting.md)).

## What to log, and what never to log

| Log | Don't log |
|---|---|
| Errors with context (what failed, for whom, why) | Every successful request (metrics and spans cover it) |
| Business events (order placed, payment failed, refund) | Secrets: passwords, tokens, API keys, connection strings, JWTs |
| State changes (config loaded, feature flag flipped, circuit opened) | Full card numbers (PCI), CVV, bank accounts |
| Security events (login failed, permission denied) → also to the audit trail | Personal data in clear text (email, phone, name, address, national IDs) |
| Retries and fallbacks (WARN) | Whole request/response bodies, file contents, large payloads |
| Startup / shutdown with version | Stack traces at WARN or INFO; the same error once per loop iteration |

## Masking in layers

<div data-widget="viz" data-chart="log-masking"></div>

| Layer | How | Catches |
|---|---|---|
| **1. Don't log it** | Code review, structured logging (log fields, not objects), allow-lists of fields | Most leaks: the cheapest fix |
| **2. Logger redaction** | Redaction / destructuring policies in the logging library (e.g. classify fields as personal and redact or hash them) | Known sensitive fields in your own code |
| **3. Collector gateway** | `transform/redact`: credentials in key=value pairs, Bearer/Basic, JWTs, emails, card numbers, URL query values ([collector/gateway.yaml](../collector/)) | Library and third-party logs you don't control; one rule set for all services |
| **4. Dynatrace OpenPipeline** | Masking processor in the Processing stage, before storage in Grail; works for all ingest channels | A central safety net for anything that slipped through |
| **5. Storage** | Bucket per log class with retention and access rights; audit logs separate | Limits exposure of what remains |

Dynatrace recommends combining masking **at capture** and **at ingest** (two layers). Lab evidence: before gateway masking, auto-instrumentation sent a database username in **40,892** spans to Dynatrace; the gateway rules fixed it for every backend at once, proven by an end-to-end redaction test.

**Pseudonymize instead of deleting** when you need to correlate: a salted hash of a user ID lets you count "affected users" and follow one session without storing who it is ⚠️ (check your privacy/legal rules).

## Collection

| Rule | Why |
|---|---|
| Containers write to **stdout/stderr**; the OTel agent reads `/var/log/pods` with `filelog` and parses JSON ([16](16-collector-templates.md)) | No log files or sidecars per app |
| Or the app sends OTLP logs through an OTel log bridge/appender | Trace context attached automatically |
| **One path per stream** (file collection *or* OTLP *or* OneAgent log module) | Two paths = duplicates and double cost |
| Multiline stack traces: emit them **inside** the JSON (`exception.stacktrace`), not as separate lines | Line-based collectors split them otherwise |
| Persistent queue + checkpoints on the agent | Lab: 0 log lines lost during a 10-min backend outage (83% lost with defaults) |
| Don't log the collector's own logs through the same pipeline | Feedback loops |

## Volume, retention and cost

| Log class | Retention ⚠️ | Dynatrace |
|---|---|---|
| Application logs (debugging) | 14–35 days | Default log bucket (35 days) or a custom bucket |
| Audit / security logs | Per compliance (often 1+ year) | Custom bucket with long retention and restricted access |
| Debug / verbose (when enabled) | 3–7 days | Short-retention bucket |
| Health checks, probe noise | Drop at the gateway | – |

Grail stores logs in **buckets** with their own retention (custom buckets from 1 day to ~10 years; default log bucket 35 days), assigned by rules or OpenPipeline. Logs are billed per GiB ingested, retained and queried ([17](17-dynatrace-integration.md#cost-what-drives-the-bill-dps)). Biggest levers: don't log successes, keep DEBUG off, drop noise at the gateway, route each class to the right bucket.

## Correlation

| Link | How |
|---|---|
| Log → trace | `trace_id` / `span_id` on the record. With OTLP ingest, Dynatrace maps them to `trace_id` / `span_id` fields; the UI links logs and traces |
| Trace → logs | Logs view filtered by the trace ID |
| Logs ↔ service, version, team | Same resource attributes as spans and metrics ([04](04-endpoint-coverage.md)) |
| Mixed OneAgent + OTel | IDs from the OTel API differ from OneAgent's: keep one tracing agent per service ([17](17-dynatrace-integration.md)) |

## Log-based alerts

Alerts need numbers, so turn the log query into a time series first.

```text
// Dynatrace (DQL shape): provider timeouts in payment logs, per provider
fetch logs
| filter service.name == "payments" and error.type == "PROVIDER_TIMEOUT"
| makeTimeseries timeouts = count(), by:{ payment.provider }, interval:5m
// Custom alert: timeouts > 20 for 5 min → ticket to payments
```

| Practice | Why |
|---|---|
| Alert on `event.name` / `error.type`, not on free text | Wording changes; fields don't |
| If a log alert fires often and matters, emit a **metric** instead | Cheaper and faster |
| Absence: alert when a service **stops logging** (count == 0 for 10 min) | A silent service is often a dead one |

<details>
<summary>Open-source variant (Loki ruler)</summary>

```yaml
groups:
  - name: payments-logs
    rules:
      - alert: PaymentProviderTimeouts
        expr: sum by (provider) (count_over_time({service_name="payments"} | json | error_type="PROVIDER_TIMEOUT" [5m])) > 20
        for: 5m
        labels: { severity: ticket, team: payments }
```

</details>

## Checklist (per service)

| # | Check |
|---|---|
| 1 | JSON, one object per line, to stdout |
| 2 | Required fields present: timestamp (UTC), level, message, `trace_id`/`span_id` in requests, `error.type` on errors |
| 3 | Field names follow OTel semconv; custom fields prefixed with the app/domain |
| 4 | DEBUG off in production; no logging of successful requests |
| 5 | No secrets or clear-text personal data (redaction test passes) |
| 6 | One collection path; no duplicates in Dynatrace |
| 7 | Correct bucket / retention for each log class |
| 8 | Key events (`event.name`) defined for business and security flows |

## Sources

- [OTel: Logs data model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) (fields, SeverityNumber ranges, ERROR ≥ 17) · [Logs concepts](https://opentelemetry.io/docs/concepts/signals/logs/) ✅ 2026-11-20
- [OTel semconv: Exceptions in logs](https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-logs/) · [Naming](https://opentelemetry.io/docs/specs/semconv/general/naming/) (lowercase, namespaces, custom prefixes, `otel.` reserved) ✅ 2026-11-20
- [Dynatrace: Mask sensitive data in logs](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-use-cases/methods-of-masking-sensitive-data) · [Log processing with OpenPipeline](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-processing/lma-openpipeline) · [Mask with the OTel Collector](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/collector-use-cases/redact) ✅ 2026-11-20
- [Dynatrace: Log storage and retention (buckets)](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-bucket-assignment) · [Optimize log retention](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-use-cases/optimize-log-retention) ✅ 2026-11-20
- [Dynatrace: Connect log data to traces](https://docs.dynatrace.com/docs/analyze-explore-automate/logs/lma-log-enrichment) · [Ingest OTLP logs](https://docs.dynatrace.com/docs/ingest-from/opentelemetry/otlp-api/ingest-logs) ✅ 2026-11-20
- Lab: redaction test and log-loss results (`~/projects/aks-observability/results/`) ✅ measured
- Retention per class, pseudonymization advice: rules of thumb ⚠️ (check your compliance requirements)
