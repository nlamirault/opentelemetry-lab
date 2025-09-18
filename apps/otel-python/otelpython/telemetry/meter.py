import logging
import os

from opentelemetry.exporter.otlp.proto.grpc import metric_exporter as metric_exporter_grpc
from opentelemetry.exporter.otlp.proto.grpc import metric_exporter as metric_exporter_http
from opentelemetry.exporter import prometheus
from opentelemetry.sdk import metrics as sdk_metrics
from opentelemetry.sdk import resources
from opentelemetry.sdk.metrics import export
from opentelemetry import metrics

from otelpython import exceptions
from otelpython import settings


logger = logging.getLogger(__name__)

prefix = "otel_python"


def setup(resource: resources.Resource, otlp_endpoint: str, otlp_protocol: str) -> metrics.Meter:
    logging.info("Setup OpenTelemetry Meter")

    otlp_metric_exporter = None
    if otlp_protocol == "http":
        otlp_metric_exporter = metric_exporter_http.OTLPMetricExporter(
            endpoint=f"{otlp_endpoint}/v1/metrics", insecure=True
        )
    elif otlp_protocol == "grpc":
        otlp_metric_exporter = metric_exporter_grpc.OTLPMetricExporter(
            endpoint=otlp_endpoint, insecure=True
        )
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )
    logger.info("OTLP metrics configured")

    metrics_readers = []

    otlp_reader = export.PeriodicExportingMetricReader(otlp_metric_exporter)
    metrics_readers.append(otlp_reader)

    if os.getenv("OTEL_ENABLE_CONSOLE", "false").lower() == "true":
        console_metric_exporter = export.ConsoleMetricExporter()
        console_reader = export.PeriodicExportingMetricReader(console_metric_exporter)
        metrics_readers.append(console_reader)
        logger.info("Console metrics enabled")

    prom_reader = prometheus.PrometheusMetricReader(prefix)
    metrics_readers.append(prom_reader)

    meter_provider = sdk_metrics.MeterProvider(resource=resource, metric_readers=metrics_readers)

    metrics.set_meter_provider(meter_provider)
    logger.info("OpenTelemetry metrics initialized")
    meter = metrics.get_meter(settings.OTEL_SERVICE_NAME)
    return meter
