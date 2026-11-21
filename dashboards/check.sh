#!/usr/bin/env bash
# Import every dashboards/*.json into a throwaway Grafana and fail if any is rejected.
set -euo pipefail
IMAGE="${1:-grafana/grafana:11.6.0}"
DIR="$(cd "$(dirname "$0")" && pwd)"

cid=$(docker run -d --rm -p 127.0.0.1::3000 -e GF_SECURITY_ADMIN_PASSWORD=check "$IMAGE")
trap 'docker stop "$cid" >/dev/null' EXIT
port=$(docker port "$cid" 3000/tcp | head -1 | sed 's/.*://')
url="http://127.0.0.1:${port}"

for _ in $(seq 1 60); do
  curl -sf "$url/api/health" >/dev/null && break
  sleep 1
done

# A Prometheus data source (no server needed) so variables and queries resolve
curl -sf -u admin:check -H 'Content-Type: application/json' "$url/api/datasources" \
  -d '{"name":"Prometheus","type":"prometheus","url":"http://prometheus:9090","access":"proxy","isDefault":true}' >/dev/null

rc=0
for f in "$DIR"/*.json; do
  body=$(python3 -I -c 'import json,sys; print(json.dumps({"dashboard": json.load(open(sys.argv[1])), "overwrite": True}))' "$f")
  resp=$(curl -s -u admin:check -H 'Content-Type: application/json' "$url/api/dashboards/db" -d "$body")
  if echo "$resp" | grep -q '"status":"success"'; then
    uid=$(echo "$resp" | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["uid"])')
    panels=$(curl -s -u admin:check "$url/api/dashboards/uid/$uid" | python3 -I -c 'import json,sys; print(len(json.load(sys.stdin)["dashboard"]["panels"]))')
    echo "OK   $(basename "$f") → uid=$uid, $panels panels stored"
  else
    echo "FAIL $(basename "$f"): $resp"; rc=1
  fi
done
exit $rc
