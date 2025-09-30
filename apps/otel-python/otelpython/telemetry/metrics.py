# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

import logging

from opentelemetry.sdk import resources

from otelpython.telemetry import otel
from otelpython import settings
from otelpython import version
from otelpython.constants import METRIC_BUILD_INFO


logger = logging.getLogger(__name__)
meter = otel.get_meter()

build_info = meter.create_counter(METRIC_BUILD_INFO)
build_info.add(
    1,
    {
        resources.TELEMETRY_SDK_LANGUAGE: "python",
        resources.SERVICE_VERSION: version.version_info,
        resources.SERVICE_NAME: settings.OTEL_SERVICE_NAME,
    },
)

request_counter = meter.create_counter(
    name="request.count",
    description="Number of requests between services",
    unit="1",
)
