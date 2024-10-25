# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

import logging
from os import environ

from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
import uvicorn

from otelpython import application
from otelpython.telemetry import logger
from otelpython.telemetry import meter
from otelpython.telemetry import tracer
from otelpython import settings


LOGGER = logging.getLogger(__name__)


if __name__ == "__main__":
    logger.setup(settings.SERVICE_NAME, settings.OTLP_ENDPOINT, settings.OTLP_PROTOCOL)
    tracer.setup(settings.SERVICE_NAME, settings.OTLP_ENDPOINT, settings.OTLP_PROTOCOL)
    meter.setup(settings.SERVICE_NAME, settings.OTLP_ENDPOINT, settings.OTLP_PROTOCOL)
    app = application.creates_app(settings.SERVICE_NAME)
    FastAPIInstrumentor().instrument_app(app)
    LoggingInstrumentor().instrument(set_logging_format=True)
    LoggingInstrumentor(
        logging_format="%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s resource.service.name=%(otelServiceName)s trace_sampled=%(otelTraceSampled)s] - %(message)s"
    )
    uvicorn.run(app, host="0.0.0.0", port=settings.EXPOSE_PORT)
