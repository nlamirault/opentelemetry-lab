# OpenTelemetry Lab / Python

## Python

[uv](https://docs.astral.sh/uv/) is used to manage the Python project.

## Execution

`uv run otelpython`

The application sets up the OpenTelemetry SDK itself, without `opentelemetry-instrument`.
The exporters follow the standard environment variables:

| Variable                           | Default                 | Description                                |
| ---------------------------------- | ----------------------- | ------------------------------------------ |
| `OTEL_EXPORTER_OTLP_PROTOCOL`      | `http/protobuf`         | `grpc` or `http/protobuf`, also per signal |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | SDK default             | Collector endpoint, also per signal        |
| `OTEL_SERVICE_NAME`                | `otel-python`           | Service name                               |
| `OTEL_RESOURCE_ATTRIBUTES`         |                         | Extra resource attributes                  |
| `OTEL_TRACES_SAMPLER`              | `parentbased_always_on` | Sampler                                    |
| `OTEL_SEMCONV_STABILITY_OPT_IN`    | `http`                  | Stable HTTP semantic conventions           |
| `OTEL_DEBUG`                       |                         | Any value adds console exporters           |
| `EXPOSE_PORT`                      | `8000`                  | HTTP port                                  |
| `TARGET_ONE_SVC`, `TARGET_TWO_SVC` | itself                  | Services called by `/chain`                |

Logs are written as JSON lines to stdout, with the trace context, and exported with OTLP.
Metrics are exported with OTLP, and served for Prometheus on `/metrics`.
