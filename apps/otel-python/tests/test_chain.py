# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import pytest
from fastapi import testclient
from opentelemetry.sdk.trace import ReadableSpan
from opentelemetry.sdk.trace.export import in_memory_span_exporter
from opentelemetry.trace import SpanKind, StatusCode

from otelpython import settings
from tests.conftest import Downstream

TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736"
TRACEPARENT = f"00-{TRACE_ID}-00f067aa0ba902b7-01"


def _spans_by_kind(spans: in_memory_span_exporter.InMemorySpanExporter) -> dict[SpanKind, list[ReadableSpan]]:
    by_kind: dict[SpanKind, list[ReadableSpan]] = {}
    for span in spans.get_finished_spans():
        by_kind.setdefault(span.kind, []).append(span)
    return by_kind


def test_chain_propagates_the_trace_to_both_targets(
    client: testclient.TestClient,
    spans: in_memory_span_exporter.InMemorySpanExporter,
    downstream: Downstream,
) -> None:
    response = client.get("/chain", headers={"traceparent": TRACEPARENT})

    assert response.status_code == 200
    assert response.json() == {"path": "/chain"}
    assert len(downstream.traceparents) == 2
    for traceparent in downstream.traceparents:
        assert traceparent is not None
        assert traceparent.startswith(f"00-{TRACE_ID}-")

    by_kind = _spans_by_kind(spans)
    assert set(by_kind) == {SpanKind.SERVER, SpanKind.CLIENT}
    [server] = by_kind[SpanKind.SERVER]
    clients = by_kind[SpanKind.CLIENT]
    assert server.name == "GET /chain"
    assert server.parent is not None
    assert server.parent.span_id == 0x00F067AA0BA902B7
    assert len(clients) == 2
    for client_span in clients:
        assert client_span.parent is not None
        assert client_span.parent.span_id == server.context.span_id
        assert client_span.context.trace_id == int(TRACE_ID, 16)


def test_chain_answers_bad_gateway_when_a_target_fails(
    client: testclient.TestClient,
    spans: in_memory_span_exporter.InMemorySpanExporter,
    downstream: Downstream,
) -> None:
    downstream.status = 500

    response = client.get("/chain")

    assert response.status_code == 502
    assert "500 Internal Server Error" in response.json()["error"]
    [server] = _spans_by_kind(spans)[SpanKind.SERVER]
    assert server.status.status_code == StatusCode.ERROR
    assert server.attributes is not None
    assert server.attributes["error.type"] == "502"
    assert [event.name for event in server.events] == ["exception", "exception"]
    assert server.events[0].attributes is not None
    assert downstream.url in str(server.events[0].attributes["exception.message"])


def test_chain_answers_bad_gateway_when_a_target_is_unreachable(
    client: testclient.TestClient,
    downstream: Downstream,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "TARGET_TWO_SVC", "http://127.0.0.1:1")

    response = client.get("/chain")

    assert response.status_code == 502
    assert "http://127.0.0.1:1: ConnectError" in response.json()["error"]
    assert len(downstream.traceparents) == 1
