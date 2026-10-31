# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging
import sys
from typing import Any

from opentelemetry import _logs, trace
from opentelemetry.exporter.otlp.proto.grpc import _log_exporter as log_exporter_grpc
from opentelemetry.exporter.otlp.proto.http import _log_exporter as log_exporter_http
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk import _logs as sdk_logs
from opentelemetry.sdk import resources
from opentelemetry.sdk._logs import export
from pythonjsonlogger import json as jsonlogger

from otelpython import constants, settings
from otelpython.telemetry import otel


class JsonFormatter(jsonlogger.JsonFormatter):
    """Formats a record as a JSON line, with the trace context of the active span."""

    def add_fields(self, log_data: dict[str, Any], record: logging.LogRecord, message_dict: dict[str, Any]) -> None:
        super().add_fields(log_data, record, message_dict)
        span_context = trace.get_current_span().get_span_context()
        if span_context.is_valid:
            log_data["trace_id"] = trace.format_trace_id(span_context.trace_id)
            log_data["span_id"] = trace.format_span_id(span_context.span_id)


class UvicornFilter(logging.Filter):
    """Drops the access logs of the probe and scrape endpoints, and the colored
    copy of the uvicorn messages, which would end up in the JSON and OTLP fields."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.__dict__.pop("color_message", None)
        # uvicorn.access arguments: client address, method, path, HTTP version, status code.
        args = record.args
        if record.name == "uvicorn.access" and isinstance(args, tuple) and len(args) == 5:
            return str(args[2]).split("?")[0] not in constants.UNTRACED_PATHS
        return True


def setup(resource: resources.Resource, service_name: str) -> sdk_logs.LoggerProvider:
    """Sends the logging records as JSON lines to stdout, and to the OTLP exporter."""
    otlp_log_exporter: export.LogRecordExporter
    if otel.otlp_protocol("logs") == "grpc":
        otlp_log_exporter = log_exporter_grpc.OTLPLogExporter()
    else:
        otlp_log_exporter = log_exporter_http.OTLPLogExporter()

    # The application lifespan shuts the provider down, see application.create_app.
    logger_provider = sdk_logs.LoggerProvider(resource=resource, shutdown_on_exit=False)
    logger_provider.add_log_record_processor(export.BatchLogRecordProcessor(otlp_log_exporter))
    if settings.OTEL_DEBUG:
        logger_provider.add_log_record_processor(export.SimpleLogRecordProcessor(export.ConsoleLogRecordExporter()))
    _logs.set_logger_provider(logger_provider)

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.setFormatter(
        JsonFormatter(
            "%(levelname)s %(name)s %(message)s",
            rename_fields={"levelname": "severity"},
            static_fields={"service": service_name},
            timestamp=True,
        )
    )
    root_logger = logging.getLogger()
    root_logger.addHandler(stdout_handler)
    root_logger.setLevel(logging.INFO)
    for name in ("uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).addFilter(UvicornFilter())

    # Adds the OTLP handler to the root logger, with the global logger provider:
    # the record message is the log body, without the JSON formatting.
    LoggingInstrumentor().instrument()
    logging.getLogger(__name__).info("OpenTelemetry logging initialized")
    return logger_provider


def shutdown(logger_provider: sdk_logs.LoggerProvider) -> None:
    """Removes the OTLP handler, so that the last logs only go to stdout, then
    flushes and shuts the logger provider down."""
    LoggingInstrumentor().uninstrument()
    logger_provider.shutdown()
