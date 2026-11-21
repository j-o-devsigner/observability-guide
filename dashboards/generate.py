"""Generate dashboards/service-red.json: the service dashboard layout from standard/14.

Run: python3 -I dashboards/generate.py
Rows go from symptom (top) to cause (bottom): SLO → RED → per client → per version → saturation.
"""
import json
from pathlib import Path

DS = {"type": "prometheus", "uid": "${datasource}"}
M = "http_server_request_duration_seconds"
SEL = 'service_name=~"$service"'
ERR = 'http_response_status_code=~"5.."'

_id = 0
def nid():
    global _id
    _id += 1
    return _id

def target(expr, legend="", ref="A", fmt=None, instant=False):
    t = {"datasource": DS, "expr": expr, "legendFormat": legend, "refId": ref}
    if fmt:
        t["format"] = fmt
    if instant:
        t["instant"] = True
        t["range"] = False
    return t

def row(title, y):
    return {"type": "row", "title": title, "id": nid(), "collapsed": False,
            "gridPos": {"h": 1, "w": 24, "x": 0, "y": y}, "panels": []}

def stat(title, expr, x, y, w=6, unit="percentunit", decimals=3, thresholds=None, desc=""):
    return {"type": "stat", "title": title, "id": nid(), "datasource": DS, "description": desc,
            "gridPos": {"h": 5, "w": w, "x": x, "y": y},
            "targets": [target(expr, instant=True)],
            "fieldConfig": {"defaults": {"unit": unit, "decimals": decimals,
                "thresholds": {"mode": "absolute", "steps": thresholds or [
                    {"color": "red", "value": None}, {"color": "green", "value": 0}]}},
                "overrides": []},
            "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
                        "colorMode": "value", "graphMode": "none", "textMode": "auto"}}

def ts(title, targets, x, y, w=12, h=8, unit="short", overrides=None, stack=False, desc=""):
    custom = {"drawStyle": "line", "lineWidth": 2, "fillOpacity": 10, "showPoints": "never"}
    if stack:
        custom["stacking"] = {"mode": "percent", "group": "A"}
        custom["fillOpacity"] = 60
    return {"type": "timeseries", "title": title, "id": nid(), "datasource": DS, "description": desc,
            "gridPos": {"h": h, "w": w, "x": x, "y": y}, "targets": targets,
            "fieldConfig": {"defaults": {"unit": unit, "custom": custom}, "overrides": overrides or []},
            "options": {"legend": {"displayMode": "table", "placement": "bottom", "calcs": ["lastNotNull", "max"]},
                        "tooltip": {"mode": "multi", "sort": "desc"}}}

panels = []
y = 0

# Row 1: SLO status
panels.append(row("SLO status: are we OK?", y)); y += 1
avail = (f'1 - (sum(increase({M}_count{{{SEL},{ERR}}}[28d])) '
         f'/ sum(increase({M}_count{{{SEL}}}[28d])))')
panels += [
    stat("Availability (28d)", avail, 0, y, thresholds=[
        {"color": "red", "value": None}, {"color": "green", "value": 0.999}],
        desc="Share of non-5xx requests over 28 days. Green threshold = 99.9%: change it if your SLO differs (thresholds cannot read variables)."),
    stat("Error budget left (28d)", f"1 - ((1 - ({avail})) / (1 - $slo))", 6, y, decimals=1, thresholds=[
        {"color": "red", "value": None}, {"color": "orange", "value": 0.25}, {"color": "green", "value": 0.5}],
        desc="1 = untouched, 0 = spent. Below 0 means the SLO is missed."),
    stat("Burn rate (1h)", f'(sum(rate({M}_count{{{SEL},{ERR}}}[1h])) / sum(rate({M}_count{{{SEL}}}[1h]))) / (1 - $slo)',
         12, y, unit="none", decimals=1, thresholds=[
        {"color": "green", "value": None}, {"color": "orange", "value": 6}, {"color": "red", "value": 14.4}],
        desc="1 = spending exactly the budget. 14.4 over 1h pages (SRE Workbook)."),
    stat("Requests (5m)", f'sum(rate({M}_count{{{SEL}}}[5m]))', 18, y, unit="reqps", decimals=1, thresholds=[
        {"color": "text", "value": None}], desc="Volume next to the percentages: 50% errors means nothing without it."),
]
y += 5

