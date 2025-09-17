import logging

from otelpython.telemetry import otel


logger = logging.getLogger(__name__)
meter = otel.get_meter()

build_info = meter.create_counter("build_info")
build_info.add(1)

request_counter = meter.create_counter(
    name="inter_service_requests",
    description="Number of requests between services",
    unit="1",
)
