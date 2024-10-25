import logging

import fastapi
import httpx

from otelpython import settings


router = fastapi.APIRouter()


@router.get("/chain", tags=["chain"])
async def chain_handler():
    logging.info(
        f"[handler] Chain Start using {settings.TARGET_ONE_SVC} and {settings.TARGET_TWO_SVC}"
    )

    async with httpx.AsyncClient() as client:
        logging.info("Call localhost")
        await client.get(
            "http://localhost:8000/",
        )
    async with httpx.AsyncClient() as client:
        logging.info(f"Call http://{settings.TARGET_ONE_SVC}")
        await client.get(
            f"http://{settings.TARGET_ONE_SVC}/",
        )
    async with httpx.AsyncClient() as client:
        logging.info(f"Call http://{settings.TARGET_TWO_SVC}")
        await client.get(
            f"http://{settings.TARGET_TWO_SVC}/",
        )
    logging.info("Chain Finished")
    return {"path": "/chain"}
