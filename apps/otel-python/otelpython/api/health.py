import logging

import fastapi

from otelpython import version

router = fastapi.APIRouter()


@router.get("/health", tags=["health"])
async def health_handler():
    logging.info("[handler] Version")
    return {"status": "OK"}
