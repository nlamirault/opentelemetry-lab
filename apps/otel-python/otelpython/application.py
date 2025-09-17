import logging

import fastapi

from otelpython import version as app_version
from otelpython.api import chain
from otelpython.api import health
from otelpython.api import root
from otelpython.api import version


def creates_app(service_name):
    """Create the application

    Returns:
        [fastapi.FastAPI]: the main application
    """

    logging.info("Create application %s", app_version.version_info)
    app = fastapi.FastAPI(version=app_version.version_info, title=service_name)
    app.include_router(root.router)
    app.include_router(chain.router)
    app.include_router(health.router)
    app.include_router(version.router)
    return app
