# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import fastapi

from otelpython.telemetry import metrics

logger = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/", tags=["root"])
async def root_handler() -> str:
    logger.info("[handler] Version")
    metrics.request_counter.add(1, {"target_service": "root"})
    return "OpenTelemetry Lab / Python"
