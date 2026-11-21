# Rules: tested alert and recording rules

> **Open-source variant (Prometheus).** Copy-paste-safe versions of the patterns in the standard; with Dynatrace the same patterns become SLOs and custom alerts ([10](../standard/10-slos-and-error-budgets.md), [11](../standard/11-alerting.md)). Every rule here has a unit test that runs with
> [`promtool test rules`](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/).

| File | Patterns | Standard |
|---|---|---|
| [`checkout-slo.rules.yml`](checkout-slo.rules.yml) | SLI recording rules (5m → 3d), multi-window multi-burn-rate page + ticket, low-traffic guard | [11 §4](../standard/11-alerting.md), [10](../standard/10-slos-and-error-budgets.md) |
| [`patterns.rules.yml`](patterns.rules.yml) | Per-client ratio + min count, DLQ count, absence, release regression by version, burn after deploy | [11](../standard/11-alerting.md), [12](../standard/12-releases-and-dora.md) |
| [`tests/`](tests/) | Unit tests with synthetic series | – |

## Run the tests

```bash
make test        # from the repo root (uses the prom/prometheus:v3.5.0 image, no local install needed)
```

## What the tests prove

| Test | Scenario | Expected |
|---|---|---|
| fast burn pages | 100 req/s, 2% errors | Page fires (2% > 14.4 × 0.1%) |
| slow burn does not page | 0.5% errors | No page (ticket territory) |
| page resolves once both short windows are clean | Errors stop at minute 80 | Still firing at 70m; resolved at 115m. **The 6h/30m pair keeps paging for up to 30 min after the fix** |
| per-client ratio with minimum-count guard | Big client fine, small client 100% failing, tiny client 1 error out of 3 | Only `small` fires; `tiny` stays silent thanks to the guard |
| count alert fires on a single DLQ message | One message | Fires |
| absence alert when orders stop | Orders flat for 30 min | Silent at 15m, fires at 45m |
| release regression between two versions | 1.41.3 at 0.2%, 1.42.0 at 4% | Fires with `suspect: deploy` |
| single version is not a regression | Only 1.42.0, 4% errors | Silent (the SLO alert covers it) |
| burn after deploy | Generation 7 → 8 at minute 60, then errors | Silent before, fires at 75m |

## Adapting to your metrics

- Metric and label names follow OTel semantic conventions translated by Prometheus (`http_server_request_duration_seconds_count`, `http_response_status_code`, `service_name`). If your instrumentation differs, change the selectors **and** the test series.
- `service_name` / `service_version` as labels require promoting resource attributes ([12](../standard/12-releases-and-dora.md#1-version-on-every-signal)).
- For many services, generate SLO rules with [Sloth](https://sloth.dev/) or [Pyrra](https://github.com/pyrra-dev/pyrra) instead of copying `checkout-slo.rules.yml`.
- Thresholds (5%, 20 errors, 0.5 req/s, 1%) are rules of thumb ⚠️.
