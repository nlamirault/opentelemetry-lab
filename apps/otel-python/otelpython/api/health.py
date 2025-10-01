# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import fastapi

from otelpython.telemetry import metrics

logger = logging.getLogger(__name__)
router = fastapi.APIRouter()


@router.get("/health", tags=["health"])
async def health_handler() -> dict[str, str]:
    logger.info("[handler] Version")
    metrics.request_counter.add(1, {"target_service": "health"})
    # request_counter.add(1, {"http.route": request.path})
    return {"status": "OK"}
