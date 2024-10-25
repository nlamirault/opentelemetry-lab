from opentelemetry.sdk import resources
from opentelemetry.semconv import resource

from otelpython import version


def create_resource(service_name):
    return resources.Resource.create(
        {
            resource.SERVICE_NAME: service_name,
            resources.SERVICE_VERSION: version.RELEASE,
        }
    )
