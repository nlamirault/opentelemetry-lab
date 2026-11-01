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
├── .weaver.toml           # [registry] v2 = true
├── .deps/                 # gitignored: semconv model fetched by `make schema-deps`
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
touches `schemas/**`.

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
