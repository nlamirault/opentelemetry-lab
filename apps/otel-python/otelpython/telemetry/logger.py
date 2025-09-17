import logging
import os

from opentelemetry import _logs
from opentelemetry.exporter.otlp.proto.grpc import _log_exporter as log_exporter_grpc
from opentelemetry.exporter.otlp.proto.http import _log_exporter as log_exporter_http
from opentelemetry.sdk import _logs as sdk_logs
from opentelemetry.sdk._logs import export
from pythonjsonlogger import jsonlogger

from otelpython import exceptions


# logger = logging.getLogger(__name__)


def setup(resource, otlp_endpoint, otlp_protocol):
    otlp_log_exporter = None
    if otlp_protocol == "http":
        otlp_log_exporter = log_exporter_http.OTLPLogExporter(endpoint=otlp_endpoint)
    elif otlp_protocol == "grpc":
        otlp_log_exporter = log_exporter_grpc.OTLPLogExporter(endpoint=otlp_endpoint)
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )
    # logger.info("✅ OTLP logger configured")

    logger_provider = sdk_logs.LoggerProvider(
        resource=resource,
    )

    logger_provider.add_log_record_processor(export.BatchLogRecordProcessor(otlp_log_exporter))

    if os.getenv("OTEL_ENABLE_CONSOLE", "false").lower() == "true":
        console_log_exporter = export.ConsoleLogExporter()
        logger_provider.add_log_record_processor(
            export.SimpleLogRecordProcessor(console_log_exporter)
        )
        # logger_provider.add_log_record_processor(export.BatchLogRecordProcessor(console_log_exporter))
        # logger.info("✅ Console logger enabled")

    _logs.set_logger_provider(logger_provider)

    handler = sdk_logs.LoggingHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s resource.service.name=%(otelServiceName)s] - %(message)s"
        )
    )
    logger = logging.getLogger()
    logger.addHandler(handler)
    # logger.setLevel(logging.NOTSET)
    logger.setLevel(logging.INFO)
    logger.info("🔥 OpenTelemetry logging initialized")
