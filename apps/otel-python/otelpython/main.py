# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import uvicorn

from otelpython import application, settings
from otelpython.telemetry import logger as otel_logger
from otelpython.telemetry import meter as otel_meter
from otelpython.telemetry import metrics, otel
from otelpython.telemetry import tracer as otel_tracer

logger = logging.getLogger(__name__)


def run() -> None:
    resource = otel.create_resource(settings.OTEL_SERVICE_NAME)
    logger_provider = otel_logger.setup(resource, settings.OTEL_SERVICE_NAME)
    tracer_provider = otel_tracer.setup(resource)
    meter_provider = otel_meter.setup(resource)
    otel.instrument_libraries()
    metrics.record_build_info()

    app = application.create_app(
        settings.OTEL_SERVICE_NAME,
        # Logs last, so that the shutdown logs are exported too.
        shutdown_hooks=[
            tracer_provider.shutdown,
            meter_provider.shutdown,
            lambda: otel_logger.shutdown(logger_provider),
        ],
    )
    logger.info("Application is ready")
    # Without a log config, the uvicorn loggers use the root handlers: JSON on stdout, and OTLP.
    uvicorn.run(app, host="0.0.0.0", port=settings.EXPOSE_PORT, log_config=None)


if __name__ == "__main__":
    run()
