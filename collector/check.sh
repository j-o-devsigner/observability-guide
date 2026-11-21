#!/usr/bin/env bash
# Validate every collector/*.yaml with the pinned collector image (no cluster needed).
# Dummy env values and a dummy service-account folder (testdata/, validate-only cert) let receivers that read
# in-pod files (kubeletstats with serviceAccount auth) build their config.
set -euo pipefail
IMAGE="${1:-otel/opentelemetry-collector-contrib:0.162.0}"
DIR="$(cd "$(dirname "$0")" && pwd)"
rc=0
for f in "$DIR"/*.yaml; do
  name="$(basename "$f")"
  if docker run --rm \
      -e MY_POD_IP=127.0.0.1 -e K8S_NODE_NAME=node1 -e DT_TENANT=example -e DT_API_TOKEN=dummy \
      -e DT_ENDPOINT=https://example.live.dynatrace.com/api/v2/otlp \
      -e K8S_CLUSTER_NAME=example -e K8S_CLUSTER_UID=example -e DEPLOY_ENV=prod \
      -v "$DIR":/c:ro -v "$DIR/testdata/serviceaccount":/var/run/secrets/kubernetes.io/serviceaccount:ro \
      "$IMAGE" validate --config="/c/$name"; then
    echo "OK   $name"
  else
    echo "FAIL $name"; rc=1
  fi
done
exit $rc
