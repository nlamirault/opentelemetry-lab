from os import environ

PROJECT_NAME = "otel-python"

EXPOSE_PORT = int(environ.get("EXPOSE_PORT", default="8000"))
OTEL_SERVICE_NAME = environ.get("OTEL_SERVICE_NAME", PROJECT_NAME)
OTEL_EXPORTER_OTLP_ENDPOINT = environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:4317")
OTEL_EXPORTER_OTLP_PROTOCOL = environ.get("OTEL_EXPORTER_OTLP_PROTOCOL", default="http")
TARGET_ONE_SVC = environ.get("TARGET_ONE_SVC", f"http://localhost:${EXPOSE_PORT}")
TARGET_TWO_SVC = environ.get("TARGET_TWO_SVC", f"http://localhost:${EXPOSE_PORT}")
