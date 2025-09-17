import logging
import os

from opentelemetry import trace
from opentelemetry.sdk import trace as sdk_trace
from opentelemetry.sdk.trace import export as trace_export

from opentelemetry.exporter.otlp.proto.http import trace_exporter as trace_exporter_http
from opentelemetry.exporter.otlp.proto.grpc import trace_exporter as trace_exporter_grpc

from otelpython import exceptions
from otelpython import settings


logger = logging.getLogger(__name__)


def setup(resource: str, otlp_endpoint: str, otlp_protocol: str) -> trace.Tracer:
    logging.info("Setup OpenTelemetry Tracer")

    otlp_span_exporter = None
    if otlp_protocol == "http":
        otlp_span_exporter = trace_exporter_http.OTLPSpanExporter(
            endpoint=otlp_endpoint, insecure=True
        )
        print("http ok")
    elif otlp_protocol == "grpc":
        otlp_span_exporter = trace_exporter_grpc.OTLPSpanExporter(
            endpoint=otlp_endpoint,
            insecure=True,
        )
        print("grpc ok")
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )
    logger.info(f"OTLP tracing configured: {otlp_endpoint}")

    tracer_provider = sdk_trace.TracerProvider(
        resource=resource,
        span_limits=sdk_trace.SpanLimits(max_attributes=100_000),
    )

    if os.getenv("OTEL_ENABLE_CONSOLE", "false").lower() == "true":
        console_span_exporter = trace_export.ConsoleSpanExporter()
        console_span_processor = trace_export.SimpleSpanProcessor(console_span_exporter)
        tracer_provider.add_span_processor(console_span_processor)
        logger.info("Console tracing enabled")

    otlp_span_processor = trace_export.BatchSpanProcessor(otlp_span_exporter)
    tracer_provider.add_span_processor(otlp_span_processor)

    trace.set_tracer_provider(tracer_provider)
    logger.info("OpenTelemetry tracing initialized")
    tracer = trace.get_tracer(settings.OTEL_SERVICE_NAME)
    return tracer
