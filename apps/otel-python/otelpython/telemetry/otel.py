from opentelemetry import metrics
from opentelemetry import trace
from opentelemetry.sdk import resources

from otelpython import settings
from otelpython import version


def create_resource(service_name):
    return resources.Resource.create(
        {
            resources.SERVICE_NAME: service_name,
            resources.SERVICE_VERSION: version.version_info,
        }
    )


def get_tracer():
    """Returns the OpenTelemetry tracer instance."""
    return trace.get_tracer(settings.OTEL_SERVICE_NAME)


def get_meter():
    """Returns the OpenTelemetry meter instance."""
    return metrics.get_meter(settings.OTEL_SERVICE_NAME)
