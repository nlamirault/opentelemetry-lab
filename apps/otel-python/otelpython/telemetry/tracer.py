# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc import trace_exporter as trace_exporter_grpc
from opentelemetry.exporter.otlp.proto.http import trace_exporter as trace_exporter_http
from opentelemetry.sdk import resources
from opentelemetry.sdk import trace as sdk_trace
from opentelemetry.sdk.trace import export as trace_export

from otelpython import settings
from otelpython.telemetry import otel

logger = logging.getLogger(__name__)


def setup(resource: resources.Resource) -> sdk_trace.TracerProvider:
    """Sets the global tracer provider. The sampler comes from OTEL_TRACES_SAMPLER."""
    otlp_span_exporter: trace_export.SpanExporter
    if otel.otlp_protocol("traces") == "grpc":
        otlp_span_exporter = trace_exporter_grpc.OTLPSpanExporter()
    else:
        otlp_span_exporter = trace_exporter_http.OTLPSpanExporter()

    # The application lifespan shuts the provider down, see application.create_app.
    tracer_provider = sdk_trace.TracerProvider(resource=resource, shutdown_on_exit=False)
    tracer_provider.add_span_processor(trace_export.BatchSpanProcessor(otlp_span_exporter))
    if settings.OTEL_DEBUG:
        tracer_provider.add_span_processor(trace_export.SimpleSpanProcessor(trace_export.ConsoleSpanExporter()))

    trace.set_tracer_provider(tracer_provider)
    logger.info("OpenTelemetry tracing initialized")
    return tracer_provider
