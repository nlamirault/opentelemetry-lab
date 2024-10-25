import logging

from opentelemetry.exporter.otlp.proto.grpc import metric_exporter as metric_exporter_grpc
from opentelemetry.exporter.otlp.proto.grpc import metric_exporter as metric_exporter_http
from opentelemetry.sdk import metrics as sdk_metrics
from opentelemetry.sdk.metrics import export
from opentelemetry import metrics

from otelpython import exceptions
from otelpython.telemetry import otel
from otelpython import version


def setup(service_name, otlp_endpoint, otlp_protocol):
    logging.info("[otel] Setup meter")
    res = otel.create_resource(service_name)

    otlp_metric_exporter = None
    if otlp_protocol == "http":
        otlp_metric_exporter = metric_exporter_http.OTLPMetricExporter(endpoint=otlp_endpoint)
    elif otlp_protocol == "grpc":
        otlp_metric_exporter = metric_exporter_grpc.OTLPMetricExporter(endpoint=otlp_endpoint)
    else:
        raise exceptions.OpenTelemetryProtocolException(
            f"invalid OpenTelemetry protocol: {otlp_protocol}"
        )

    otlp_reader = export.PeriodicExportingMetricReader(otlp_metric_exporter)

    console_metric_exporter = export.ConsoleMetricExporter()
    console_reader = export.PeriodicExportingMetricReader(console_metric_exporter)

    meter_provider = sdk_metrics.MeterProvider(
        resource=res, metric_readers=[otlp_reader, console_reader]
    )
    metrics.set_meter_provider(meter_provider)

    meter = metrics.get_meter_provider().get_meter(service_name, version.RELEASE)

    counter = meter.create_counter("build_info")
    counter.add(1)
