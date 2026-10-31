# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import os

from opentelemetry import metrics
from opentelemetry.instrumentation import httpx as otel_httpx
from opentelemetry.instrumentation import system_metrics as otel_system_metrics
from opentelemetry.sdk import resources

from otelpython import exceptions, settings, version

OTLP_PROTOCOLS = ("grpc", "http/protobuf")


def create_resource(service_name: str) -> resources.Resource:
    return resources.Resource.create(
        {
            resources.SERVICE_NAME: service_name,
            resources.SERVICE_VERSION: version.version_info,
        }
    )


def otlp_protocol(signal: str) -> str:
    """Returns the OTLP protocol of a signal (traces, metrics or logs).

    It reads OTEL_EXPORTER_OTLP_<SIGNAL>_PROTOCOL, then OTEL_EXPORTER_OTLP_PROTOCOL,
    and defaults to http/protobuf like the specification. The exporters read the
    other OTEL_EXPORTER_OTLP_* variables (endpoint, headers, timeout) themselves.
    """
    protocol = (
        os.environ.get(f"OTEL_EXPORTER_OTLP_{signal.upper()}_PROTOCOL")
        or os.environ.get("OTEL_EXPORTER_OTLP_PROTOCOL")
        or "http/protobuf"
    )
    if protocol not in OTLP_PROTOCOLS:
        raise exceptions.OpenTelemetryProtocolException(f"invalid OpenTelemetry protocol: {protocol}")
    return protocol


def instrument_libraries() -> None:
    """Instruments the process-wide libraries: HTTPX clients and system metrics."""
    otel_httpx.HTTPXClientInstrumentor().instrument()
    otel_system_metrics.SystemMetricsInstrumentor().instrument()


def get_meter() -> metrics.Meter:
    """Returns the OpenTelemetry meter instance."""
    return metrics.get_meter(settings.OTEL_SERVICE_NAME)
