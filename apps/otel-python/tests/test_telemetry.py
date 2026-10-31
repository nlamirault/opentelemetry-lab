# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import json
import logging
import time

import pytest
from fastapi import testclient
from opentelemetry import trace

from otelpython import application, constants, exceptions, settings
from otelpython.telemetry import logger as otel_logger
from otelpython.telemetry import otel


@pytest.fixture(autouse=True)
def _no_protocol(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_PROTOCOL", raising=False)
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", raising=False)


def test_otlp_protocol_defaults_to_http_protobuf() -> None:
    assert otel.otlp_protocol("traces") == "http/protobuf"


def test_otlp_protocol_of_a_signal_overrides_the_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_PROTOCOL", "http/protobuf")
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_TRACES_PROTOCOL", "grpc")
    assert otel.otlp_protocol("traces") == "grpc"
    assert otel.otlp_protocol("metrics") == "http/protobuf"


def test_otlp_protocol_rejects_unknown_values(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_PROTOCOL", "http")
    with pytest.raises(exceptions.OpenTelemetryProtocolException):
        otel.otlp_protocol("logs")


def _log_record(name: str, msg: str, args: tuple[object, ...] = ()) -> logging.LogRecord:
    return logging.LogRecord(name, logging.INFO, __file__, 1, msg, args, None)


def test_json_formatter_adds_the_trace_context() -> None:
    formatter = otel_logger.JsonFormatter("%(levelname)s %(message)s", static_fields={"service": "otel-python"})
    record = _log_record("test", "hello")

    assert "trace_id" not in json.loads(formatter.format(record))
    with trace.get_tracer(__name__).start_as_current_span("test") as span:
        line = json.loads(formatter.format(record))

    assert line["message"] == "hello"
    assert line["service"] == "otel-python"
    assert line["trace_id"] == trace.format_trace_id(span.get_span_context().trace_id)
    assert line["span_id"] == trace.format_span_id(span.get_span_context().span_id)


@pytest.mark.parametrize(("path", "kept"), [("/health", False), ("/metrics?x=1", False), ("/chain", True)])
def test_uvicorn_filter_drops_the_access_logs_of_untraced_paths(path: str, kept: bool) -> None:
    record = _log_record("uvicorn.access", '%s - "%s %s HTTP/%s" %d', ("127.0.0.1:1", "GET", path, "1.1", 200))
    assert otel_logger.UvicornFilter().filter(record) is kept


def test_uvicorn_filter_removes_the_colored_message() -> None:
    record = _log_record("uvicorn.error", "Started server process [%d]", (1,))
    record.color_message = "Started server process [\x1b[36m%d\x1b[0m]"
    assert otel_logger.UvicornFilter().filter(record)
    assert not hasattr(record, "color_message")


def test_shutdown_hooks_run_in_order() -> None:
    calls: list[str] = []
    app = application.create_app(
        settings.OTEL_SERVICE_NAME,
        shutdown_hooks=[lambda: calls.append("traces"), lambda: calls.append("logs")],
    )
    with testclient.TestClient(app):
        assert calls == []
    assert calls == ["traces", "logs"]


def test_shutdown_hooks_are_bounded(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    monkeypatch.setattr(constants, "SHUTDOWN_TIMEOUT_SECONDS", 0.1)
    app = application.create_app(settings.OTEL_SERVICE_NAME, shutdown_hooks=[lambda: time.sleep(5)])

    start = time.monotonic()
    with testclient.TestClient(app):
        pass

    assert time.monotonic() - start < 2
    assert "Shutdown hooks timed out after 0.1s" in caplog.text
