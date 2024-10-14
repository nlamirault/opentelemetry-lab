# Copyright (c) Nicolas Lamirault <nicolas.lamirault@gmail.com>
#
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import random
import time
from typing import Optional

from fastapi import FastAPI, Response
import httpx
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
# from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
# from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry._logs import set_logger_provider
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, ConsoleLogExporter, SimpleLogRecordProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes
from pythonjsonlogger.jsonlogger import JsonFormatter
import uvicorn

EXPOSE_PORT = int(os.environ.get("EXPOSE_PORT")) #, 8000)

TARGET_ONE_SVC = os.environ.get("TARGET_ONE_SVC", "http://localhost:8000")
TARGET_TWO_SVC = os.environ.get("TARGET_TWO_SVC", "http://localhost:8000")


LoggingInstrumentor().instrument(set_logging_format=True)
LoggingInstrumentor(
    logging_format="%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s resource.service.name=%(otelServiceName)s trace_sampled=%(otelTraceSampled)s] - %(message)s")

app = FastAPI()

def setup_logging():
    resource = Resource.create({ResourceAttributes.SERVICE_NAME: os.environ.get("OTEL_SERVICE_NAME")})
    logger_provider = LoggerProvider(resource=resource)

    otlp_log_exporter = OTLPLogExporter(endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"))
    logger_provider.add_log_record_processor(
        BatchLogRecordProcessor(otlp_log_exporter)
    )
    console_log_exporter = ConsoleLogExporter()
    logger_provider.add_log_record_processor(
        SimpleLogRecordProcessor(console_log_exporter)
    )
    
    set_logger_provider(logger_provider)

    handler = LoggingHandler()
    handler.setFormatter(JsonFormatter("%(asctime)s %(levelname)s [%(name)s] [%(filename)s:%(lineno)d] [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s resource.service.name=%(otelServiceName)s] - %(message)s"))
    logger = logging.getLogger()
    logger.addHandler(handler)
    logger.setLevel(logging.NOTSET)

    FastAPIInstrumentor().instrument_app(app)

def setup_tracing():
    logging.info("setup tracing")

def setup_metrics():
    logging.info("setup metrics")

@app.get("/")
async def read_root():
    logging.info("Hello World")
    return {"Hello": "World"}


@app.get("/items/{item_id}")
async def read_item(item_id: int, q: Optional[str] = None):
    logging.info("items")
    return {"item_id": item_id, "q": q}


@app.get("/io_task")
async def io_task():
    time.sleep(1)
    logging.info("io task")
    return "IO bound task finish!"


@app.get("/cpu_task")
async def cpu_task():
    for i in range(1000):
        _ = i * i * i
    logging.info("cpu task")
    return "CPU bound task finish!"


@app.get("/random_status")
async def random_status(response: Response):
    response.status_code = random.choice([200, 200, 300, 400, 500])
    logging.info("random status")
    return {"path": "/random_status"}


@app.get("/random_sleep")
async def random_sleep(response: Response):
    time.sleep(random.randint(0, 5))
    logging.info("random sleep")
    return {"path": "/random_sleep"}


@app.get("/error_test")
async def error_test(response: Response):
    logging.info("got error!!!!")
    raise ValueError("value error")


@app.get("/chain")
async def chain(response: Response):
    logging.info(f"Chain Start using {TARGET_ONE_SVC} and {TARGET_TWO_SVC}")

    async with httpx.AsyncClient() as client:
        await client.get(
            "http://localhost:8000/",
        )
    async with httpx.AsyncClient() as client:
        await client.get(
            f"http://{TARGET_ONE_SVC}/io_task",
        )
    async with httpx.AsyncClient() as client:
        await client.get(
            f"http://{TARGET_TWO_SVC}/cpu_task",
        )
    logging.info("Chain Finished")
    return {"path": "/chain"}


if __name__ == "__main__":
    setup_logging()
    setup_tracing()
    setup_metrics()
    uvicorn.run(app, host="0.0.0.0", port=EXPOSE_PORT)