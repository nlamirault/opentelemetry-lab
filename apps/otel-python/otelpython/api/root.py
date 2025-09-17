import logging

import fastapi


logger = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/", tags=["root"])
async def root_handler():
    logger.info("[handler] Version")
    return "OpenTelemetry Lab / Python"
