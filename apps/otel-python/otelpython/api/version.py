import logging

import fastapi

from otelpython import version


LOGGER = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/version", tags=["version"])
async def version_handler():
    LOGGER.info("[handler] Version")
    return {"version": version.RELEASE}
