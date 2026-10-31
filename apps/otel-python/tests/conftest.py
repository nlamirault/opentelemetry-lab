# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import threading
from collections.abc import Iterator
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import cast

import pytest
from fastapi import testclient
from opentelemetry import metrics, trace
from opentelemetry.exporter import prometheus
from opentelemetry.instrumentation import httpx as otel_httpx
from opentelemetry.sdk import metrics as sdk_metrics
from opentelemetry.sdk import trace as sdk_trace
from opentelemetry.sdk.trace import export as trace_export
from opentelemetry.sdk.trace.export import in_memory_span_exporter

# Importing settings sets OTEL_SEMCONV_STABILITY_OPT_IN, before the telemetry
# fixture instruments anything.
from otelpython import application, settings

SPAN_EXPORTER = in_memory_span_exporter.InMemorySpanExporter()


@pytest.fixture(scope="session", autouse=True)
def telemetry() -> Iterator[None]:
    """Sets the global providers once: they cannot be replaced."""
    tracer_provider = sdk_trace.TracerProvider()
    tracer_provider.add_span_processor(trace_export.SimpleSpanProcessor(SPAN_EXPORTER))
    trace.set_tracer_provider(tracer_provider)
    metrics.set_meter_provider(sdk_metrics.MeterProvider(metric_readers=[prometheus.PrometheusMetricReader()]))
    otel_httpx.HTTPXClientInstrumentor().instrument()
    yield
    otel_httpx.HTTPXClientInstrumentor().uninstrument()


@pytest.fixture
def spans() -> in_memory_span_exporter.InMemorySpanExporter:
    SPAN_EXPORTER.clear()
    return SPAN_EXPORTER


@pytest.fixture
def client() -> Iterator[testclient.TestClient]:
    # The context manager runs the lifespan, which creates the HTTP client of /chain.
    with testclient.TestClient(application.create_app(settings.OTEL_SERVICE_NAME)) as client:
        yield client


class Downstream(ThreadingHTTPServer):
    """A target service of /chain, which records the traceparent headers it receives."""

    def __init__(self) -> None:
        super().__init__(("127.0.0.1", 0), _DownstreamHandler)
        self.status = 200
        self.traceparents: list[str | None] = []

    @property
    def url(self) -> str:
        host, port = self.server_address[:2]
        return f"http://{host!s}:{port}"


class _DownstreamHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        server = cast("Downstream", self.server)
        server.traceparents.append(self.headers.get("traceparent"))
        self.send_response(server.status)
        self.end_headers()

    def log_message(self, format: str, *args: object) -> None:
        pass


@pytest.fixture
def downstream(monkeypatch: pytest.MonkeyPatch) -> Iterator[Downstream]:
    """Starts a target service, used as both targets of /chain."""
    server = Downstream()
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    monkeypatch.setattr(settings, "TARGET_ONE_SVC", server.url)
    monkeypatch.setattr(settings, "TARGET_TWO_SVC", f"{server.url}/two")
    yield server
    server.shutdown()
    server.server_close()
