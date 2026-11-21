PROM_IMAGE    ?= prom/prometheus:v3.5.0
GRAFANA_IMAGE ?= grafana/grafana:11.6.0

.PHONY: all test check-rules check-dashboards check-collector dynatrace site
COLLECTOR_IMAGE ?= otel/opentelemetry-collector-contrib:0.162.0

all: dynatrace check-collector site test check-dashboards

## Lint and unit-test the Prometheus rules
test: check-rules
	docker run --rm -v "$(CURDIR)/rules":/rules -w /rules/tests --entrypoint promtool $(PROM_IMAGE) \
		test rules $(notdir $(wildcard rules/tests/*.test.yml))

check-rules:
	docker run --rm -v "$(CURDIR)/rules":/rules --entrypoint promtool $(PROM_IMAGE) \
		check rules $(addprefix /rules/,$(notdir $(wildcard rules/*.rules.yml)))

## Import every dashboard into a throwaway Grafana to check it is accepted
check-dashboards:
	./dashboards/check.sh $(GRAFANA_IMAGE)

## Validate the example collector configs
check-collector:
	./collector/check.sh $(COLLECTOR_IMAGE)

## Generate the Monaco configs from services-src/ and check them offline
dynatrace:
	python3 -I dynatrace/generate.py
	python3 -I dynatrace/check.py

## Generate observability-guide.html from the Markdown files
site:
	python3 -I site/build.py
