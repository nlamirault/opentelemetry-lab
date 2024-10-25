import logging

import fastapi

from otelpython import version


LOGGER = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/health", tags=["health"])
async def health_handler():
    LOGGER.info("[handler] Version")
    return {"status": "OK"}
