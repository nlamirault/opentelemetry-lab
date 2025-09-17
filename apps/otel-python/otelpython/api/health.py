import logging

import fastapi

from otelpython import version


logger = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/health", tags=["health"])
async def health_handler():
    logger.info("[handler] Version")
    return {"status": "OK"}
