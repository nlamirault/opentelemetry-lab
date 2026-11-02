# OpenTelemetry lab registry

An [OpenTelemetry Weaver](https://github.com/open-telemetry/weaver) registry
that describes the telemetry the lab applications own. It depends on the
upstream semantic conventions (v1.43.0) and adds only what the lab defines:

- the `lab.build.info` gauge and the `lab.app.language` attribute,
- the deprecated `opentelemetry.lab.build.info` counter every app emits today,
- refinements of the upstream `service` and `deployment` entities,
- imports of the upstream HTTP server and client spans and duration metrics.

The reference page is generated into [`docs/registry.md`](docs/registry.md).

## Layout

```
schemas/opentelemetry-lab/
├── .weaver.toml           # [registry] v2 = true, and the [live-check] settings
├── .deps/                 # gitignored: semconv model fetched by `make schema-deps`
├── .live-check/           # gitignored: live-check reports, compose/ and smoke/
├── model/                 # the registry: Weaver loads every YAML file below it
│   ├── manifest.yaml      # schema_url and the semconv dependency
│   ├── lab/               # lab.* attributes and metrics
│   ├── service/           # entity refinements
│   └── http/              # upstream HTTP imports
├── policies/              # Rego rules, and one failing fixture per rule
├── templates/             # markdown templates for `make schema-docs`
└── docs/                  # generated, do not edit
```

The manifest lives in `model/` rather than next to `.weaver.toml`, as in the
upstream semantic conventions repository: Weaver reads every YAML file under
the registry root, so the templates and the policy fixtures must sit outside
it.

## Running the checks

Weaver runs from its Docker image only, so Docker is the one requirement.

```shell
make schema-check        # resolve the registry and apply the policies
make schema-policy-test  # each policy must reject its fixture
make schema-docs         # regenerate docs/registry.md
make schema-docs-check   # fail if docs/ differs from the registry
make schema-diff         # changes against origin/main (SCHEMA_BASELINE=<ref>)
```

The `Schema / Weaver` workflow runs the same targets on every pull request that
touches `schemas/**`, and the live-check smoke test below.

## Live check

The registry check reads definitions. `weaver registry live-check` reads the
telemetry the apps really emit, and reports how it departs from this registry
and from semantic conventions: a deprecated or unknown attribute, an enum value
outside its members, a missing required attribute.

### In the lab

The `weaver` service of the `schema` profile listens for OTLP gRPC. With
`WEAVER_LIVE_CHECK` set, the lgtm collector loads the overlay
[`etc/otel/otel-collector-weaver.yaml`](../../etc/otel/otel-collector-weaver.yaml)
as a second `--config`, and tees the app telemetry to it.

```shell
make schema-live-check-up      # lgtm, the apps and Weaver, with the tee
# ...use the apps, watch the "Schema compliance" Grafana dashboard...
make schema-live-check-report  # stop the run, write .live-check/compose/live_check.json
```

`schema-live-check-up` runs:

```shell
make schema-deps
WEAVER_LIVE_CHECK=1 WEAVER_UID=$(id -u) WEAVER_GID=$(id -g) \
  docker compose --profile lgtm --profile apps --profile schema up -d
```

`--profile schema` alone starts Weaver, but nothing reaches it: a profile
cannot change the config of the collector, so the tee has its own switch.
Without `WEAVER_LIVE_CHECK`, the collector config is the one it always was.

- Weaver sends each finding to the collector as an OTLP log, on a receiver of
  the overlay (4319) that writes to Loki. The
  [Schema compliance](http://localhost:3000/d/schema-compliance-lgtm) dashboard
  reads them: findings per app, per finding id and per level.
- The report is written when the run stops: `make schema-live-check-report`, or
  `docker compose stop weaver`. Until then Weaver keeps every sample in memory,
  so stop a long session and start a new one with
  `docker compose --profile schema up -d weaver`. While Weaver is stopped, a
  collector started with `WEAVER_LIVE_CHECK` logs an export error for each
  batch it tees: start Weaver again, or run the `up` command without the
  variable.
- otel-java does not build today (its `openjdk:8-jre-slim` base image is gone),
  and `docker compose up` stops on the failed build. Until it is fixed, name
  the services to start, for example
  `... up -d otel-collector-lgtm loki tempo pyroscope prometheus grafana-lgtm weaver otel-go otel-rust otel-python otel-ts`.
- The tee pipelines read the `otlp` receiver only, with no `resource` or
  `resourcedetection` processor, so Weaver sees what the apps emit. The lgtm
  `logs` pipeline, for instance, replaces every `service.name` with
  `otel-collector`.
- The overlay drops the telemetry of the instrumentation libraries the lab
  does not own (Java agent, Node auto-instrumentations, otelgin, Python
  instrumentations...), with the reason for each. Their findings would bury
  the ones the lab code causes.

### In CI

`make schema-live-check-smoke` builds otel-go and otel-rust, points them
straight at a Weaver container (no collector), calls `/chain` on both, stops
Weaver through its admin port and writes `.live-check/smoke/live_check.json`.
It fails when a finding reaches `FAIL_ON` (`violation` by default). The
`Live check` job of the workflow runs it, writes the counts to the job summary
and uploads the report.

With no collector, nothing drops the instrumentation libraries there: otelgin
and the Go host and runtime instrumentations are checked too.

### Settings

`[live-check]` in [`.weaver.toml`](.weaver.toml) holds what the check means,
and the command line holds how it runs (listener, ports, report output, OTLP
logs, `--fail-on`), which differ between compose and the smoke test.

- `search_all_attributes = true`: an upstream attribute this registry does not
  reference is looked up in semconv, rather than reported as
  `missing_attribute`.
- `undefined_enum_variant` and `kind_mismatch` are raised to `violation`.
- Each `finding_filters` entry has its reason above it. A filter matches a
  finding id, a level, a signal type or a sample name (attribute key, span,
  metric or event name), never an instrumentation scope: muting a library by
  scope is done in the collector overlay.
- Both runs pass `--include-unreferenced`, so the upstream metrics and entities
  the apps emit (`go.*`, `system.*`, `process.*`...) are known rather than
  `missing_metric`. Weaver v0.28.0 marks the flag deprecated in favour of
  importing them in `model/`.

## Policies

The rules in `policies/` apply to the definitions this registry adds. Imports
and refinements keep their upstream names, and a deprecated definition keeps
the name the apps emitted before it was replaced.

| Finding id           | Rule                                                        |
| -------------------- | ----------------------------------------------------------- |
| `lab_prefix`         | A lab-defined name starts with `lab.`                       |
| `upstream_namespace` | A lab-defined name is not in a namespace that semconv owns  |
| `duration_unit`      | A metric whose name contains `duration` has the unit `s`    |
| `metric_name_suffix` | A metric name does not end with `_total`, `_ms`, `_seconds` |

`policies/testdata/<finding id>/` holds a small registry that must raise that
finding. Add one with every new rule.

These rules check definitions, not emitted telemetry: the names the apps emit
today (`request.count`, `http.server.requests`, ...) are only seen by
live-check.

## Changing the registry

- **Add telemetry:** define it under `model/lab/` with a `lab.` name, or import
  or refine the upstream signal. Run `make schema-check schema-docs` and commit
  the docs.
- **Deprecate a lab signal:** keep the definition and add `deprecated:` with a
  `note`. Use `reason: renamed` only when nothing but the name changed: a new
  unit or instrument needs `uncategorized`.
- **Bump semconv:** change the version in both `schema_url` and
  `registry_path` of `model/manifest.yaml`, and in every
  `policies/testdata/*/manifest.yaml`. The Makefile and the CI cache key read
  it from `model/manifest.yaml`.
- **Bump Weaver:** change `WEAVER_IMAGE` in the `Makefile`, keeping the digest.

## Weaver behaviour to know

Found by running `otel/weaver:v0.28.0`:

- `-r .` finds the manifest but loads no definition file, and the check passes.
  The Makefile passes the absolute container path instead.
- `registry_path` in the manifest resolves against the working directory, not
  against the manifest, so Weaver runs from `schemas/opentelemetry-lab/`.
- The upstream registry is still in the v1 format: a span import names the v1
  group id (`span.http.server`), while a metric import names the metric.
- `--future` turns the "`definition/2` is not yet stable" warning into an
  error, so `schema-check` does not pass it.
- `registry diff` reports added, removed and deprecated signals only. A changed
  attribute or enum member does not show up.
- `--diagnostic-format gh_workflow_command` prints policy violations but not
  resolution errors such as an unresolved `ref`, so CI keeps the default
  `ansi` format.

Found by running `registry live-check`:

- The OTLP listener and the admin port bind to `--otlp-grpc-address`, which
  defaults to `127.0.0.1`: in a container it must be `0.0.0.0`.
- The listener rejects gzip, so the collector exporter sets
  `compression: none`.
- Weaver stops on SIGINT, SIGHUP or `POST /stop`, not on SIGTERM: the compose
  service sets `stop_signal: SIGINT`, or `docker compose stop` would kill it
  before it writes the report.
- With a file `--output`, the report is written only when the run stops.
- With `--emit-otlp-logs` and no `--otlp-logs-endpoint` or
  `OTEL_EXPORTER_OTLP_*ENDPOINT`, findings would go to `localhost:4317`,
  Weaver's own listener: Weaver refuses to start. The compose service gives
  the endpoint, and `.weaver.toml` does not enable the emission.
