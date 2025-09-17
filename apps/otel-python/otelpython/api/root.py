import logging

import fastapi


router = fastapi.APIRouter()


@router.get("/", tags=["root"])
async def root_handler():
    logging.info("[handler] Version")
    return "OpenTelemetry Lab / Python"
