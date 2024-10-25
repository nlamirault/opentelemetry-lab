import logging

import fastapi


LOGGER = logging.getLogger(__name__)

router = fastapi.APIRouter()


@router.get("/", tags=["root"])
async def root_handler():
    LOGGER.info("[handler] Version")
    return "OpenTelemetry Lab / Python"
