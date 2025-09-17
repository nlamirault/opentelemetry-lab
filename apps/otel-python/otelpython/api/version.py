import logging

import fastapi

from otelpython.telemetry import metrics
from otelpython import version


logger = logging.getLogger(__name__)
router = fastapi.APIRouter()


@router.get("/version", tags=["version"])
async def version_handler():
    logger.info("[handler] Version")
    metrics.request_counter.add(1, {"target_service": "version"})
    return {"version": version.version_info}
