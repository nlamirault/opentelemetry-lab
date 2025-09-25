# SPDX-FileCopyrightText: Copyright (C) Nicolas Lamirault <nicolas.lamirault@gmail.com>
# SPDX-License-Identifier: Apache-2.0

from opentelemetry import metrics
from opentelemetry import trace
from opentelemetry.sdk import resources

from otelpython import settings
from otelpython import version


def create_resource(service_name: str) -> resources.Resource:
    return resources.Resource.create(
        {
            resources.SERVICE_NAME: service_name,
            resources.SERVICE_VERSION: version.version_info,
        }
    )


def get_tracer() -> trace.Tracer:
    """Returns the OpenTelemetry tracer instance."""
    return trace.get_tracer(settings.OTEL_SERVICE_NAME)


def get_meter() -> metrics.Meter:
    """Returns the OpenTelemetry meter instance."""
    return metrics.get_meter(settings.OTEL_SERVICE_NAME)
