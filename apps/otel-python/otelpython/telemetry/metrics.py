# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from opentelemetry.sdk import resources

from otelpython import settings, version
from otelpython.constants import METRIC_BUILD_INFO
from otelpython.telemetry import otel

meter = otel.get_meter()

request_counter = meter.create_counter(
    name="request.count",
    description="Number of requests between services",
    unit="1",
)


def record_build_info() -> None:
    """Records the build info metric. Call it once the meter provider is set:
    the measurements of the default no-op provider are dropped."""
    build_info = meter.create_counter(METRIC_BUILD_INFO)
    build_info.add(
        1,
        {
            resources.TELEMETRY_SDK_LANGUAGE: "python",
            resources.SERVICE_VERSION: version.version_info,
            resources.SERVICE_NAME: settings.OTEL_SERVICE_NAME,
        },
    )
