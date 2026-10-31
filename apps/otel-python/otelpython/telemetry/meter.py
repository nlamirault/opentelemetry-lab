# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

from opentelemetry import metrics
from opentelemetry.exporter import prometheus
from opentelemetry.exporter.otlp.proto.grpc import metric_exporter as metric_exporter_grpc
from opentelemetry.exporter.otlp.proto.http import metric_exporter as metric_exporter_http
from opentelemetry.sdk import metrics as sdk_metrics
from opentelemetry.sdk import resources
from opentelemetry.sdk.metrics import export

from otelpython import settings
from otelpython.telemetry import otel

logger = logging.getLogger(__name__)


def setup(resource: resources.Resource) -> sdk_metrics.MeterProvider:
    """Sets the global meter provider. The export interval comes from OTEL_METRIC_EXPORT_INTERVAL."""
    otlp_metric_exporter: export.MetricExporter
    if otel.otlp_protocol("metrics") == "grpc":
        otlp_metric_exporter = metric_exporter_grpc.OTLPMetricExporter()
    else:
        otlp_metric_exporter = metric_exporter_http.OTLPMetricExporter()

    metric_readers: list[export.MetricReader] = [
        export.PeriodicExportingMetricReader(otlp_metric_exporter),
        # Served on /metrics, see api/metrics.py.
        prometheus.PrometheusMetricReader(),
    ]
    if settings.OTEL_DEBUG:
        metric_readers.append(export.PeriodicExportingMetricReader(export.ConsoleMetricExporter()))

    # The application lifespan shuts the provider down, see application.create_app.
    meter_provider = sdk_metrics.MeterProvider(
        resource=resource,
        metric_readers=metric_readers,
        shutdown_on_exit=False,
    )
    metrics.set_meter_provider(meter_provider)
    logger.info("OpenTelemetry metrics initialized")
    return meter_provider