# Row 2: RED
panels.append(row("RED overview", y)); y += 1
panels.append(ts("Requests", [
    target(f'sum(rate({M}_count{{{SEL}}}[$__rate_interval]))', "req/s", "A"),
], 0, y, h=6, unit="reqps", desc="Volume. Stacked above error % on the same time axis: one y-axis per chart."))
panels.append(ts("Error ratio", [
    target(f'sum(rate({M}_count{{{SEL},{ERR}}}[$__rate_interval])) / sum(rate({M}_count{{{SEL}}}[$__rate_interval]))', "error %", "A"),
], 0, y + 6, h=6, unit="percentunit", overrides=[], desc="If errors rise with traffic, think capacity. If errors rise alone, think change or dependency."))
panels.append({"type": "heatmap", "title": "Latency distribution (+ p99 below)", "id": nid(), "datasource": DS,
    "gridPos": {"h": 12, "w": 12, "x": 12, "y": y},
    "targets": [target(f'sum by (le) (rate({M}_bucket{{{SEL}}}[$__rate_interval]))', "{{le}}", fmt="heatmap")],
    "options": {"calculate": False, "yAxis": {"unit": "s"}, "cellGap": 1,
                "color": {"mode": "scheme", "scheme": "Oranges", "steps": 64}},
    "description": "Averages hide tail latency. Look for a second band appearing."})
y += 12
panels.append(ts("Latency p50 / p95 / p99", [
    target(f'histogram_quantile({q}, sum by (le) (rate({M}_bucket{{{SEL}}}[$__rate_interval])))', f"p{int(q*100)}", r)
    for q, r in [(0.5, "A"), (0.95, "B"), (0.99, "C")]
], 0, y, w=24, h=7, unit="s"))
y += 7

# Row 3: per client
panels.append(row("Per client: who is affected?", y)); y += 1
by = "client_id"
panels.append({"type": "table", "title": "Clients", "id": nid(), "datasource": DS,
    "gridPos": {"h": 8, "w": 24, "x": 0, "y": y},
    "targets": [
        target(f'sum by ({by}) (rate({M}_count{{{SEL}}}[5m]))', "", "A", "table", True),
        target(f'sum by ({by}) (increase({M}_count{{{SEL},{ERR}}}[1h]))', "", "B", "table", True),
        target(f'sum by ({by}) (rate({M}_count{{{SEL},{ERR}}}[5m])) / sum by ({by}) (rate({M}_count{{{SEL}}}[5m]))', "", "C", "table", True),
        target(f'histogram_quantile(0.95, sum by ({by}, le) (rate({M}_bucket{{{SEL}}}[5m])))', "", "D", "table", True),
    ],
    "transformations": [
        {"id": "merge", "options": {}},
        {"id": "organize", "options": {"excludeByName": {"Time": True},
            "renameByName": {"client_id": "Client", "Value #A": "req/s", "Value #B": "errors (1h)",
                             "Value #C": "error %", "Value #D": "p95"}}},
        {"id": "sortBy", "options": {"sort": [{"field": "error %", "desc": True}]}},
    ],
    "fieldConfig": {"defaults": {}, "overrides": [
        {"matcher": {"id": "byName", "options": "error %"}, "properties": [
            {"id": "unit", "value": "percentunit"}, {"id": "custom.cellOptions", "value": {"type": "color-background"}},
            {"id": "thresholds", "value": {"mode": "absolute", "steps": [
                {"color": "green", "value": None}, {"color": "orange", "value": 0.01}, {"color": "red", "value": 0.05}]}}]},
        {"matcher": {"id": "byName", "options": "p95"}, "properties": [{"id": "unit", "value": "s"}]},
        {"matcher": {"id": "byName", "options": "req/s"}, "properties": [{"id": "unit", "value": "reqps"}]},
    ]},
    "description": "A table, not a pie chart: the small client that is 100% broken must be visible."})
y += 8

