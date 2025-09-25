# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

import fastapi

from otelpython.telemetry import metrics
from otelpython import version


logger = logging.getLogger(__name__)
router = fastapi.APIRouter()


@router.get("/version", tags=["version"])
async def version_handler() -> dict[str, str]:
    logger.info("[handler] Version")
    metrics.request_counter.add(1, {"target_service": "version"})
    return {"version": version.version_info}
