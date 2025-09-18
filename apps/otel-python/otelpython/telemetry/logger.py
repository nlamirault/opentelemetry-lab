import logging
import os

from opentelemetry import _logs
from opentelemetry.exporter.otlp.proto.grpc import _log_exporter as log_exporter_grpc
from opentelemetry.exporter.otlp.proto.http import _log_exporter as log_exporter_http
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk import _logs as sdk_logs
from opentelemetry.sdk import resources
from opentelemetry.sdk._logs import export
from pythonjsonlogger import jsonlogger

from otelpython import exceptions


# logger = logging.getLogger(__name__)


def setup(resource: resources.Resource, otlp_endpoint: str, otlp_protocol: str) -> None:
    otlp_log_exporter = None
    if otlp_protocol == "http":
        otlp_log_exporter = log_exporter_http.OTLPLogExporter(
            endpoint=f"{otlp_endpoint}/v1/logs", insecure=True
        )
    elif otlp_protocol == "grpc":
        otlp_log_exporter = log_exporter_grpc.OTLPLogExporter(endpoint=otlp_endpoint, insecure=True)
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )

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

    _logs.set_logger_provider(logger_provider)

    # This has to be called first before logger.getLogger().addHandler() so that it can call logging.basicConfig first to set the logging format
    LoggingInstrumentor().instrument()  # set_logging_format=True)

    handler = sdk_logs.LoggingHandler()
    handler.setFormatter(
        jsonlogger.JsonFormatter(
            # "%(asctime)s %(levelname)s trace_id=%(otelTraceID)s span_id=%(otelSpanID)s - %(message)s"
            "%(asctime)s %(levelname)s %(message)s %(otelTraceID)s %(otelSpanID)s %(otelTraceSampled)s",
            rename_fields={
                "levelname": "severity",
                "asctime": "timestamp",
                "otelTraceID": "trace_id",
                "otelSpanID": "span_id",
                "otelTraceSampled": "trace_sampled",
            },
            datefmt="%Y-%m-%dT%H:%M:%SZ",
        )
    )
    logger = logging.getLogger()
    logger.addHandler(handler)
    # logger.setLevel(logging.NOTSET)
    logger.setLevel(logging.INFO)
    logger.info("OpenTelemetry logging initialized")
