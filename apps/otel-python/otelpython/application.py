# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import fastapi
from fastapi import exceptions
from fastapi import responses
from opentelemetry import trace
from opentelemetry.instrumentation import fastapi as otel_fastapi
from opentelemetry.instrumentation import httpx as otel_httpx
from opentelemetry.instrumentation import system_metrics as otel_system_metrics
import prometheus_client

from otelpython import version as app_version
from otelpython.api import chain
from otelpython.api import health
from otelpython.api import metrics
from otelpython.api import root
from otelpython.api import version


def creates_app(service_name: str) -> fastapi.FastAPI:
    """Create the application

    Returns:
        [fastapi.FastAPI]: the main application
    """

    logging.info("Create application %s", app_version.version_info)
    app = fastapi.FastAPI(version=app_version.version_info, title=service_name)
    app.include_router(root.router)
    app.include_router(health.router)
    # app.include_router(metrics.router)
    app.include_router(version.router)
    app.include_router(chain.router)
    _setup_auto_instrumentation(app)
    # Add Prometheus ASGI app directly at /metrics
    app.mount("/metrics", prometheus_client.make_asgi_app())
    return app


def add_otel_exception_handler(app: fastapi.FastAPI) -> None:
    @app.exception_handler(exceptions.HTTPException)
    async def http_exception_handler(
        request: fastapi.Request,
        exc: exceptions.HTTPException,
    ) -> responses.JSONResponse:
        current_span = trace.get_current_span()
        current_span.set_attributes(
            {
                # "span_status": "ERROR",
                "http.status_text": str(exc.detail),
                "otel.status_description": f"{exc.status_code} / {exc.detail}",
                "otel.status_code": "ERROR",
            }
        )
        # current_span.add_event("Test")
        current_span.record_exception(exc)
        return responses.JSONResponse(
            status_code=exc.status_code, content={"detail": str(exc.detail)}
        )


def _setup_auto_instrumentation(app: fastapi.FastAPI) -> None:
    """Set up automatic instrumentation for libraries."""

    otel_fastapi.FastAPIInstrumentor.instrument_app(app)
    otel_httpx.HTTPXClientInstrumentor().instrument()
    otel_system_metrics.SystemMetricsInstrumentor().instrument()
    # AsyncPGInstrumentor().instrument()
