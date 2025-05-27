from opentelemetry.sdk import resources

from otelpython import version


def create_resource(service_name):
    return resources.Resource.create(
        {
            resources.SERVICE_NAME: service_name,
            resources.SERVICE_VERSION: version.version_info,
        }
    )
