# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import asyncio
import contextlib
import logging
import threading
from collections.abc import AsyncIterator, Callable, Sequence

import fastapi
import httpx
from opentelemetry.instrumentation import fastapi as otel_fastapi

from otelpython import constants
from otelpython import version as app_version
from otelpython.api import chain, health, metrics, root, version

logger = logging.getLogger(__name__)


def create_app(service_name: str, shutdown_hooks: Sequence[Callable[[], object]] = ()) -> fastapi.FastAPI:
    """Create the application

    Args:
        service_name: the title of the application
        shutdown_hooks: called in order when the application stops, to flush the telemetry

    Returns:
        [fastapi.FastAPI]: the main application
    """

    @contextlib.asynccontextmanager
    async def lifespan(app: fastapi.FastAPI) -> AsyncIterator[None]:
        async with httpx.AsyncClient() as client:
            app.state.http_client = client
            yield
        await _run_shutdown_hooks(shutdown_hooks)

    logger.info("Create application %s", app_version.version_info)
    app = fastapi.FastAPI(version=app_version.version_info, title=service_name, lifespan=lifespan)
    app.include_router(root.router)
    app.include_router(health.router)
    app.include_router(metrics.router)
    app.include_router(version.router)
    app.include_router(chain.router)
    otel_fastapi.FastAPIInstrumentor.instrument_app(
        app,
        excluded_urls=",".join(constants.UNTRACED_PATHS),
        # One span per request, without the internal spans of each ASGI event.
        exclude_spans=["receive", "send"],
    )
    return app


async def _run_shutdown_hooks(hooks: Sequence[Callable[[], object]]) -> None:
    """Runs the hooks in order, for SHUTDOWN_TIMEOUT_SECONDS at most.

    When the collector is down, each exporter retries for OTEL_EXPORTER_OTLP_TIMEOUT
    (10s by default), which would exceed the grace period of the container runtime.
    """

    def run_hooks() -> None:
        for hook in hooks:
            hook()

    # A daemon thread, so that a hook still running does not block the exit.
    thread = threading.Thread(target=run_hooks, name="shutdown-hooks", daemon=True)
    thread.start()
    await asyncio.to_thread(thread.join, constants.SHUTDOWN_TIMEOUT_SECONDS)
    if thread.is_alive():
        logger.warning("Shutdown hooks timed out after %ss", constants.SHUTDOWN_TIMEOUT_SECONDS)
