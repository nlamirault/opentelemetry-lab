import logging

from opentelemetry import trace
from opentelemetry.sdk import trace as sdk_trace
from opentelemetry.sdk.trace import export as trace_export

from opentelemetry.exporter.otlp.proto.http import trace_exporter as trace_exporter_http
from opentelemetry.exporter.otlp.proto.grpc import trace_exporter as trace_exporter_grpc
from opentelemetry.sdk import resources
from opentelemetry.semconv import resource


from otelpython import exceptions
from otelpython.telemetry import otel


def setup(service_name, otlp_endpoint, otlp_protocol):
    logging.info("[otel] Setup tracer")
    res = otel.create_resource(service_name)

    otlp_span_exporter = None
    if otlp_protocol == "http":
        otlp_span_exporter = trace_exporter_http.OTLPSpanExporter(endpoint=otlp_endpoint)
    elif otlp_protocol == "grpc":
        otlp_span_exporter = trace_exporter_grpc.OTLPSpanExporter(endpoint=otlp_endpoint)
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )

    tracer_provider = sdk_trace.TracerProvider(
        resource=res,
        span_limits=sdk_trace.SpanLimits(max_attributes=100_000),
    )

    console_span_exporter = trace_export.ConsoleSpanExporter()
    console_span_processor = trace_export.SimpleSpanProcessor(console_span_exporter)
    tracer_provider.add_span_processor(console_span_processor)

    otlp_span_processor = trace_export.BatchSpanProcessor(otlp_span_exporter)
    tracer_provider.add_span_processor(otlp_span_processor)

    trace.set_tracer_provider(tracer_provider)
