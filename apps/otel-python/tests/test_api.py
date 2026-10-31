# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from fastapi import testclient
from opentelemetry.sdk.trace.export import in_memory_span_exporter
from opentelemetry.trace import SpanKind


def test_root(client: testclient.TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == "OpenTelemetry Lab / Python"


def test_version(client: testclient.TestClient) -> None:
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": "v1.0.0"}


def test_routes_are_traced_with_their_route(
    client: testclient.TestClient,
    spans: in_memory_span_exporter.InMemorySpanExporter,
) -> None:
    client.get("/version")
    # One server span per request, without the spans of the ASGI events.
    [span] = spans.get_finished_spans()
    assert span.kind == SpanKind.SERVER
    assert span.name == "GET /version"
    assert span.attributes is not None
    assert span.attributes["http.route"] == "/version"


def test_health_is_not_traced(
    client: testclient.TestClient,
    spans: in_memory_span_exporter.InMemorySpanExporter,
) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "OK"}
    assert spans.get_finished_spans() == ()


def test_metrics(client: testclient.TestClient) -> None:
    client.get("/health")
    response = client.get("/metrics", follow_redirects=False)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "target_info{" in response.text
    assert 'request_count_total{otel_scope_name="otel-python",' in response.text
    assert 'target_service="health"' in response.text
