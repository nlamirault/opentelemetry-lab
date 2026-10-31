# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import fastapi
import httpx
from opentelemetry import trace

from otelpython import settings
from otelpython.telemetry import metrics

logger = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/chain", tags=["chain"])
async def chain_handler(request: fastapi.Request, response: fastapi.Response) -> dict[str, str]:
    """Calls both target services, and answers 502 Bad Gateway if any of them fails."""
    logger.info("[handler] Chain")
    metrics.request_counter.add(1, {"target_service": "chain"})

    client: httpx.AsyncClient = request.app.state.http_client
    span = trace.get_current_span()
    errors = []
    for service in (settings.TARGET_ONE_SVC, settings.TARGET_TWO_SVC):
        logger.info("Call to service %s", service)
        try:
            service_response = await client.get(service)
            service_response.raise_for_status()
        except httpx.HTTPError as err:
            logger.error("Service call fails: %s: %r", service, err)
            span.record_exception(err)
            errors.append(f"{service}: {err!r}")

    if errors:
        # The FastAPI instrumentation sets the span status to ERROR for a 5xx
        # response, and replaces any status set here: the exception events
        # carry the details.
        response.status_code = fastapi.status.HTTP_502_BAD_GATEWAY
        return {"error": "; ".join(errors)}
    return {"path": "/chain"}
