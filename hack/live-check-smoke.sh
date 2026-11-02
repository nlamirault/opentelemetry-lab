#!/usr/bin/env bash
# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

# Live-check smoke test, run by `make schema-live-check-smoke` and CI.
#
# otel-go and otel-rust export straight to a Weaver live-check listener, with
# no collector in between. /chain is called on both, then Weaver is stopped
# through its admin port and writes $REPORT_DIR/live_check.json. The script
# exits with Weaver's code: non-zero when a finding reaches $FAIL_ON.

set -euo pipefail

: "${WEAVER_IMAGE:?WEAVER_IMAGE is not set: run this script through make}"

SCHEMA_DIR=schemas/opentelemetry-lab
REPORT_DIR=${REPORT_DIR:-$SCHEMA_DIR/.live-check/smoke}
CHAIN_CALLS=${CHAIN_CALLS:-10}
FAIL_ON=${FAIL_ON:-violation}

run=live-check-smoke-$$
network=$run
apps=(otel-go otel-rust)

cleanup() {
	docker rm -f "$run-weaver" "${apps[@]/#/$run-}" >/dev/null 2>&1 || true
	docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Polls a URL until it answers, for at most 60 seconds.
wait_for() {
	for _ in $(seq 60); do
		curl -fsS -o /dev/null "$1" 2>/dev/null && return 0
		sleep 1
	done
	echo "Timed out waiting for $1" >&2
	return 1
}

for app in "${apps[@]}"; do
	echo "Building $app"
	docker build --quiet -t "opentelemetry-lab/$app:live-check" "apps/$app" >/dev/null
done

docker network create "$network" >/dev/null
rm -rf "$REPORT_DIR"

# The image runs as the non-root user `weaver`: map the caller so the report
# can be written to the bind mount. The ports bind to --otlp-grpc-address,
# so 0.0.0.0 makes both the OTLP listener and the admin port reachable.
# --include-unreferenced, as in compose.yaml: the upstream signals this
# registry does not import are known, not reported as missing.
docker run -d --name "$run-weaver" --network "$network" --network-alias weaver \
	-u "$(id -u):$(id -g)" -e HOME=/tmp \
	-v "$PWD:/src" -w "/src/$SCHEMA_DIR" -p 127.0.0.1::4320 \
	"$WEAVER_IMAGE" registry live-check -r "/src/$SCHEMA_DIR/model" \
	--include-unreferenced \
	--otlp-grpc-address 0.0.0.0 --otlp-grpc-port 4317 --admin-port 4320 \
	--inactivity-timeout 0 --format json --output "/src/$REPORT_DIR" \
	--fail-on "$FAIL_ON" >/dev/null
admin=http://$(docker port "$run-weaver" 4320/tcp | head -n 1)
wait_for "$admin/health"

# The port each app listens on, as in compose.yaml.
port_of() {
	case $1 in
	otel-go) echo 8888 ;;
	otel-rust) echo 9999 ;;
	esac
}

# Each app calls the other one, so both export client and server spans. The
# resource attributes are the ones compose.yaml sets. Short export intervals
# get the metrics and logs out before Weaver stops.
for app in "${apps[@]}"; do
	peer=otel-go
	[ "$app" = otel-go ] && peer=otel-rust
	docker run -d --name "$run-$app" --network "$network" --network-alias "$app" \
		-p "127.0.0.1::$(port_of "$app")" \
		-e EXPOSE_PORT="$(port_of "$app")" \
		-e TARGET_ONE_SVC="http://$peer:$(port_of "$peer")" \
		-e TARGET_TWO_SVC="http://$peer:$(port_of "$peer")" \
		-e OTEL_EXPORTER_OTLP_ENDPOINT=http://weaver:4317 \
		-e OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
		-e OTEL_SERVICE_NAME="$app" \
		-e OTEL_RESOURCE_ATTRIBUTES="deployment.environment.name=docker,service.name=$app,service.criticality=medium,service.version=v1.0.0" \
		-e OTEL_METRIC_EXPORT_INTERVAL=1000 \
		-e OTEL_BSP_SCHEDULE_DELAY=200 \
		-e OTEL_BLRP_SCHEDULE_DELAY=200 \
		"opentelemetry-lab/$app:live-check" >/dev/null
done

for app in "${apps[@]}"; do
	url=http://$(docker port "$run-$app" "$(port_of "$app")/tcp" | head -n 1)
	wait_for "$url/health"
	echo "Calling $app /chain $CHAIN_CALLS times"
	for _ in $(seq "$CHAIN_CALLS"); do
		curl -fsS -o /dev/null "$url/chain"
	done
done

# Let a few export intervals pass, then stop: /stop returns once the report
# is written, and Weaver exits with the --fail-on result.
sleep 5
curl -fsS -X POST "$admin/stop" >/dev/null
status=$(docker wait "$run-weaver")
docker logs "$run-weaver" 2>&1 | tail -n 5

report=$REPORT_DIR/live_check.json
if [ ! -s "$report" ]; then
	echo "No report at $report" >&2
	exit 1
fi
echo "Findings by level in $report:"
jq -r '.statistics.advice_level_counts // {} | to_entries[] | "  \(.key): \(.value)"' "$report"
exit "$status"
