# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

import logging
import os

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
import uvicorn

from otelpython import application
from otelpython.telemetry import logger as otel_logger
from otelpython.telemetry import meter as otel_meter
from otelpython.telemetry import otel
from otelpython.telemetry import tracer as otel_tracer
from otelpython import settings


logger = logging.getLogger(__name__)

app = None


def run():
    resource = otel.create_resource(settings.OTEL_SERVICE_NAME)
    otel_logger.setup(
        resource,
        settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        settings.OTEL_EXPORTER_OTLP_PROTOCOL,
    )
    otel_tracer.setup(
        resource,
        settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        settings.OTEL_EXPORTER_OTLP_PROTOCOL,
    )
    otel_meter.setup(
        resource,
        settings.OTEL_EXPORTER_OTLP_ENDPOINT,
        settings.OTEL_EXPORTER_OTLP_PROTOCOL,
    )

    logger.info("Application bootstrap")
    app = application.creates_app(settings.OTEL_SERVICE_NAME)
    FastAPIInstrumentor().instrument_app(app)
    LoggingInstrumentor().instrument(
        set_logging_format=True, log_level=os.getenv("OTEL_LOG_LEVEL", "INFO")
    )
    LoggingInstrumentor(
        logging_format="%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s resource.service.name=%(otelServiceName)s trace_sampled=%(otelTraceSampled)s] - %(message)s"
    )
    logger.info("Application is ready")
    uvicorn.run(app, host="0.0.0.0", port=settings.EXPOSE_PORT)


if __name__ == "__main__":
    run()
