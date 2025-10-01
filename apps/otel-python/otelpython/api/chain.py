# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging
import traceback

import fastapi
import httpx
from opentelemetry import trace
from opentelemetry.semconv.trace import SpanAttributes

from otelpython import settings
from otelpython.telemetry import metrics, otel, traces

logger = logging.getLogger(__name__)

router = fastapi.APIRouter()

tracer = otel.get_tracer()


@router.get("/chain", tags=["chain"])
async def chain_handler() -> dict[str, str]:
    logger.info(f"[handler] Chain Start using {settings.TARGET_ONE_SVC} and {settings.TARGET_TWO_SVC}")

    metrics.request_counter.add(1, {"target_service": "chain"})

    with tracer.start_as_current_span(
        "process request",
        kind=trace.SpanKind.SERVER,
    ):
        with httpx.Client() as client:
            with tracer.start_as_current_span("call service", kind=trace.SpanKind.CLIENT) as span_svc:
                # async with httpx.AsyncClient() as client:
                logger.info("Call localhost")
                span_svc.set_attribute(SpanAttributes.HTTP_URL, "https://api.ipify.org?format=json")
                span_svc.set_attribute(SpanAttributes.HTTP_METHOD, "get")
                try:
                    response = client.get("https://api.ipify.org?format=json", timeout=10.0)
                    response.raise_for_status()
                    span_svc.set_status(trace.StatusCode.OK)
                    logger.info(response.json())
                except httpx.HTTPStatusError as err:
                    logger.warn(f"Response error: {err}")
                    traces.set_span_error(span_svc, "HTTPException", str(err), "".join(traceback.format_stack()))
                    # span_svc.set_attribute(SpanAttributes.EXCEPTION_TYPE, "HTTPException")
                    # span_svc.set_attribute(SpanAttributes.EXCEPTION_MESSAGE, str(err))
                    # span_svc.set_attribute(
                    #     SpanAttributes.EXCEPTION_STACKTRACE, "".join(traceback.format_stack())
                    # )
                    # span_svc.set_status(trace.Status(trace.StatusCode.ERROR))

            # with tracer.start_as_current_span(
            #     "call_service_one", kind=trace.SpanKind.CLIENT
            # ) as span_svc_one:
            #     logger.info(f"Call http://{settings.TARGET_ONE_SVC}")
            #     span_svc_one.set_attribute(SpanAttributes.HTTP_URL, settings.TARGET_ONE_SVC)
            #     span_svc_one.set_attribute(SpanAttributes.HTTP_METHOD, "get")
            #     try:
            #         response = client.get(f"http://{settings.TARGET_ONE_SVC}/", timeout=10.0)
            #         response.raise_for_status()
            #         span_svc.set_status(trace.StatusCode.OK)
            #         logger.info(response.json())
            #     except httpx.HTTPStatusError as err:
            #         logger.warn(f"Response error: {err}")
            #         traces.set_span_error(span_svc, "HTTPException", str(err), "".join(traceback.format_stack()))

            # with tracer.start_as_current_span(
            #     "call_service_one", kind=trace.SpanKind.CLIENT
            # ) as span_svc_two:
            #     logger.info(f"Call http://{settings.TARGET_TWO_SVC}")
            #     span_svc_two.set_attribute(SpanAttributes.HTTP_URL, settings.TARGET_TWO_SVC)
            #     span_svc_two.set_attribute(SpanAttributes.HTTP_METHOD, "get")
            #     try:
            #         response = client.get(f"http://{settings.TARGET_TWO_SVC}/", timeout=10.0)
            #         response.raise_for_status()
            #         span_svc.set_status(trace.StatusCode.OK)
            #         logger.info(response.json())
            #     except httpx.HTTPStatusError as err:
            #         logger.warn(f"Response error: {err}")
            #         traces.set_span_error(span_svc, "HTTPException", str(err), "".join(traceback.format_stack()))

        logger.info("Chain Finished")
        return {"path": "/chain"}
