import logging

import fastapi

from otelpython import version


logger = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/version", tags=["version"])
async def version_handler():
    logger.info("[handler] Version")
    return {"version": version.version_info}
