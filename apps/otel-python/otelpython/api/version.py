import logging

import fastapi

from otelpython import version


router = fastapi.APIRouter()


@router.get("/version", tags=["version"])
async def version_handler():
    logging.info("[handler] Version")
    return {"version": version.version_info}