# Row 4: per version
panels.append(row("Per version: did a release cause it?", y)); y += 1
panels.append(ts("Error % by version", [
    target(f'sum by (service_version) (rate({M}_count{{{SEL},{ERR}}}[$__rate_interval])) '
           f'/ sum by (service_version) (rate({M}_count{{{SEL}}}[$__rate_interval]))', "{{service_version}}")
], 0, y, unit="percentunit", desc="During a rolling update both versions take traffic: compare the lines."))
panels.append(ts("Traffic share by version", [
    target(f'sum by (service_version) (rate({M}_count{{{SEL}}}[$__rate_interval]))', "{{service_version}}")
], 12, y, unit="percentunit", stack=True, desc="Is the rollout progressing, stuck, or rolled back?"))
y += 8

# Row 5: saturation (USE)
panels.append(row("Saturation (USE): why?", y)); y += 1
pod = 'namespace=~"$namespace", pod=~"$service.*"'
panels += [
    ts("CPU throttling", [target(
        f'sum by (pod) (rate(container_cpu_cfs_throttled_periods_total{{{pod}}}[$__rate_interval])) '
        f'/ sum by (pod) (rate(container_cpu_cfs_periods_total{{{pod}}}[$__rate_interval]))', "{{pod}}")],
       0, y, w=8, unit="percentunit"),
    ts("Memory vs limit", [target(
        f'sum by (pod) (container_memory_working_set_bytes{{{pod}, container!=""}}) '
        f'/ sum by (pod) (kube_pod_container_resource_limits{{{pod}, resource="memory"}})', "{{pod}}")],
       8, y, w=8, unit="percentunit"),
    ts("Active requests", [target(f'sum(http_server_active_requests{{{SEL}}})', "active")],
       16, y, w=8, unit="short"),
]
y += 8

dashboard = {
    "uid": "service-red",
    "title": "Service RED (Observability Guide)",
    "description": "Symptom to cause: SLO, RED, per client, per version, saturation. Layout from standard/14.",
    "tags": ["observability-guide", "red", "slo"],
    "timezone": "browser",
    "schemaVersion": 39,
    "version": 1,
    "refresh": "1m",
    "time": {"from": "now-6h", "to": "now"},
    "editable": True,
    "graphTooltip": 1,
    "links": [],
    "annotations": {"list": [
        {"builtIn": 1, "datasource": {"type": "grafana", "uid": "-- Grafana --"}, "enable": True, "hide": True,
         "iconColor": "rgba(0, 211, 255, 1)", "name": "Annotations & Alerts", "type": "dashboard"},
        {"name": "Deploys (pipeline / Argo CD)", "enable": True, "iconColor": "blue",
         "datasource": {"type": "grafana", "uid": "-- Grafana --"},
         "target": {"type": "tags", "tags": ["deploy"], "matchAny": False, "limit": 100}},
        {"name": "Rollouts (kube-state-metrics)", "enable": True, "iconColor": "purple", "datasource": DS,
         "expr": 'changes(kube_deployment_status_observed_generation{namespace=~"$namespace", deployment=~"$service"}[2m]) > 0',
         "step": "1m", "titleFormat": "rollout {{deployment}}", "useValueForTime": False},
    ]},
    "templating": {"list": [
        {"name": "datasource", "label": "Data source", "type": "datasource", "query": "prometheus",
         "current": {}, "hide": 0, "refresh": 1},
        {"name": "namespace", "label": "Namespace", "type": "query", "datasource": DS,
         "query": {"query": "label_values(kube_pod_info, namespace)", "refId": "ns"},
         "definition": "label_values(kube_pod_info, namespace)", "refresh": 2, "includeAll": True,
         "multi": False, "current": {}, "allValue": ".*"},
        {"name": "service", "label": "Service", "type": "query", "datasource": DS,
         "query": {"query": f"label_values({M}_count, service_name)", "refId": "svc"},
         "definition": f"label_values({M}_count, service_name)", "refresh": 2, "includeAll": False,
         "multi": False, "current": {}},
        {"name": "slo", "label": "SLO target", "type": "custom", "query": "0.999,0.995,0.99,0.9995",
         "current": {"selected": True, "text": "0.999", "value": "0.999"},
         "options": [], "hide": 0},
    ]},
    "panels": panels,
}

out = Path(__file__).with_name("service-red.json")
out.write_text(json.dumps(dashboard, indent=2) + "\n")
print(f"wrote {out} with {len(panels)} panels")
