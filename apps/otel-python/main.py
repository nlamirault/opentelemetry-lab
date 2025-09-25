# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import json
import logging


import uvicorn

from otelpython import application
from otelpython.telemetry import logger as otel_logger
from otelpython.telemetry import meter as otel_meter
from otelpython.telemetry import otel
from otelpython.telemetry import tracer as otel_tracer
from otelpython import settings


logger = logging.getLogger(__name__)
tracer = otel.get_tracer()

app = None


def run() -> None:
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
    application.add_otel_exception_handler(app)
    logger.info("Application is ready")
    uvicorn.run(app, host="0.0.0.0", port=settings.EXPOSE_PORT)


if __name__ == "__main__":
    run()
